/* Cloudflare 10-color categorical series (spec section 2.1), in rank
   order: the top series gets #2f7cf6, the next #f59e0b, and so on,
   cycling with modulo past 10. */
export const CF_SERIES = [
  '#2f7cf6', '#f59e0b', '#22c55e', '#8b5cf6', '#ec4899',
  '#06b6d4', '#ef4444', '#84cc16', '#f97316', '#6366f1',
];

/* Device colors follow the series order: Desktop #2f7cf6,
   Mobile #f59e0b, Tablet #ec4899, Unknown #8b5cf6. */
export const DEVICE_COLORS = {
  Desktop: '#2f7cf6',
  Mobile: '#f59e0b',
  Tablet: '#ec4899',
  Unknown: '#8b5cf6',
};

/* Event-type colors, shared by the status bar, the events table
   badges, and the status strip: pageview blue, project click amber,
   resume download green, contact purple. */
export const EVENT_COLORS = {
  pageview: '#2f7cf6',
  project_click: '#f59e0b',
  resume_download: '#22c55e',
  contact: '#8b5cf6',
};

/* Accent blue per theme (dark #2f7cf6, light #0969da). Use in canvas
   code where CSS var(--accent) cannot reach. */
export const accentFor = (dark) => (dark ? '#2f7cf6' : '#0969da');

/* Compact number format (1150 -> "1.15k"), shared by KPI values,
   chart legends, and status bar legends. */
export function formatCompact(n) {
  if (n == null) return '0';
  if (n >= 1000) {
    const v = n / 1000;
    return (v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2)).replace(/\.0+$|(\.\d*?)0+$/, '$1') + 'k';
  }
  return String(n);
}
