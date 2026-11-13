import { useMemo, useState, useEffect } from 'react';
import { Chart } from "@cloudflare/kumo/components/chart";
import { Text } from "@cloudflare/kumo/components/text";
import echarts from '../lib/echarts';

/* Country names for the legend. Never fall back to a raw code in the
   legend (PL showed as "PL" until this map was synced). Copied from
   CountryGlobe.jsx so both stay in sync. */
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

/* Cloudflare 10-color categorical series, in rank order (top country
   gets #4290F0). Cycles with modulo past 10 countries. */
import { seriesFor, formatCompact } from '../lib/palette';

import { istDayKey, istKeyToMs, msToIstKey, formatMsIndian, formatHourKeyShort, formatHourOnly, formatDayKeyShort } from '../lib/dates';

/* Requests over time, plotted by country on Kumo's custom Chart
   (ECharts directly, not TimeseriesChart). TimeseriesChart cannot
   rotate x-axis labels, and 24 hourly labels ("09 Nov, 12 AM" ...)
   do not fit side by side, they overlap into a jumble. The custom
   Chart rotates the labels 45 degrees so every hour fits. The four
   metrics belong on the KPI cards, not in this chart. The series
   come from the stats endpoint: per-country 15-minute buckets
   (q15ByCountry) for the 24h range, per-country daily buckets
   (dailyByCountry) for 7d / 30d / all. Each bucket carries
   per-country counts. Data points are [timestamp_in_ms, value]
   tuples; the bucket keys are IST wall-clock times, converted
   with istKeyToMs. */
export default function RequestsChart({ data, since, timeRange, dark }) {
  /* Mobile axis: the chart is ~350px wide on a phone, so the full
     "07 Nov, 10 AM" labels overlap into a jumble. On a narrow screen
     show hour-only labels ("10 AM"); the tooltip still carries the
     full date and time. */
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  /* Series colours are theme-aware: dark keeps the user's palette,
     light uses CF's captured series colours (#3b82f6, #f5b73d,
     #ec5f9d, #8b5cf6). */
  const CHART_COLORS = seriesFor(dark);

  const { chartData, topCountries, countryTotals } = useMemo(() => {
    const raw = timeRange === '24h' ? data?.q15ByCountry : data?.dailyByCountry;
    if (!raw || raw.length === 0) {
      return { chartData: [], topCountries: [], countryTotals: {} };
    }
    /* 15-minute buckets carry `t`, daily buckets carry `time`. */
    const series = raw.map((b) => {
      const { t, time, ...rest } = b;
      return { time: t || time, ...rest };
    });

    /* For daily ranges, drop buckets older than the range start. */
    let buckets = series;
    if (timeRange !== '24h' && since > 0) {
      const startDay = istDayKey(new Date(since));
      buckets = series.filter((b) => b.time >= startDay);
    }
    if (buckets.length === 0) {
      return { chartData: [], topCountries: [], countryTotals: {} };
    }

    /* Totals per country over the range, all plotted (user order
       2026-11-10: the chart should automatically show all the
       countries where traffic is coming from, not just the top 5). */
    const totals = {};
    buckets.forEach((b) => {
      Object.entries(b).forEach(([k, v]) => {
        if (k === 'time') return;
        totals[k] = (totals[k] || 0) + v;
      });
    });
    const top = Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .map(([code]) => code);

    /* Fill gaps across the range so the axis spans it. Hourly buckets
       already cover all 24 hours; daily buckets need missing days. */
    let rows = buckets.map((b) => {
      const row = { time: b.time };
      top.forEach((c) => { row[c] = b[c] || 0; });
      return row;
    });
    if (timeRange !== '24h') {
      const have = new Map(rows.map((r) => [r.time, r]));
      const startDay = since > 0 ? istDayKey(new Date(since)) : rows[0].time;
      const endDay = istDayKey(new Date());
      const filled = [];
      const cur = new Date(startDay + 'T00:00:00Z');
      const end = new Date(endDay + 'T00:00:00Z');
      while (cur <= end) {
        const key = istDayKey(cur);
        if (have.has(key)) {
          filled.push(have.get(key));
        } else {
          const row = { time: key };
          top.forEach((c) => { row[c] = 0; });
          filled.push(row);
        }
        cur.setUTCDate(cur.getUTCDate() + 1);
      }
      rows = filled;
    }

    rows.sort((a, b) => a.time.localeCompare(b.time));
    return { chartData: rows, topCountries: top, countryTotals: totals };
  }, [data, since, timeRange]);

  /* X-axis labels, IST 12-hour, via the existing dates.js helpers.
     The formatters receive raw ms, so convert back to an IST key
     first. Desktop 24h: "07 Nov, 03 PM". Mobile 24h: hour only
     ("03 PM"). Daily ranges: "07 Nov". */
  const formatXAxis = (ms) => {
    const key = msToIstKey(ms);
    if (timeRange === '24h') {
      return isMobile ? formatHourOnly(key) : formatHourKeyShort(key);
    }
    return formatDayKeyShort(key);
  };
  /* Tooltip timestamp: full Indian format, "08-11-2026 01:45 PM". */
  const formatTooltipTime = (ms) => formatMsIndian(ms);

  /* CF analysis, 2026-11-11, from the Cloudflare Traffic overview
     reference videos and the ui-spec: CF Requests over time is a
     timeseries, count grouped by clientCountryName, one line per
     country, hourly buckets in the 24h view. Its lines are straight
     segments between points, sharp pointed spikes, NO smoothing and
     NO area fill under the lines, thin 1.5px, no point symbols, and
     the values sit at 0 between spikes. Meridian previously did the
     opposite: smooth:true spline curves with a gradient area fill,
     and 24h data aggregated into 12 two-hour buckets, so spikes
     became rounded domes. This memo aggregates the 15-minute
     buckets into 24 hourly rows, one per hour, so the 24h view
     plots hourly points on the same time axis as the daily ranges,
     and the spikes stay sharp like CF. */
  const hourlyData = useMemo(() => {
    if (timeRange !== '24h' || chartData.length === 0) return chartData;
    const buckets = new Map();
    for (const row of chartData) {
      const ms = istKeyToMs(row.time);
      const ist = new Date(ms + (330 * 60 * 1000));
      const key = `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, '0')}-${String(ist.getUTCDate()).padStart(2, '0')} ${String(ist.getUTCHours()).padStart(2, '0')}:00`;
      if (!buckets.has(key)) {
        const r = { time: key };
        topCountries.forEach((c) => { r[c] = 0; });
        buckets.set(key, r);
      }
      const b = buckets.get(key);
      for (const c of topCountries) b[c] = (b[c] || 0) + (row[c] || 0);
    }
    return [...buckets.values()].sort((a, b) => a.time.localeCompare(b.time));
  }, [chartData, topCountries, timeRange]);

  /* ECharts option. CF lines, applied 2026-11-11: one thin line
     series per country, straight segments (smooth:false, so spikes
     are pointed triangles like CF, not rounded domes), no point
     symbols, 1.5px, with the colour shading under the lines
     restored on the user's word the same evening (gradient fill,
     0.25 fading to 0.02). All ranges use a time axis: 24h ticks
     every 4 hours (splitNumber 6, CF shows "Nov 7, 04:00" style
     ticks), daily ranges tick once per day. Axis, grid and tooltip
     colours are the CF spec values: axis #8b949e, grid/tooltip
     border #30363d, tooltip shadow rgba(0,0,0,0.5). Labels stay in
     the user's 12-hour Indian format, not CF's 24-hour format. */
  const options = useMemo(() => {
    const axisColor = dark ? '#8b949e' : '#6b7280';
    const gridColor = dark ? '#30363d' : '#e1e1e1';
    const tooltipBg = dark ? '#161b22' : '#ffffff';
    const tooltipBorder = dark ? '#30363d' : '#e1e1e1';
    const tooltipText = dark ? '#ffffff' : '#1a1a1a';
    const plotData = timeRange === '24h' ? hourlyData : chartData;
    return {
      animationDuration: 800,
      animationEasing: 'cubicOut',
      animationDurationUpdate: 0,
      grid: { left: 8, right: 8, top: 8, bottom: 8, containLabel: true },
      tooltip: {
        trigger: 'axis',
        /* No crosshair line. Cloudflare's Requests over time shows the
           tooltip only, with no guide line (verified live 2026-11-10).
           axisPointer type 'none' keeps the tooltip but hides the
           vertical line. */
        axisPointer: { type: 'none' },
        backgroundColor: tooltipBg,
        borderColor: tooltipBorder,
        borderWidth: 1,
        padding: [8, 12],
        transitionDuration: 0.1,
        textStyle: { color: tooltipText, fontSize: 12, fontFamily: 'Inter Variable, system-ui, sans-serif' },
        extraCssText: 'border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);',
        /* Kumo's Chart strips the plain `formatter` property and only
           honours `dangerousHtmlFormatter` (see transformTooltip in
           Kumo's EChart wrapper). The plain formatter was silently
           dropped, so ECharts fell back to its default tooltip and
           showed the raw "2026-11-12 17:00:00". Fixed 2026-11-13. */
        dangerousHtmlFormatter: (params) => {
          if (!params || params.length === 0) return '';
          const header = echarts.format.encodeHTML(formatTooltipTime(params[0].value[0]));
          const headerColor = dark ? '#8b949e' : '#6b7280';
          const lines = [`<div style="margin-bottom:4px;font-size:11px;color:${headerColor}">${header}</div>`];
          for (const p of params) {
            const name = echarts.format.encodeHTML(p.seriesName);
            const color = echarts.format.encodeHTML(String(p.color));
            const val = p.value[1];
            lines.push(`<div style="font-variant-numeric:tabular-nums"><span style="display:inline-block;width:8px;height:8px;border-radius:9999px;background:${color};margin-right:6px"></span>${name} <span style="font-weight:600">${val}</span></div>`);
          }
          return lines.join('');
        },
      },
      xAxis: {
        type: 'time',
        boundaryGap: false,
        axisLine: { show: true, lineStyle: { color: gridColor } },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: {
          color: axisColor,
          fontSize: 11,
          fontFamily: 'Inter Variable, system-ui, sans-serif',
          rotate: 0,
          formatter: (value) => formatXAxis(value),
        },
        splitNumber: timeRange === '24h' ? 6 : timeRange === '7d' ? 7 : 8,
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: true, lineStyle: { color: gridColor, type: [3, 3] } },
        axisLabel: { color: axisColor, fontSize: 11, fontFamily: 'Inter Variable, system-ui, sans-serif' },
      },
      series: topCountries.map((code, i) => {
        const color = CHART_COLORS[i % CHART_COLORS.length];
        return {
          name: COUNTRY_NAMES[code] || code,
          type: 'line',
          /* CF: straight segments, no smoothing. Colour shading
             under the lines restored 2026-11-11 on the user's word:
             a vertical gradient in the series colour, 0.25 opacity
             at the line fading to 0.02 at the axis. */
          smooth: false,
          symbol: 'none',
          lineStyle: { width: 1.5, color },
          itemStyle: { color },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: `${color}40` },
              { offset: 1, color: `${color}05` },
            ]),
          },
          emphasis: { focus: 'series' },
          data: plotData.map((row) => [istKeyToMs(row.time), row[code] || 0]),
        };
      }),
    };
  }, [chartData, hourlyData, topCountries, timeRange, dark, isMobile]);

  return (
    <div className="rounded-[12px] bg-[var(--surface)] ring ring-kumo-line shadow-xs">
      <div className="px-5 py-4">
        <Text variant="secondary" size="xs" bold DANGEROUS_className="mb-3">
          Requests over time
        </Text>
        {/* Legend: country names (never raw codes) with totals */}
        <div className="flex flex-wrap gap-x-5 gap-y-1 mb-2">
          {topCountries.map((code, i) => (
            <div key={code} className="flex items-center gap-1.5">
              <span
                className="inline-block w-[8px] h-[8px] rounded-full"
                style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
              />
              <span className="text-[12px] leading-4 text-[var(--text-2)]">
                {COUNTRY_NAMES[code] || code}
              </span>
              <span className="text-[12px] leading-4 text-[var(--text)] font-medium tabular-nums">
                {formatCompact(countryTotals[code] || 0)}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="px-5 pb-5">
        {chartData.length === 0 ? (
          <p className="text-[12px] leading-4 text-[var(--muted)] h-[280px] flex items-center justify-center">No data available for this time range</p>
        ) : (
          <Chart
            echarts={echarts}
            options={options}
            height={isMobile ? 220 : 280}
            isDarkMode={dark}
            ariaDescription="Requests over time by country"
          />
        )}
      </div>
    </div>
  );
}
