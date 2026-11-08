import { useMemo, useState, useEffect } from 'react';
import { TimeseriesChart } from "@cloudflare/kumo/components/chart";
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

/* Kumo categorical palette, in order, assigned by rank (top country
   gets #4290F0). Cycles with modulo if more than 6 countries plot. */
const CHART_COLORS = ['#4290F0', '#F5B647', '#E8649D', '#8D58EE', '#50C3B6', '#D37536'];

import { istDayKey, istKeyToMs, msToIstKey, formatMsIndian, formatHourKeyShort, formatHourOnly, formatDayKeyShort } from '../lib/dates';

/* Requests over time, plotted by country on Kumo's TimeseriesChart
   (ECharts under the hood). The four metrics belong on the KPI cards,
   not in this chart. The series come from the stats endpoint:
   per-country 15-minute buckets (q15ByCountry) for the 24h range,
   per-country daily buckets (dailyByCountry) for 7d / 30d / all.
   Each bucket carries per-country counts. Data points are
   [timestamp_in_ms, value] tuples; the bucket keys are IST
   wall-clock times, converted with istKeyToMs. */
export default function RequestsChart({ data, since, timeRange, dark }) {
  /* Mobile axis: the chart is ~350px wide on a phone, so the full
     "07-11 10 AM" labels overlap into a jumble. On a narrow screen
     show 4 ticks with hour-only labels ("10 AM"); the tooltip still
     carries the full date and time. */
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

    /* Totals per country over the range, top 5 plotted. */
    const totals = {};
    buckets.forEach((b) => {
      Object.entries(b).forEach(([k, v]) => {
        if (k === 'time') return;
        totals[k] = (totals[k] || 0) + v;
      });
    });
    const top = Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
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

  /* Convert the bucket rows to Kumo TimeseriesData: one series per
     top country, each point a [timestamp_in_ms, value] tuple. */
  const series = useMemo(() =>
    topCountries.map((code, i) => ({
      name: COUNTRY_NAMES[code] || code,
      color: CHART_COLORS[i % CHART_COLORS.length],
      data: chartData.map((row) => [istKeyToMs(row.time), row[code] || 0]),
    })),
    [chartData, topCountries]
  );

  /* X-axis labels, IST 12-hour, via the existing dates.js helpers.
     The formatters receive raw ms, so convert back to an IST key
     first. Desktop 24h: "07-11 03 PM". Mobile 24h: hour only
     ("03 PM"). Daily ranges: "07-11". */
  const formatXAxis = (ms) => {
    const key = msToIstKey(ms);
    if (timeRange === '24h') {
      return isMobile ? formatHourOnly(key) : formatHourKeyShort(key);
    }
    return formatDayKeyShort(key);
  };
  /* Tooltip timestamp: full Indian format, "08-11-2026 01:45 PM". */
  const formatTooltipTime = (ms) => formatMsIndian(ms);

  /* X-axis tick count: 24h shows every 4 hours on desktop (6 ticks,
     like Cloudflare) and 4 ticks on mobile; daily ranges spread the
     ticks across the days. */
  const xAxisTickCount =
    timeRange === '24h' ? (isMobile ? 4 : 6)
    : timeRange === '7d' ? 7
    : timeRange === '30d' ? 8
    : undefined;

  return (
    <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)]">
      <div className="px-5 py-4">
        <p className="text-[12px] text-[var(--muted)] mb-3">
          Requests over time
        </p>
        {/* Legend: country names (never raw codes) with totals */}
        <div className="flex flex-wrap gap-x-5 gap-y-1 mb-2">
          {topCountries.map((code, i) => (
            <div key={code} className="flex items-center gap-1.5">
              <span
                className="inline-block w-[8px] h-[8px] rounded-full"
                style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
              />
              <span className="text-[12px] text-[var(--text-2)]">
                {COUNTRY_NAMES[code] || code}
              </span>
              <span className="text-[12px] text-[var(--text)] font-medium tabular-nums">
                {countryTotals[code] || 0}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="px-5 pb-5">
        {chartData.length === 0 ? (
          <p className="text-[12px] text-[var(--faint)] h-[280px] flex items-center justify-center">No data yet</p>
        ) : (
          <TimeseriesChart
            echarts={echarts}
            data={series}
            gradient
            yAxisMinInterval={1}
            xAxisTickCount={xAxisTickCount}
            xAxisTickFormat={formatXAxis}
            tooltipTimestampFormat={formatTooltipTime}
            tooltipFollowCursor="x"
            height={280}
            isDarkMode={dark}
            ariaDescription="Requests over time by country"
          />
        )}
      </div>
    </div>
  );
}
