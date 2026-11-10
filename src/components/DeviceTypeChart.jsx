import { useMemo } from 'react';
import { Chart } from "@cloudflare/kumo/components/chart";
import echarts from '../lib/echarts';

/* Kumo categorical palette, for nominal categories with no inherent
   polarity (device types). Assigned by device name so the pie slice
   and the legend dot always match, even when a device has no data
   and is filtered out. Replaces the old single-blue scheme (Desktop
   was #2f7cf6, Unknown was grey). */
const CATEGORICAL = ['#4290F0', '#F5B647', '#E8649D', '#8D58EE', '#50C3B6', '#D37536'];
const DEVICE_ORDER = ['Desktop', 'Mobile', 'Tablet', 'Unknown'];
const DEVICE_COLORS = Object.fromEntries(
  DEVICE_ORDER.map((name, i) => [name, CATEGORICAL[i % CATEGORICAL.length]])
);

export default function DeviceTypeChart({ data, dark }) {
  const deviceData = useMemo(() => {
    const byDevice = data?.requestsByDevice || {};
    return DEVICE_ORDER
      .map((name) => ({ name, value: byDevice[name] || 0 }))
      .filter((d) => d.value > 0);
  }, [data]);

  const total = deviceData.reduce((sum, d) => sum + d.value, 0);
  const hasData = total > 0;

  /* ECharts pie option. Same donut as before: inner radius 60,
     outer 110, starting at the top and sweeping clockwise. No load
     animation: it appears fully drawn at once, like Cloudflare's. */
  const options = useMemo(() => {
    const tooltip = {
      trigger: 'item',
      backgroundColor: dark ? '#0f0f0f' : '#ffffff',
      borderColor: dark ? '#30363d' : '#d0d7de',
      borderWidth: 1,
      padding: [8, 12],
      textStyle: { color: dark ? '#ffffff' : '#1f2328', fontSize: 12 },
      extraCssText: 'border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.35);',
      /* HTML tooltip (dot + name + value), like the old custom one.
         Names are fixed device labels, but encode them anyway, as the
         Kumo docs require for dangerousHtmlFormatter. */
      dangerousHtmlFormatter: (params) => {
        const name = echarts.format.encodeHTML(params.name);
        const color = echarts.format.encodeHTML(String(params.color));
        return `<span style="display:inline-block;width:8px;height:8px;border-radius:9999px;background:${color};margin-right:6px"></span><span>${name}</span> <strong>${params.value}</strong>`;
      },
    };
    if (!hasData) {
      /* Empty donut: a single flat ring, no tooltip. */
      return {
        animation: false,
        tooltip: { show: false },
        series: [{
          type: 'pie',
          radius: [65, 120],
          center: ['50%', '50%'],
          label: { show: false },
          labelLine: { show: false },
          itemStyle: { borderColor: 'transparent', borderWidth: 0 },
          emphasis: { scale: false },
          data: [{ name: 'empty', value: 1, itemStyle: { color: dark ? '#0f0f0f' : '#e5e7eb' } }],
        }],
      };
    }
    return {
      /* No load animation (Cloudflare behavior, verified live
         2026-11-10): the donut appears fully drawn at once when the
         data arrives, no slow clockwise sweep and no growing from
         the centre. The old 600ms cubicOut sweep was visibly
         different. */
      animation: false,
      tooltip,
      series: [{
        type: 'pie',
        radius: [65, 120],
        center: ['50%', '50%'],
        startAngle: 90,
        clockwise: true,
        label: { show: false },
        labelLine: { show: false },
        /* Gap + rounded ends, like Cloudflare's donut: a border in
           the card bg colour separates the segments so they do not
           merge, and borderRadius rounds each segment's ends. */
        itemStyle: {
          borderColor: dark ? '#0f0f0f' : '#ffffff',
          borderWidth: 3,
          borderRadius: 6,
        },
        emphasis: { scale: false },
        data: deviceData.map((d) => ({
          name: d.name,
          value: d.value,
          itemStyle: { color: DEVICE_COLORS[d.name] },
        })),
      }],
    };
  }, [deviceData, hasData, dark]);

  return (
    <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] h-full flex flex-col">
      <div className="px-5 py-4">
        <p className="text-[12px] text-[var(--muted)] mb-3">
          Requests by device type
        </p>
        {/* Legend: only devices that actually have data */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4">
          {DEVICE_ORDER.filter((name) => ((data?.requestsByDevice || {})[name] || 0) > 0).map((name) => (
            <div key={name} className="flex items-center gap-1.5">
              <span className="inline-block w-[8px] h-[8px] rounded-full" style={{ backgroundColor: DEVICE_COLORS[name] }} />
              <span className="text-[12px] text-[var(--text-2)]">{name}</span>
              <span className="text-[12px] text-[var(--text)] font-semibold tabular-nums">
                {(data?.requestsByDevice || {})[name] || 0}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center pb-5 px-5">
        <Chart echarts={echarts} options={options} height={280} isDarkMode={dark} />
        {!hasData && (
          <p className="text-[11px] text-[var(--faint)] mt-2 text-center">
            No device data yet, new visits will appear here
          </p>
        )}
      </div>
    </div>
  );
}
