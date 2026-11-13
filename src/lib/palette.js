/* 10-color categorical series, in rank order: the top series gets
   the user's Blue, the next Gold, and so on, cycling with modulo
   past 10. User's exact HEX palette, 2026-11-10 (replaces the
   Cloudflare values). */
export const CF_SERIES = [
  '#4290F0', '#EEB720', '#009966', '#8D58EE', '#E8649D',
  '#50C3B6', '#fb2c36', '#84cc16', '#f97316', '#6366f1',
];

/* Device colors follow the series order: Desktop Blue,
   Mobile Gold, Tablet Pink, Unknown Lavender. */
export const DEVICE_COLORS = {
  Desktop: '#4290F0',
  Mobile: '#EEB720',
  Tablet: '#E8649D',
  Unknown: '#8D58EE',
};

/* Event-type colors, shared by the status bar, the events table
   badges, and the status strip: pageview Blue, project click Gold,
   resume download green, contact Lavender. */
export const EVENT_COLORS = {
  pageview: '#4290F0',
  project_click: '#EEB720',
  resume_download: '#009966',
  contact: '#8D58EE',
};

/* Light-mode series colours, captured from Cloudflare's dashboard
   live 2026-11-13: blue #3b82f6, gold #f5b73d, pink #ec5f9d,
   purple #8b5cf6. Dark keeps the user's palette above. Green and
   teal are the same in both modes (CF has no green in the status
   bar, and the teal is a distinct series colour). Use the
   theme-aware helpers below, not the dark constants, in components
   that render in both modes. */
const CF_SERIES_LIGHT = [
  '#3b82f6', '#f5b73d', '#009966', '#8b5cf6', '#ec5f9d',
  '#50C3B6', '#fb2c36', '#84cc16', '#f97316', '#6366f1',
];
const EVENT_COLORS_LIGHT = {
  pageview: '#3b82f6',
  project_click: '#f5b73d',
  resume_download: '#009966',
  contact: '#8b5cf6',
};
const DEVICE_COLORS_LIGHT = {
  Desktop: '#3b82f6',
  Mobile: '#f5b73d',
  Tablet: '#ec5f9d',
  Unknown: '#8b5cf6',
};
export const seriesFor = (dark) => (dark ? CF_SERIES : CF_SERIES_LIGHT);
export const eventColorsFor = (dark) => (dark ? EVENT_COLORS : EVENT_COLORS_LIGHT);
export const deviceColorsFor = (dark) => (dark ? DEVICE_COLORS : DEVICE_COLORS_LIGHT);

/* Accent blue per theme (dark #4290F0, light #2563eb). Use in canvas
   code where CSS var(--accent) cannot reach. */
export const accentFor = (dark) => (dark ? '#4290F0' : '#2563eb');

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
