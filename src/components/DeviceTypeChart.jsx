import { useMemo, useState } from 'react';
import { Chart } from "@cloudflare/kumo/components/chart";
import { Text } from "@cloudflare/kumo/components/text";
import echarts from '../lib/echarts';

/* Device colors follow Cloudflare's categorical series order:
   Desktop #4290F0, Mobile #EEB720, Tablet #E8649D, Unknown #8D58EE.
   Assigned by device name so the pie slice and the legend dot always
   match, even when a device has no data. */
import { DEVICE_COLORS } from '../lib/palette';
const DEVICE_ORDER = ['Desktop', 'Mobile', 'Tablet', 'Unknown'];

export default function DeviceTypeChart({ data, dark }) {
  const deviceData = useMemo(() => {
    const byDevice = data?.requestsByDevice || {};
    return DEVICE_ORDER
      .map((name) => ({ name, value: byDevice[name] || 0 }));
  }, [data]);

  const total = deviceData.reduce((sum, d) => sum + d.value, 0);
  const hasData = total > 0;
  /* Hovered device (user order 2026-11-10): when a donut segment
     is hovered, the segment expands (CF effect) and the legend
     marker for that device gets a coloured outline in the same
     colour. Set from the chart's mouseover/mouseout events. */
  const [hovered, setHovered] = useState(null);

  /* ECharts pie option. Same donut as before: inner radius 60,
     outer 110, starting at the top and sweeping clockwise. Animates
     600ms on mount; data updates are instant (animationDurationUpdate
     0) so live refreshes do not replay the sweep. */
  const options = useMemo(() => {
    const tooltip = {
      trigger: 'item',
      backgroundColor: dark ? '#161b22' : '#ffffff',
      borderColor: dark ? '#121212' : '#d0d7de',
      borderWidth: 1,
      padding: [8, 12],
      transitionDuration: 0.1,
      textStyle: { color: dark ? '#ffffff' : '#1f2328', fontSize: 12, fontFamily: 'Inter Variable, system-ui, sans-serif' },
      extraCssText: 'border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.35);',
      /* HTML tooltip (dot + name + value), like the old custom one.
         Names are fixed device labels, but encode them anyway, as the
         Kumo docs require for dangerousHtmlFormatter. */
      dangerousHtmlFormatter: (params) => {
        const name = echarts.format.encodeHTML(params.name);
        const color = echarts.format.encodeHTML(String(params.color));
        return `<span style="display:inline-block;width:8px;height:8px;border-radius:9999px;background:${color};margin-right:6px"></span><span>${name}</span> <span style="font-weight:600;font-variant-numeric:tabular-nums">${params.value}</span>`;
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
          data: [{ name: 'empty', value: 1, itemStyle: { color: dark ? '#262626' : '#e5e7eb' } }],
        }],
      };
    }
    return {
      /* Load animation restored (user order 2026-11-10): the donut
         sweeps in over 600ms ease-out on mount, like before.
         Data updates are instant (animationDurationUpdate 0) so
         live refreshes do not replay the sweep. */
      animationDuration: 600,
      animationEasing: 'cubicOut',
      animationDurationUpdate: 0,
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
          borderColor: dark ? '#0F0F0F' : '#ffffff',
          borderWidth: 3,
          borderRadius: 6,
        },
        /* Hovered segment expands radially outward in place, like
           Cloudflare's donut (verified live 2026-11-10: the
           segment grows ~6px on every side, the ring getting
           thicker outward, centre hole unmoved, other segments
           unchanged). scaleSize 6 matches CF's ~6px growth. */
        emphasis: { scale: true, scaleSize: 6 },
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
        <Text variant="secondary" size="xs" bold DANGEROUS_className="mb-3">
          Requests by device type
        </Text>
        {/* Legend: all three device types, like Cloudflare, even at 0.
            When a segment is hovered, its marker gets a coloured
            outline ring in the same colour as the data (user order
            2026-11-10), so the guide highlights with the segment. */}
        <div className="flex flex-wrap gap-x-5 gap-y-1 mb-4">
          {DEVICE_ORDER.map((name) => (
            <div key={name} className="flex items-center gap-1.5">
              <span className="inline-block w-[8px] h-[8px] rounded-full" style={{ backgroundColor: DEVICE_COLORS[name], ...(hovered === name ? { boxShadow: `0 0 0 2px ${DEVICE_COLORS[name]}` } : {}) }} />
              <span className="text-[12px] leading-4 text-[var(--text-2)]">{name}</span>
              <span className="text-[12px] leading-4 text-[var(--text)] font-medium tabular-nums">
                {(data?.requestsByDevice || {})[name] || 0}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center pb-5 px-5">
        <Chart
          echarts={echarts}
          options={options}
          height={280}
          isDarkMode={dark}
          onEvents={{
            mouseover: (p) => { if (p && DEVICE_ORDER.includes(p.name)) setHovered(p.name); },
            mouseout: () => setHovered(null),
            globalout: () => setHovered(null),
          }}
        />
      </div>
    </div>
  );
}
