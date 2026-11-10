import { useEffect, useMemo, useRef, useState } from 'react';
import { geoOrthographic } from 'd3-geo';
import { Meter } from "@cloudflare/kumo/components/meter";
import { Text } from "@cloudflare/kumo/components/text";
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
/* Rotation speed in degrees per second (user-supplied loop,
   2026-11-10). Delta-time based, so the speed is the same on
   any frame rate: 18 deg/sec. The old fixed 0.20 deg/frame was
   ~12 deg/sec at 60fps but slowed on low frame rates. */
const ROTATION_SPEED = 18;
/* Cloudflare's exact globe dot colours, read from their GlobeView
   bundle (cf-GlobeView.7e024a4a.js, 2026-11-10). The land texture
   is rgb(100, 140, 190) at alpha 0.45. Each traffic country's
   colour is interpolated from #82b6ff (lowest) to #0051C3
   (highest) by its share of the max traffic value, at alpha
   0.7 + 0.3 * share. Countries with no traffic get #82b6ff at
   alpha 0.25 (the land base underneath still shows). */
const CF_LAND_RGB = [100, 140, 190];
const CF_SCALE_LO = [130, 182, 255]; /* #82b6ff */
const CF_SCALE_HI = [0, 81, 195]; /* #0051C3 */
function lerpColor(lo, hi, t) {
  const r = Math.round(lo[0] + (hi[0] - lo[0]) * t);
  const g = Math.round(lo[1] + (hi[1] - lo[1]) * t);
  const b = Math.round(lo[2] + (hi[2] - lo[2]) * t);
  return `rgb(${r}, ${g}, ${b})`;
}
/* Cloudflare's globe only moves horizontally (verified by the user,
   2026-11-10): the rotation is around the vertical axis only, the
   latitude never changes. FIXED_PHI is the initial tilt that centres
   India (lat 20.6); it stays fixed for drag, auto-rotation and the
   list-hover swing. */
const FIXED_PHI = -20.6;
/* 1-degree dot grid (2026-11-09, user order: India border must match
   the reference exactly). Dots are ~1.55px apart on the 280px globe,
   so the radii are smaller than the old 2-degree grid (DOT_R was 1.3,
   TOP_R was 2.3) to keep the dot-grid look instead of a solid mass. */
const DOT_R = 0.7;
const TOP_R = 1.2;
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

  /* Precomputed per-dot trig values for the far-side cull. A dot is
     on the visible hemisphere when cos(c) > 0, where c is its angular
     distance from the view centre. d3's projection() does NOT clip
     far-side points when called directly (it returns a position
     inside the disc), so without this check the far-side countries
     draw on top of the near side and the globe looks transparent. */
  const dotData = useMemo(() => dotGrid.map(([lat, lon, code]) => {
    const latRad = (lat * Math.PI) / 180;
    return {
      lat, lon, code,
      sinLat: Math.sin(latRad),
      cosLat: Math.cos(latRad),
      lonRad: (lon * Math.PI) / 180,
    };
  }), []);

  const canvasRef = useRef(null);
  const tipRef = useRef(null);
  const projectionRef = useRef(null);
  /* Rotation as [lambda, phi] degrees. Starts centred on India
     (lon 78.9, lat 20.6), user order 2026-11-09: the globe should
     always start rotating right from India. */
  const rotRef = useRef([-78.9, -20.6]);
  const pausedRef = useRef(false);
  const draggingRef = useRef(false);
  const dragStartRef = useRef(null);
  const mouseRef = useRef(null);
  /* Country code under the mouse on the globe itself (direct hover),
     or null. Cloudflare shows a name-only tooltip there and freezes
     rotation while the pointer stays on the map. */
  const mouseCountryRef = useRef(null);
  /* List-hover swing target: [lambda, phi] the globe rotates to
     face the hovered country, or null. Cloudflare swings the globe
     to face the list-hovered country and holds it there. */
  const swingTargetRef = useRef(null);
  const countriesRef = useRef(countries);
  const trafficCodesRef = useRef(trafficCodes);
  /* Per-country traffic values and the max, for Cloudflare's exact
     choropleth scale (see the draw loop): each traffic country's
     dot colour is interpolated by its share of the max. */
  const trafficValuesRef = useRef(new Map(Object.entries(countries)));
  const maxCountRef = useRef(maxCount);
  /* Country hovered in the list (Cloudflare behavior, user order
     2026-11-10): hovering a list row makes the globe swing to face
     that country and shows a "Name · count" tooltip on the globe.
     Kept in a ref so the draw loop reads it without re-creating
     the animation effect. */
  const [hoveredCode, setHoveredCode] = useState(null);
  const hoveredCodeRef = useRef(null);
  useEffect(() => {
    hoveredCodeRef.current = hoveredCode;
    /* Swing the globe to face the list-hovered country, hold it
       there while hovered; resume auto-rotation when the hover
       ends. Target rotation centres the country horizontally only:
       [-lon, FIXED_PHI]. The latitude never changes, Cloudflare's
       globe only moves horizontally. */
    if (hoveredCode && hoveredCode !== 'Unknown' && COUNTRY_COORDS[hoveredCode]) {
      const [, clon] = COUNTRY_COORDS[hoveredCode];
      swingTargetRef.current = [-clon, FIXED_PHI];
    } else {
      swingTargetRef.current = null;
    }
  }, [hoveredCode]);

  useEffect(() => { countriesRef.current = countries; }, [JSON.stringify(countries)]);
  useEffect(() => { trafficCodesRef.current = trafficCodes; }, [trafficCodes]);
  useEffect(() => {
    trafficValuesRef.current = new Map(Object.entries(countries));
    maxCountRef.current = maxCount;
  }, [JSON.stringify(countries), maxCount]);

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
    projectionRef.current = projection;

    const R = SIZE / 2 - 6;
    let raf;
    /* Previous frame timestamp for the delta-time rotation loop
       (user-supplied pattern). 0 on the first frame so the first
       delta is 0 and the globe does not jump. */
    let previousTime = 0;

    const updateTip = () => {
      const tip = tipRef.current;
      if (!tip) return;
      const live = countriesRef.current;
      /* List hover first (Cloudflare behavior, verified live
         2026-11-10): the tooltip shows "Name · count" on the globe
         at the hovered country's centre coordinates, and the globe
         has swung to face it. */
      const hovered = hoveredCodeRef.current;
      if (hovered && hovered !== 'Unknown' && live[hovered] !== undefined && COUNTRY_COORDS[hovered]) {
        const [clat, clon] = COUNTRY_COORDS[hovered];
        const p = projection([clon, clat]);
        if (p) {
          const name = COUNTRY_NAMES[hovered] || hovered;
          tip.textContent = `${name} · ${live[hovered]}`;
          tip.style.left = `${p[0] + 12}px`;
          tip.style.top = `${p[1] - 10}px`;
          tip.style.opacity = '1';
          return;
        }
      }
      /* Direct globe hover (Cloudflare behavior, verified live
         2026-11-10): a small dark tooltip next to the mouse pointer
         showing ONLY the country name, no count. The country does
         not highlight or change colour. */
      const mouseCountry = mouseCountryRef.current;
      const mouse = mouseRef.current;
      if (mouseCountry && mouse) {
        const name = COUNTRY_NAMES[mouseCountry] || mouseCountry;
        tip.textContent = name;
        tip.style.left = `${mouse.x + 12}px`;
        tip.style.top = `${mouse.y - 10}px`;
        tip.style.opacity = '1';
        return;
      }
      tip.style.opacity = '0';
    };

    const draw = (timestamp) => {
      /* Delta-time rotation (user-supplied loop): the time since
         the last frame, in seconds, so the globe turns at a steady
         ROTATION_SPEED deg/sec on any frame rate. First frame has
         no previous time, so delta is 0. */
      const deltaTime = previousTime ? (timestamp - previousTime) / 1000 : 0;
      previousTime = timestamp;
      let [lambda, phi] = rotRef.current;
      /* List-hover swing: ease the globe toward the target rotation
         (shortest path on longitude, wraparound handled) and hold
         it there while hovered. Otherwise auto-rotate, unless the
         pointer is on the globe, dragging, or a list row is
         hovered. */
      const target = swingTargetRef.current;
      if (target) {
        const dLambda = ((target[0] - lambda + 540) % 360) - 180;
        const dPhi = target[1] - phi;
        lambda += dLambda * 0.12;
        phi += dPhi * 0.12;
        if (Math.abs(dLambda) < 0.1 && Math.abs(dPhi) < 0.1) {
          lambda = target[0];
          phi = target[1];
        }
        rotRef.current = [lambda, phi];
      } else if (!pausedRef.current && !draggingRef.current && !hoveredCodeRef.current) {
        rotRef.current = [lambda + ROTATION_SPEED * deltaTime, phi];
      }
      projection.rotate(rotRef.current);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, SIZE, SIZE);

      /* Ocean disc, solid fill so the sphere reads as a filled globe,
         not hollow. Dark uses the user's Black #020204. */
      ctx.beginPath();
      ctx.arc(SIZE / 2, SIZE / 2, R, 0, Math.PI * 2);
      ctx.fillStyle = dark ? '#020204' : '#e5e7eb';
      ctx.fill();

      const traffic = trafficCodesRef.current;
      /* View centre in radians, for the far-side cull. The centre
         of the visible disc is at lon -lambda, lat -phi. */
      const [curLambda, curPhi] = rotRef.current;
      const centerLatRad = (-curPhi * Math.PI) / 180;
      const centerLonRad = (-curLambda * Math.PI) / 180;
      const sinCenterLat = Math.sin(centerLatRad);
      const cosCenterLat = Math.cos(centerLatRad);
      for (const d of dotData) {
        /* Far-side cull: skip dots on the hemisphere facing away,
           so the globe is fully opaque and the other side never
           shows through. */
        const cosC = sinCenterLat * d.sinLat + cosCenterLat * d.cosLat * Math.cos(d.lonRad - centerLonRad);
        if (cosC <= 0) continue;
        const p = projection([d.lon, d.lat]);
        if (!p) continue;
        const [x, y] = p;
        const dx = x - SIZE / 2;
        const dy = y - SIZE / 2;
        const depth = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / R);
        const code = d.code;
        if (code && traffic.has(code)) {
          /* Traffic country: Cloudflare's exact choropleth scale.
             t is this country's share of the max traffic value
             (top country t=1). Colour interpolates #82b6ff (low)
             to #0051C3 (high); alpha is 0.7 + 0.3 * t. The depth
             factor keeps the sphere shading (limb fade) while the
             centre matches CF's exact values. Every country with
             traffic is highlighted, not just the top one.
             Cloudflare does not enlarge the hovered country, so
             all traffic countries draw at the same size; the
             list-hovered country is shown by the globe facing it
             and the tooltip, not by bigger dots. */
          const value = trafficValuesRef.current.get(code) || 0;
          const max = maxCountRef.current || 1;
          const t = max > 0 ? value / max : 0;
          ctx.globalAlpha = (0.7 + 0.3 * t) * (0.35 + 0.65 * depth);
          ctx.fillStyle = lerpColor(CF_SCALE_LO, CF_SCALE_HI, t);
          ctx.beginPath();
          ctx.arc(x, y, TOP_R, 0, Math.PI * 2);
          ctx.fill();
        } else {
          /* Non-traffic land: Cloudflare's exact land texture
             colour rgb(100, 140, 190) at alpha 0.45. The depth
             factor keeps the sphere shading (limb fade) while
             the centre matches CF's exact value. */
          ctx.globalAlpha = 0.45 * (0.35 + 0.65 * depth);
          ctx.fillStyle = `rgb(${CF_LAND_RGB[0]}, ${CF_LAND_RGB[1]}, ${CF_LAND_RGB[2]})`;
          ctx.beginPath();
          ctx.arc(x, y, DOT_R, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      /* Atmospheric halo like Cloudflare's (user order 2026-11-10):
         a soft blurry glow around the globe, like a real earth's
         atmosphere. A radial-gradient ring fading outward from the
         globe edge over ~45px, plus the thin ring stroke with a
         wide blur. The gradient ring is filled with evenodd so it
         never tints the globe itself, only the space outside it. */
      ctx.save();
      const glow = ctx.createRadialGradient(SIZE / 2, SIZE / 2, R, SIZE / 2, SIZE / 2, R + 45);
      glow.addColorStop(0, 'rgba(91,198,253,0.28)');
      glow.addColorStop(0.4, 'rgba(91,198,253,0.12)');
      glow.addColorStop(1, 'rgba(91,198,253,0)');
      ctx.beginPath();
      ctx.arc(SIZE / 2, SIZE / 2, R + 45, 0, Math.PI * 2);
      ctx.arc(SIZE / 2, SIZE / 2, R, 0, Math.PI * 2, true);
      ctx.fillStyle = glow;
      ctx.fill('evenodd');
      ctx.beginPath();
      ctx.arc(SIZE / 2, SIZE / 2, R, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(91,198,253,0.28)';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = 'rgba(176,242,255,0.35)';
      ctx.shadowBlur = 50;
      ctx.stroke();
      ctx.restore();

      updateTip();

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [dark]);

  /* Pointer handlers: drag rotates, hover pauses. Direct globe hover
     (Cloudflare behavior, verified live 2026-11-10): the pointer
     freezing the rotation while it stays on the map, and a name-only
     tooltip over the country under the pointer. */
  const findCountryAt = (mx, my) => {
    const proj = projectionRef.current;
    if (!proj) return null;
    /* Far-side cull, same as the draw loop: only countries on the
       visible hemisphere can be hovered. */
    const [curLambda, curPhi] = rotRef.current;
    const centerLatRad = (-curPhi * Math.PI) / 180;
    const centerLonRad = (-curLambda * Math.PI) / 180;
    const sinCenterLat = Math.sin(centerLatRad);
    const cosCenterLat = Math.cos(centerLatRad);
    let best = null;
    let bestD = HOVER_R;
    for (const d of dotData) {
      if (!d.code) continue;
      const cosC = sinCenterLat * d.sinLat + cosCenterLat * d.cosLat * Math.cos(d.lonRad - centerLonRad);
      if (cosC <= 0) continue;
      const p = proj([d.lon, d.lat]);
      if (!p) continue;
      const dx = p[0] - mx;
      const dy = p[1] - my;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < bestD) {
        bestD = dist;
        best = d.code;
      }
    }
    return best;
  };
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
    mouseCountryRef.current = findCountryAt(mouseRef.current.x, mouseRef.current.y);
    if (draggingRef.current && dragStartRef.current) {
      /* Horizontal drag only (Cloudflare behavior): the globe spins
         left-right, the latitude never changes. */
      const s = dragStartRef.current;
      const lambda = s.lambda + (e.clientX - s.x) * 0.25;
      rotRef.current = [lambda, FIXED_PHI];
    }
  };
  const onPointerUp = () => {
    draggingRef.current = false;
    dragStartRef.current = null;
  };

  return (
    <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] h-full flex flex-col">
      <div className="px-5 py-4">
        <Text variant="secondary" size="xs" bold>
          Requests by country
        </Text>
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
            onPointerEnter={() => { pausedRef.current = true; }}
            onPointerLeave={() => { mouseRef.current = null; mouseCountryRef.current = null; pausedRef.current = false; onPointerUp(); }}
            aria-label="Requests by country globe"
          />
          {/* Hover tooltip, updated imperatively in the draw loop. */}
          <div
            ref={tipRef}
            className={`absolute pointer-events-none whitespace-nowrap rounded-[8px] border border-[var(--border)] px-3 py-2 text-[12px] leading-4 opacity-0 transition-opacity duration-100 z-10 shadow-[0_4px_12px_rgba(0,0,0,0.35)] ${dark ? 'bg-[#161b22] text-white' : 'bg-white text-[#1f2328]'}`}
          />
        </div>
        {/* Thin vertical divider between globe and list, md+ only. */}
        <div className="hidden md:block w-px self-stretch bg-[var(--border)] shrink-0" />
        {/* Country list: plain scrollable column, NO bordered box.
            data-lenis-prevent keeps this inner scroll area native. */}
        <div data-lenis-prevent className="thin-scroll flex-1 min-w-0 w-full overflow-y-auto overflow-x-hidden max-h-[340px] space-y-0.5">
          {sorted.length === 0 && (
            <p className="text-[12px] leading-4 text-[var(--muted)] py-6 text-center">No data available for this time range</p>
          )}
          {sorted.map(([code, count]) => {
            const name = COUNTRY_NAMES[code] || code;
            const isUnknown = code === 'Unknown';
            const barPct = (count / maxCount) * 100;
            return (
              <div
                key={code}
                className="flex items-center gap-3 rounded-[6px] px-2 py-1.5 hover:bg-[var(--surface-2)] transition-colors"
                onMouseEnter={() => setHoveredCode(code)}
                onMouseLeave={() => setHoveredCode(null)}
              >
                <span className="text-[12px] leading-4 text-[var(--text-2)] w-[100px] shrink-0 truncate">{name}</span>
                {/* Kumo Meter as the bar. The row carries its own
                    label and count, so the Meter's label/value
                    header is hidden by .meter-bar-only in index.css.
                    Blue for countries, grey for Unknown. */}
                <Meter
                  label={name}
                  showValue={false}
                  value={barPct}
                  className="meter-bar-only flex-1 min-w-0 w-auto"
                  trackClassName="bg-[var(--cf-bg-track)]"
                  indicatorClassName={isUnknown
                    ? 'from-[#6b7280] via-[#6b7280] to-[#6b7280]'
                    : 'from-[var(--accent)] via-[var(--accent)] to-[var(--accent)]'}
                />
                <span className="text-[12px] leading-4 font-medium text-[var(--text)] tabular-nums w-[40px] text-right shrink-0">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
