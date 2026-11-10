import { useMemo } from 'react';
import { Chart } from "@cloudflare/kumo/components/chart";
import echarts from '../lib/echarts';

const TYPES = [
  { key: 'pageviews', label: 'Pageview', color: '#2f7cf6' },
  { key: 'projectClicks', label: 'Project click', color: '#f59e0b' },
  { key: 'resumeDownloads', label: 'Resume download', color: '#22c55e' },
  { key: 'contactEvents', label: 'Contact', color: '#8b5cf6' },
];

/* Event distribution as a single segmented bar, now on Kumo's custom
   Chart (ECharts). Was hand-built divs, not Recharts. One stacked
   horizontal bar, one series per event type, values as percentages
   of the total so the bar always fills its track. The track is the
   container's surface-2 background; the chart itself is transparent.
   Hovering a segment shows "Label count (pct%)", like before. */
export default function StatusCodesBar({ data, dark }) {
  const total = data ? data.totalEvents : 0;

  const segments = useMemo(() => {
    if (!data || total === 0) return TYPES.map((t) => ({ ...t, count: 0, pct: 0 }));
    return TYPES.map((t) => ({
      ...t,
      count: data[t.key] || 0,
      pct: ((data[t.key] || 0) / total) * 100,
    }));
  }, [data, total]);

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
      backgroundColor: dark ? '#0f0f0f' : '#ffffff',
      borderColor: dark ? '#30363d' : '#d0d7de',
      borderWidth: 1,
      padding: [6, 10],
      textStyle: { color: dark ? '#ffffff' : '#1f2328', fontSize: 12 },
      extraCssText: 'border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.35);',
      /* Plain-text tooltip; labels are fixed strings, encoded anyway. */
      dangerousHtmlFormatter: (params) => {
        const d = params.data || {};
        const label = echarts.format.encodeHTML(d.label || params.seriesName || '');
        const pct = typeof d.pct === 'number' ? d.pct.toFixed(1) : '';
        return `${label} ${d.count ?? params.value} (${pct}%)`;
      },
    },
    series: visible.map((s, i) => ({
      name: s.label,
      type: 'bar',
      stack: 'total',
      barWidth: 28,
      barMinWidth: 4,
      data: [{ value: s.pct, count: s.count, label: s.label, pct: s.pct }],
      itemStyle: {
        color: s.color,
        /* Round the outer ends of the bar, like the old divs. */
        borderRadius:
          visible.length === 1 ? [6, 6, 6, 6]
          : i === 0 ? [6, 0, 0, 6]
          : i === visible.length - 1 ? [0, 6, 6, 0]
          : [0, 0, 0, 0],
      },
      /* Hover shows the tooltip only. Cloudflare's status bar does NOT
         dim the other segments on hover (verified live 2026-11-10:
         the hovered segment stays full colour, the rest stay full
         colour too). So no focus/blur emphasis here. */
      emphasis: { focus: 'none' },
    })),
  }), [visible, dark]);

  return (
    <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)]">
      <div className="px-5 py-4">
        <p className="text-[12px] font-medium text-[var(--muted)] mb-3">Event distribution</p>
        {/* Legend */}
        <div className="flex flex-wrap gap-x-5 gap-y-1 mb-3">
          {segments.map((s) => (
            <div key={s.key} className="flex items-center gap-1.5">
              <span className="inline-block w-[8px] h-[8px] rounded-full" style={{ backgroundColor: s.color }} />
              <span className="text-[12px] text-[var(--text-2)]">{s.label}</span>
              <span className="text-[12px] text-[var(--text)] font-medium tabular-nums">{s.count}</span>
            </div>
          ))}
        </div>
        {/* Segmented bar: the container is the track, the chart is
            transparent inside it. */}
        <div className="h-[32px] rounded-[6px] overflow-hidden bg-[var(--surface-2)]">
          <Chart echarts={echarts} options={options} height={28} isDarkMode={dark} />
        </div>
      </div>
    </div>
  );
}
