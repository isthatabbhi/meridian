import { useEffect, useMemo, useRef } from 'react';
import { geoOrthographic } from 'd3-geo';
import { Meter } from "@cloudflare/kumo/components/meter";
import dotGrid from '../lib/dot-grid-countries.json';

/* ─────────────────────────────────────────────────────────
   Country coordinates & names (kept for the list and for
   mapping live country codes to display names)
   ───────────────────────────────────────────────────────── */
const COUNTRY_COORDS = {
  US: [39.8, -98.5], IN: [20.6, 78.9], GB: [55.4, -3.4], DE: [51.2, 10.4],
  FR: [46.2, 2.2], JP: [36.2, 138.3], BR: [-14.2, -51.9], AU: [-25.3, 133.8],
  CA: [56.1, -106.3], CN: [35.9, 104.2], RU: [61.5, 105.3], ZA: [-30.6, 22.9],
  KR: [35.9, 127.8], MX: [23.6, -102.6], IT: [41.9, 12.5], ES: [40.5, -3.7],
  NL: [52.1, 5.3], SE: [60.1, 18.6], NO: [60.5, 8.5], FI: [61.9, 25.7],
  PL: [51.9, 19.1], TR: [38.9, 35.2], SA: [23.9, 45.1], AE: [23.4, 53.8],
  SG: [1.4, 103.8], ID: [-0.8, 113.9], PH: [12.9, 121.8], TH: [15.9, 100.9],
  VN: [14.1, 108.3], MY: [4.2, 101.9], PK: [30.4, 69.3], BD: [23.7, 90.4],
  NG: [9.1, 8.7], EG: [26.8, 30.8], KE: [0.0, 37.9], AR: [-38.4, -63.6],
  CL: [-35.7, -71.5], CO: [4.6, -74.3], PE: [-9.2, -75.0], NZ: [-40.9, 174.9],
  IE: [53.1, -8.2], IL: [31.0, 34.9], HK: [22.4, 114.1], TW: [23.7, 121.0],
  RO: [45.9, 24.9], CZ: [49.8, 15.5], AT: [47.5, 14.6], CH: [46.8, 8.2],
};

const COUNTRY_NAMES = {
  US: 'United States', IN: 'India', GB: 'United Kingdom', DE: 'Germany',
  FR: 'France', JP: 'Japan', BR: 'Brazil', AU: 'Australia', CA: 'Canada',
  CN: 'China', RU: 'Russia', ZA: 'South Africa', KR: 'South Korea',
  MX: 'Mexico', IT: 'Italy', ES: 'Spain', NL: 'Netherlands', SE: 'Sweden',
  NO: 'Norway', FI: 'Finland', PL: 'Poland', TR: 'Turkey', SA: 'Saudi Arabia',
  AE: 'UAE', SG: 'Singapore', ID: 'Indonesia', PH: 'Philippines',
  TH: 'Thailand', VN: 'Vietnam', MY: 'Malaysia', PK: 'Pakistan',
  BD: 'Bangladesh', NG: 'Nigeria', EG: 'Egypt', KE: 'Kenya', AR: 'Argentina',
  CL: 'Chile', CO: 'Colombia', PE: 'Peru', NZ: 'New Zealand', IE: 'Ireland',
  IL: 'Israel', HK: 'Hong Kong', TW: 'Taiwan', Unknown: 'Unknown',
  RO: 'Romania', CZ: 'Czech Republic', AT: 'Austria', CH: 'Switzerland',
};

const SIZE = 280;
const ROT_SPEED_DEG = 0.23; // 0.004 rad/frame, the old globe's speed
const DOT_R = 1.3;
const TOP_R = 2.3;
const HOVER_R = 14;

/* ─────────────────────────────────────────────────────────
   Component: dot-grid globe like Cloudflare's dashboard:
   orthographic canvas, land dots, every live traffic country
   filled solid blue, country list beside it with a vertical
   divider. No separate marker dots, no bordered box around
   the list, no "Unknown locations" note. Title is Cloudflare's
   raw key.
   ───────────────────────────────────────────────────────── */
export default function CountryGlobe({ data, dark }) {
  const countries = data?.requestsByCountry || {};

  const sorted = useMemo(() =>
    Object.entries(countries)
      .sort((a, b) => {
        if (a[0] === 'Unknown') return 1;
        if (b[0] === 'Unknown') return -1;
        return b[1] - a[1];
      }),
    [JSON.stringify(countries)]
  );
  const maxCount = sorted.length > 0 ? Math.max(...sorted.map(([, v]) => v)) : 1;

  /* Every country with live traffic (excluding Unknown, which has
     no location). Recomputed when the live data changes; their dots
     are drawn solid blue on the globe, so all traffic countries are
     highlighted, not just the top one. */
  const trafficCodes = useMemo(() => {
    return new Set(
      Object.entries(countries)
        .filter(([code, count]) => code !== 'Unknown' && count > 0)
        .map(([code]) => code)
    );
  }, [JSON.stringify(countries)]);

  const canvasRef = useRef(null);
  const tipRef = useRef(null);
  /* Rotation as [lambda, phi] degrees. Starts centred on the US
     (lon -98.5), the current top country, so the highlight is
     visible on load. */
  const rotRef = useRef([98.5, -25]);
  const pausedRef = useRef(false);
  const draggingRef = useRef(false);
  const dragStartRef = useRef(null);
  const mouseRef = useRef(null);
  const countriesRef = useRef(countries);
  const trafficCodesRef = useRef(trafficCodes);

  useEffect(() => { countriesRef.current = countries; }, [JSON.stringify(countries)]);
  useEffect(() => { trafficCodesRef.current = trafficCodes; }, [trafficCodes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;

    const projection = geoOrthographic()
      .scale(SIZE / 2 - 6)
      .translate([SIZE / 2, SIZE / 2])
      .clipAngle(90);

    const R = SIZE / 2 - 6;
    let raf;

    const updateTip = () => {
      const tip = tipRef.current;
      if (!tip) return;
      const mouse = mouseRef.current;
      if (!mouse) { tip.style.opacity = '0'; return; }
      /* Nearest projected land dot to the cursor. */
      let best = null;
      let bestD = HOVER_R * HOVER_R;
      for (const [lat, lon, code] of dotGrid) {
        const p = projection([lon, lat]);
        if (!p) continue;
        const dx = p[0] - mouse.x;
        const dy = p[1] - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestD) { bestD = d2; best = code; }
      }
      const live = countriesRef.current;
      if (best && live[best] !== undefined) {
        const name = COUNTRY_NAMES[best] || best;
        tip.textContent = `${name} · ${live[best]}`;
        tip.style.left = `${mouse.x + 12}px`;
        tip.style.top = `${mouse.y - 10}px`;
        tip.style.opacity = '1';
      } else {
        tip.style.opacity = '0';
      }
    };

    const draw = () => {
      const [lambda, phi] = rotRef.current;
      projection.rotate([lambda, phi]);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, SIZE, SIZE);

      /* Ocean disc, solid fill so the sphere reads as a filled globe,
         not hollow. Dark uses the exact #030304 he asked for. */
      ctx.beginPath();
      ctx.arc(SIZE / 2, SIZE / 2, R, 0, Math.PI * 2);
      ctx.fillStyle = dark ? '#030304' : '#e6ebf0';
      ctx.fill();

      const traffic = trafficCodesRef.current;
      for (const [lat, lon, code] of dotGrid) {
        const p = projection([lon, lat]);
        if (!p) continue;
        const [x, y] = p;
        const dx = x - SIZE / 2;
        const dy = y - SIZE / 2;
        const depth = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / R);
        if (code && traffic.has(code)) {
          /* Traffic country: solid blue, larger dots so the region
             reads as a solid mass, like Cloudflare's dashboard.
             Every country with traffic is highlighted, not just
             the top one. */
          ctx.globalAlpha = 0.55 + 0.45 * depth;
          ctx.fillStyle = '#2f7cf6';
          ctx.beginPath();
          ctx.arc(x, y, TOP_R, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const a = 0.35 + 0.5 * depth;
          ctx.globalAlpha = 1;
          ctx.fillStyle = dark
            ? `rgba(47,124,246,${a})`
            : `rgba(9,105,218,${a})`;
          ctx.beginPath();
          ctx.arc(x, y, DOT_R, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      updateTip();

      if (!pausedRef.current && !draggingRef.current) {
        rotRef.current = [lambda + ROT_SPEED_DEG, phi];
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [dark]);

  /* Pointer handlers: drag rotates, hover pauses. */
  const onPointerDown = (e) => {
    draggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      lambda: rotRef.current[0],
      phi: rotRef.current[1],
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    if (draggingRef.current && dragStartRef.current) {
      const s = dragStartRef.current;
      const lambda = s.lambda + (e.clientX - s.x) * 0.25;
      const phi = Math.max(-80, Math.min(80, s.phi - (e.clientY - s.y) * 0.25));
      rotRef.current = [lambda, phi];
    }
  };
  const onPointerUp = () => {
    draggingRef.current = false;
    dragStartRef.current = null;
  };

  return (
    <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] h-full flex flex-col">
      <div className="px-5 py-4">
        <p className="text-[12px] text-[var(--muted)]">
          Requests by country
        </p>
      </div>
      <div className="px-5 pb-5 flex flex-col md:flex-row gap-5 flex-1 md:items-stretch">
        {/* Globe column: dot-grid canvas, 280px. */}
        <div className="relative flex flex-col items-center justify-center shrink-0">
          <canvas
            ref={canvasRef}
            className="w-[280px] h-[280px] cursor-grab active:cursor-grabbing touch-none"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={() => { mouseRef.current = null; pausedRef.current = false; onPointerUp(); }}
            onPointerEnter={() => { pausedRef.current = true; }}
            aria-label="Requests by country globe"
          />
          {/* Hover tooltip, updated imperatively in the draw loop. */}
          <div
            ref={tipRef}
            className="absolute pointer-events-none whitespace-nowrap rounded-[6px] border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[12px] text-[var(--text)] opacity-0 transition-opacity duration-100 z-10"
          />
        </div>
        {/* Thin vertical divider between globe and list, md+ only. */}
        <div className="hidden md:block w-px self-stretch bg-[var(--border)] shrink-0" />
        {/* Country list: plain scrollable column, NO bordered box.
            data-lenis-prevent keeps this inner scroll area native. */}
        <div data-lenis-prevent className="thin-scroll flex-1 min-w-0 w-full overflow-y-auto overflow-x-hidden max-h-[340px] space-y-0.5">
          {sorted.map(([code, count]) => {
            const name = COUNTRY_NAMES[code] || code;
            const isUnknown = code === 'Unknown';
            const barPct = (count / maxCount) * 100;
            return (
              <div key={code} className="flex items-center gap-3 rounded-[6px] px-2 py-1 hover:bg-[var(--surface-2)] transition-colors">
                <span className="text-[12px] text-[var(--text-2)] w-[100px] shrink-0 truncate">{name}</span>
                {/* Kumo Meter as the bar. The row carries its own
                    label and count, so the Meter's label/value
                    header is hidden by .meter-bar-only in index.css.
                    Blue for countries, grey for Unknown. */}
                <Meter
                  label={name}
                  showValue={false}
                  value={barPct}
                  className="meter-bar-only flex-1 min-w-0 w-auto"
                  trackClassName="bg-[var(--surface-2)]"
                  indicatorClassName={isUnknown
                    ? 'from-[#6b7280] via-[#6b7280] to-[#6b7280]'
                    : 'from-[#2f7cf6] via-[#2f7cf6] to-[#2f7cf6]'}
                />
                <span className="text-[12px] text-[var(--text)] tabular-nums w-[40px] text-right shrink-0">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
