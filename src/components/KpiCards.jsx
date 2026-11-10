import { useMemo } from 'react';
import { LayerCard } from "@cloudflare/kumo/components/layer-card";
import { Chart } from "@cloudflare/kumo/components/chart";
import echarts from '../lib/echarts';
import { istDayKey, istKeyToMs } from '../lib/dates';

/* The four KPI cards, in the same Kumo categorical palette order as
   the Requests over time chart, so the chart and the cards share one
   palette. `seriesKey` is the bucket field; `prevKey` is the matching
   field in the backend's prevPeriod object. */
const CARDS = [
  { label: 'Total events', seriesKey: 'events', prevKey: 'events', color: '#4290F0' },
  { label: 'Unique visitors', seriesKey: 'visitors', prevKey: 'visitors', color: '#F5B647' },
  { label: 'Project clicks', seriesKey: 'projectClicks', prevKey: 'projectClicks', color: '#E8649D' },
  { label: 'Resume downloads', seriesKey: 'resumeDownloads', prevKey: 'resumeDownloads', color: '#8D58EE' },
];

/* Delta colour (user order 2026-11-10): greyed #A1A1A1 for all cards,
   up and down alike. The arrow direction still shows up/down. */
const DELTA_UP = '#A1A1A1';
const DELTA_DOWN = '#A1A1A1';

/* Compact value, Cloudflare style: 1150 -> "1.15k", 139 -> "139". */
function formatCompact(v) {
  if (v >= 1000) {
    const k = v / 1000;
    const s = k >= 100 ? k.toFixed(0) : k >= 10 ? k.toFixed(1) : k.toFixed(2);
    return s.replace(/\.?0+$/, '') + 'k';
  }
  return String(v);
}

/* Sparkline on Kumo's custom Chart (ECharts). The TimeseriesChart
   cannot be a 50px sparkline: it has no axis-hide props and its grid
   margins are fixed at 24px top and bottom, which leaves no plot
   area at this height. The custom Chart with axes and tooltip hidden
   draws the same spiky gradient line and is still a Kumo chart. One
   series, the card's metric colour, gradient fading to transparent.
   No axes, no legend, no tooltip. Animates 500ms ease-in-out on
   mount, like Cloudflare's sparkline; data updates are instant
   (animationDurationUpdate 0) so the 10s live poll does not replay
   the draw. An empty series draws a flat empty strip. */
function Sparkline({ rows, seriesKey, color }) {
  const options = useMemo(() => {
    const points = rows.map((r) => [istKeyToMs(r.time), r[seriesKey] || 0]);
    return {
      animationDuration: 500,
      animationEasing: 'cubicInOut',
      animationDurationUpdate: 0,
      backgroundColor: 'transparent',
      grid: { left: 0, right: 0, top: 2, bottom: 0 },
      xAxis: { type: 'time', show: false },
      yAxis: { show: false, min: 0 },
      tooltip: { show: false },
      series: [{
        type: 'line',
        data: points,
        showSymbol: false,
        lineStyle: { width: 1.5, color },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: color + '73' },
            { offset: 1, color: color + '0D' },
          ]),
        },
        emphasis: { disabled: true },
      }],
    };
  }, [rows, seriesKey, color]);

  if (!rows || rows.length < 2) return <div className="h-[52px]" />;
  return (
    <Chart
      echarts={echarts}
      options={options}
      height={52}
      className="w-full block"
      aria-label="Sparkline"
    />
  );
}

export default function KpiCards({ data, timeRange }) {
  /* Range start, same formula as App.jsx's rangeSince. */
  const since = useMemo(() => {
    const now = Date.now();
    if (timeRange === '24h') return now - 24 * 60 * 60 * 1000;
    if (timeRange === '7d') return now - 7 * 24 * 60 * 60 * 1000;
    if (timeRange === '30d') return now - 30 * 24 * 60 * 60 * 1000;
    return 0;
  }, [timeRange]);

  /* Bucket rows for the selected range, mirroring RequestsChart:
     q15m (96 spiky 15-minute buckets) for 24h, daily buckets for
     longer ranges, filtered to the range and gap-filled with zeros
     so the axis spans the whole range. */
  const rows = useMemo(() => {
    const raw = timeRange === '24h' ? data?.q15m : data?.daily;
    if (!raw || raw.length === 0) return [];
    const mapped = raw.map((b) => ({
      time: b.t || b.d,
      events: b.events || 0,
      visitors: b.visitors || 0,
      projectClicks: b.projectClicks || 0,
      resumeDownloads: b.resumeDownloads || 0,
    }));
    let buckets = mapped;
    if (timeRange !== '24h' && since > 0) {
      const startDay = istDayKey(new Date(since));
      buckets = mapped.filter((b) => b.time >= startDay);
    }
    if (buckets.length === 0) return [];
    if (timeRange !== '24h') {
      const have = new Map(buckets.map((r) => [r.time, r]));
      const startDay = since > 0 ? istDayKey(new Date(since)) : buckets[0].time;
      const endDay = istDayKey(new Date());
      const filled = [];
      const cur = new Date(startDay + 'T00:00:00Z');
      const end = new Date(endDay + 'T00:00:00Z');
      while (cur <= end) {
        const key = istDayKey(cur);
        if (have.has(key)) {
          filled.push(have.get(key));
        } else {
          filled.push({ time: key, events: 0, visitors: 0, projectClicks: 0, resumeDownloads: 0 });
        }
        cur.setUTCDate(cur.getUTCDate() + 1);
      }
      buckets = filled;
    }
    buckets.sort((a, b) => a.time.localeCompare(b.time));
    return buckets;
  }, [data, since, timeRange]);

  /* Current-period totals are the sums of the plotted buckets, so
     the card value matches the chart legend for the same range.
     Exception: 24h visitors use the endpoint's deduplicated
     visitors24h, not the per-bucket sum (a visitor active in two
     buckets would count twice). */
  const totals = useMemo(() => {
    const t = { events: 0, visitors: 0, projectClicks: 0, resumeDownloads: 0 };
    rows.forEach((r) => {
      t.events += r.events;
      t.visitors += r.visitors;
      t.projectClicks += r.projectClicks;
      t.resumeDownloads += r.resumeDownloads;
    });
    if (timeRange === '24h' && data?.visitors24h != null) {
      t.visitors = data.visitors24h;
    }
    return t;
  }, [rows, data, timeRange]);

  /* Honest delta vs the previous equivalent period, from the
     backend's prevPeriod object. Returns null (shown as "-") when
     there is no previous-period data or the previous total is 0,
     so no percentage is ever fabricated. For 7d/30d visitors the
     comparison is per-day sums on both sides, like-for-like; for
     24h visitors both sides are deduplicated counts. */
  const deltaFor = (prevKey) => {
    const prev = data?.prevPeriod?.[timeRange]?.[prevKey];
    if (prev == null || prev === 0) return null;
    const cur = totals[prevKey];
    return ((cur - prev) / prev) * 100;
  };

  /* Delta arrow as an inline SVG, not a text character. The ↗ / ↘
   glyphs render as emoji on some phones (coloured background tile),
   which is what the user flagged. An SVG path can never do that. */
function DeltaArrow({ up }) {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true" className="inline-block align-baseline">
      {up ? (
        <path d="M2.5 9.5 L9.5 2.5 M4.5 2.5 H9.5 V7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M2.5 2.5 L9.5 9.5 M4.5 9.5 H9.5 V4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

const deltaEl = (delta) => {
    if (delta == null) {
      return <span className="text-[12px] font-medium text-[var(--faint)]">-</span>;
    }
    if (delta > 0) {
      return (
        <span className="text-[12px] font-medium tabular-nums inline-flex items-center gap-1" style={{ color: DELTA_UP }}>
          <DeltaArrow up /> {delta.toFixed(1)}%
        </span>
      );
    }
    if (delta < 0) {
      return (
        <span className="text-[12px] font-medium tabular-nums inline-flex items-center gap-1" style={{ color: DELTA_DOWN }}>
          <DeltaArrow up={false} /> {Math.abs(delta).toFixed(1)}%
        </span>
      );
    }
    return <span className="text-[12px] font-medium text-[var(--muted)] tabular-nums">0.0%</span>;
  };

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 xl:gap-4">
      {CARDS.map((c) => {
        const value = totals[c.seriesKey] || 0;
        const delta = deltaFor(c.prevKey);

        return (
          <LayerCard
            key={c.seriesKey}
            className="rounded-[12px] flex flex-col min-h-[136px]"
          >
            <div className="px-4 pt-2 pb-0 flex-1">
              <p className="text-[11px] leading-none font-medium text-[var(--muted)] truncate mb-1">{c.label}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-[25px] font-bold text-[var(--text)] leading-none tabular-nums">
                  {formatCompact(value)}
                </span>
                {deltaEl(delta)}
              </div>
            </div>
            <Sparkline rows={rows} seriesKey={c.seriesKey} color={c.color} />
          </LayerCard>
        );
      })}
    </div>
  );
}
