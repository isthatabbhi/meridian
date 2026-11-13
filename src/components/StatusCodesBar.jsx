import { useMemo, useState } from 'react';
import { Chart } from "@cloudflare/kumo/components/chart";
import { Text } from "@cloudflare/kumo/components/text";
import echarts from '../lib/echarts';
import { eventColorsFor, formatCompact } from '../lib/palette';

const TYPES = [
  { key: 'pageviews', label: 'Pageview', colorKey: 'pageview' },
  { key: 'projectClicks', label: 'Project click', colorKey: 'project_click' },
  { key: 'resumeDownloads', label: 'Resume download', colorKey: 'resume_download' },
  { key: 'contactEvents', label: 'Contact', colorKey: 'contact' },
];

/* Event distribution as a single segmented bar, now on Kumo's custom
   Chart (ECharts). Was hand-built divs, not Recharts. One stacked
   horizontal bar, one series per event type, values as percentages
   of the total so the bar always fills its track. The track is the
   container's surface-2 background; the chart itself is transparent.
   Hovering a segment shows "Label count (pct%)", like before. */
export default function StatusCodesBar({ data, dark }) {
  const total = data ? data.totalEvents : 0;
  /* Hovered segment label (user order 2026-11-10): ECharts'
     built-in emphasis focus 'series' did not dim the others
     when the FIRST segment (Pageview) was hovered first; it only
     started working after another segment had been hovered.
     So the dimming is done manually here: the hovered segment
     stays at full opacity, the rest drop to 0.45.
     Double-hover fix (2026-11-13): the dimming was driven by
     ECharts events (mouseover, then showTip/mousemove), but
     those do not fire reliably on the very first hover, while
     ECharts' own tooltip does show on first hover. Result: the
     tooltip appeared at once, the dimming only a second later
     (or on a second hover), looking like the hover happened
     twice. Now the dimming is driven by a plain DOM mousemove
     on the bar container: the mouse x maps to a segment from
     the known percentages, so it fires on the very first move
     over the bar, in sync with the tooltip. No ECharts event
     is involved, so there is nothing to miss the first hover. */
  const [hovered, setHovered] = useState(null);

  /* Map a mouse x (relative to the bar container) to the segment
     under the cursor. Segments fill the bar left to right in
     percentage order, so the cumulative percentages are the
     boundaries. */
  const segmentAtX = (clientX, rect) => {
    if (!rect || rect.width <= 0) return null;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    let acc = 0;
    for (const s of visible) {
      acc += s.pct;
      if (pct <= acc) return s.label;
    }
    return visible.length ? visible[visible.length - 1].label : null;
  };

  const segments = useMemo(() => {
    const colors = eventColorsFor(dark);
    if (!data || total === 0) return TYPES.map((t) => ({ ...t, color: colors[t.colorKey], count: 0, pct: 0 }));
    return TYPES.map((t) => ({
      ...t,
      color: colors[t.colorKey],
      count: data[t.key] || 0,
      pct: ((data[t.key] || 0) / total) * 100,
    }));
  }, [data, total, dark]);

  /* Visible segments only (count > 0), so the first/last rounded
     corners land on the right segments. */
  const visible = useMemo(() => segments.filter((s) => s.count > 0), [segments]);

  const options = useMemo(() => ({
    animationDuration: 200,
    animationDurationUpdate: 200,
    grid: { left: 0, right: 0, top: 0, bottom: 0, containLabel: false },
    xAxis: { type: 'value', max: 100, show: false },
    yAxis: { type: 'category', data: [''], show: false },
    tooltip: {
      trigger: 'item',
      triggerOn: 'mousemove',
      /* Show immediately on the first hover (no delay), and never
         let the tooltip itself capture the mouse: when the tooltip
         appears under the cursor it would steal the hover from the
         chart, so the first hover did nothing and a second hover
         was needed. enterable false makes it pointer-transparent. */
      showDelay: 0,
      hideDelay: 100,
      enterable: false,
      /* Appended to document.body: the bar track container has
         overflow-hidden (it clips the bar's rounded corners), and an
         ECharts tooltip rendered inside it gets clipped too, so
         hovering showed nothing. Appending to body lets it float
         above the card. */
      appendToBody: true,
      backgroundColor: dark ? '#161b22' : '#ffffff',
      borderColor: dark ? '#121212' : '#e1e1e1',
      borderWidth: 1,
      padding: [8, 12],
      transitionDuration: 0.1,
      textStyle: { color: dark ? '#ffffff' : '#1a1a1a', fontSize: 12, fontFamily: 'Inter Variable, system-ui, sans-serif' },
      extraCssText: 'border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.35);',
      /* Cloudflare's tooltip (verified live 2026-11-10): "2xx:
         5.77k (91.23%)" — label regular, count bold white,
         percent in grey with 2 decimals. Count is compact
         (5.77k), percent grey. */
      dangerousHtmlFormatter: (params) => {
        const d = params.data || {};
        const label = echarts.format.encodeHTML(d.label || params.seriesName || '');
        const pct = typeof d.pct === 'number' ? d.pct.toFixed(2) : '';
        const pctColor = dark ? '#808080' : '#6b7280';
        const count = formatCompact(d.count ?? params.value ?? 0);
        return `${label} <span style="font-weight:600;font-variant-numeric:tabular-nums">${count}</span> <span style="color:${pctColor}">(${pct}%)</span>`;
      },
    },
    series: visible.map((s, i) => ({
      name: s.label,
      type: 'bar',
      stack: 'total',
      barWidth: 32,
      barMinWidth: 4,
      data: [{ value: s.pct, count: s.count, label: s.label, pct: s.pct }],
      itemStyle: {
        color: s.color,
        /* Manual hover dimming: the hovered segment stays full
           colour, the rest drop to 0.45, like Cloudflare's status
           bar (verified live 2026-11-10). No emphasis/blur here;
           the built-in focus 'series' failed on the first segment
           on first hover, so opacity is set directly. */
        opacity: hovered === null || hovered === s.label ? 1 : 0.45,
        /* Round the outer ends of the bar, like the old divs. */
        borderRadius:
          visible.length === 1 ? [6, 6, 6, 6]
          : i === 0 ? [6, 0, 0, 6]
          : i === visible.length - 1 ? [0, 6, 6, 0]
          : [0, 0, 0, 0],
      },
    })),
  }), [visible, dark, hovered]);

  return (
    <div className="rounded-[12px] bg-[var(--surface)] w-full ring ring-kumo-line shadow-xs">
      <div className="px-5 py-4">
        <Text variant="secondary" size="xs" bold DANGEROUS_className="mb-3">Event distribution</Text>
        {/* Legend */}
        <div className="flex flex-wrap gap-x-5 gap-y-1 mb-3">
          {segments.map((s) => (
            <div key={s.key} className="flex items-center gap-1.5">
              <span className="inline-block w-[8px] h-[8px] rounded-full" style={{ backgroundColor: s.color }} />
              <span className="text-[12px] leading-4 text-[var(--text-2)]">{s.label}</span>
              <span className="text-[12px] leading-4 text-[var(--text)] font-medium tabular-nums">{formatCompact(s.count)}</span>
            </div>
          ))}
        </div>
        {/* Segmented bar: Cloudflare has NO visible track behind
            the bar, it sits directly on the card background
            (verified live 2026-11-10). The bar is 32px tall, like
            CF. The container is transparent; the chart fills it. */}
        <div
          className="h-[32px] w-full rounded-[6px] overflow-hidden"
          onMouseMove={(e) => {
            const label = segmentAtX(e.clientX, e.currentTarget.getBoundingClientRect());
            if (label) setHovered(label);
          }}
          onMouseLeave={() => setHovered(null)}
        >
          <Chart
            echarts={echarts}
            options={options}
            height={32}
            isDarkMode={dark}
          />
        </div>
      </div>
    </div>
  );
}
