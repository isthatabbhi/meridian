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
import { CF_SERIES as CHART_COLORS, formatCompact } from '../lib/palette';

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

  /* 24h two-hour buckets: the ECharts time axis will not hold a
     2-hour tick interval (it drifts to hourly or 4-hourly), so the
     24h view aggregates the 15-minute buckets into 12 two-hour
     buckets and plots them on a category axis. Each bucket label is
     its start hour ("08 Nov, 06 AM"); the value is the sum of the
     15-minute buckets inside the window. */
  const twoHour = useMemo(() => {
    if (timeRange !== '24h' || chartData.length === 0) return null;
    const buckets = new Map();
    for (const row of chartData) {
      const ms = istKeyToMs(row.time);
      const d = new Date(ms);
      /* IST hour of this bucket; floor to the even hour. */
      const ist = new Date(ms + (330 * 60 * 1000));
      const hour = ist.getUTCHours();
      const evenHour = hour - (hour % 2);
      const key = `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, '0')}-${String(ist.getUTCDate()).padStart(2, '0')} ${String(evenHour).padStart(2, '0')}:00`;
      if (!buckets.has(key)) {
        buckets.set(key, { labelMs: Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate(), evenHour) - (330 * 60 * 1000), values: {} });
      }
      const b = buckets.get(key);
      for (const c of topCountries) {
        b.values[c] = (b.values[c] || 0) + (row[c] || 0);
      }
    }
    const sorted = [...buckets.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    return {
      labels: sorted.map(([key, b]) => (isMobile ? formatHourOnly(msToIstKey(b.labelMs)) : formatHourKeyShort(msToIstKey(b.labelMs)))),
      values: topCountries.map((c) => sorted.map(([, b]) => b.values[c] || 0)),
      labelMs: sorted.map(([, b]) => b.labelMs),
    };
  }, [chartData, topCountries, timeRange, isMobile]);

  /* ECharts option. One line series per top country with gradient
     fill. The 24h view plots 12 two-hour buckets on a category axis
     ("09 Nov, 12 AM" ...), horizontal labels, no rotation: the time
     axis would not hold a 2-hour tick interval, it drifted to hourly
     or 4-hourly, and 24 hourly labels rotated 45 degrees were too
     cluttered and slanted (user order 2026-11-09). Daily ranges use
     a time axis ticking once per day. */
  const options = useMemo(() => {
    const axisColor = dark ? '#808080' : '#6e7781';
    /* Grid lines must be visible against the card bg (#0F0F0F dark)
       so data points can be traced to their values, like CF's
       dashboard. The old #121212 was nearly the same as the card
       bg, so the horizontal split lines were invisible. #262626
       is the track grey, clearly visible but still subtle. */
    const gridColor = dark ? '#262626' : '#e5e7eb';
    const tooltipBg = dark ? '#161b22' : '#ffffff';
    const tooltipBorder = dark ? '#121212' : '#d0d7de';
    const tooltipText = dark ? '#ffffff' : '#1f2328';
    const is24h = timeRange === '24h';
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
        extraCssText: 'border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.35);',
        formatter: (params) => {
          if (!params || params.length === 0) return '';
          const header = is24h
            ? echarts.format.encodeHTML(params[0].name)
            : echarts.format.encodeHTML(formatTooltipTime(params[0].value[0]));
          const headerColor = dark ? '#808080' : '#6e7781';
          const lines = [`<div style="margin-bottom:4px;font-size:11px;color:${headerColor}">${header}</div>`];
          for (const p of params) {
            const name = echarts.format.encodeHTML(p.seriesName);
            const color = echarts.format.encodeHTML(String(p.color));
            const val = is24h ? p.value : p.value[1];
            lines.push(`<div style="font-variant-numeric:tabular-nums"><span style="display:inline-block;width:8px;height:8px;border-radius:9999px;background:${color};margin-right:6px"></span>${name} <span style="font-weight:600">${val}</span></div>`);
          }
          return lines.join('');
        },
      },
      xAxis: is24h ? {
        type: 'category',
        boundaryGap: false,
        data: twoHour ? twoHour.labels : [],
        axisLine: { show: true, lineStyle: { color: gridColor } },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: {
          color: axisColor,
          fontSize: 11,
          fontFamily: 'Inter Variable, system-ui, sans-serif',
          rotate: 0,
          /* Mobile (2026-11-10, user order): 12-13 two-hour labels
             overlap and run together on a narrow screen. Show every
             other label on mobile (every 4 hours, 6-7 labels);
             desktop keeps all of them. */
          interval: isMobile ? 1 : 0,
        },
      } : {
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
        splitNumber: timeRange === '7d' ? 7 : 8,
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
          smooth: true,
          symbol: 'none',
          lineStyle: { width: 1.5, color },
          itemStyle: { color },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: color + '40' },
              { offset: 1, color: color + '05' },
            ]),
          },
          emphasis: { focus: 'series' },
          data: is24h
            ? (twoHour ? twoHour.values[i] : [])
            : chartData.map((row) => [istKeyToMs(row.time), row[code] || 0]),
        };
      }),
    };
  }, [chartData, topCountries, twoHour, timeRange, dark, isMobile]);

  return (
    <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)]">
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
