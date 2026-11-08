// All Meridian times are shown in Indian time (IST, UTC+5:30),
// in Indian format DD-MM-YYYY hh:mm AM/PM, e.g. 06-11-2026 04:00 AM.
export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

const pad = (n) => String(n).padStart(2, '0');

// Shift a Date so its UTC parts read as IST parts
export function toIST(date) {
  return new Date(date.getTime() + IST_OFFSET_MS);
}

// Full timestamp: "06-11-2026 04:00 AM"
export function formatIndian(iso) {
  if (!iso) return '-';
  const ist = toIST(new Date(iso));
  const h24 = ist.getUTCHours();
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  return `${pad(ist.getUTCDate())}-${pad(ist.getUTCMonth() + 1)}-${ist.getUTCFullYear()} ${pad(h24 % 12 || 12)}:${pad(ist.getUTCMinutes())} ${ampm}`;
}

// Short timestamp for narrow screens: "06-11 04:00 AM" (year dropped;
// events are near-term, the year adds width the phone does not have)
export function formatIndianShort(iso) {
  if (!iso) return '-';
  const ist = toIST(new Date(iso));
  const h24 = ist.getUTCHours();
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  return `${pad(ist.getUTCDate())}-${pad(ist.getUTCMonth() + 1)} ${pad(h24 % 12 || 12)}:${pad(ist.getUTCMinutes())} ${ampm}`;
}

// IST hour bucket key: "2026-11-06 04:00"
export function istHourKey(date) {
  const ist = toIST(date);
  return `${ist.getUTCFullYear()}-${pad(ist.getUTCMonth() + 1)}-${pad(ist.getUTCDate())} ${pad(ist.getUTCHours())}:00`;
}

// Hour key to full Indian format: "06-11-2026 04:00 AM"
// A bare day key ("2026-11-06") formats as "06-11-2026"
export function formatHourKeyIndian(hourKey) {
  const parts = hourKey.split(' ');
  if (parts.length < 2) return formatDayKeyIndian(hourKey);
  const [y, m, d] = parts[0].split('-');
  const [hh, mm] = parts[1].split(':');
  const h24 = parseInt(hh, 10);
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  return `${d}-${m}-${y} ${pad(h24 % 12 || 12)}:${mm} ${ampm}`;
}

// Hour key to hour-only label: "04 AM" (mobile axis, no date)
// A bare day key ("2026-11-06") formats as "06-11"
export function formatHourOnly(hourKey) {
  const parts = hourKey.split(' ');
  if (parts.length < 2) return formatDayKeyShort(hourKey);
  const h24 = parseInt(parts[1].split(':')[0], 10);
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  return `${h24 % 12 || 12} ${ampm}`;
}

// Hour key to short axis label: "06-11 04 AM"
// A bare day key ("2026-11-06") formats as "06-11"
export function formatHourKeyShort(hourKey) {
  const parts = hourKey.split(' ');
  if (parts.length < 2) return formatDayKeyShort(hourKey);
  const [y, m, d] = parts[0].split('-');
  const h24 = parseInt(parts[1].split(':')[0], 10);
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  return `${d}-${m} ${pad(h24 % 12 || 12)} ${ampm}`;
}

// 15-minute key to short axis label: "06-11 04:15 PM"
// A bare day key ("2026-11-06") formats as "06-11"
export function formatMinuteKeyShort(minKey) {
  const parts = minKey.split(' ');
  if (parts.length < 2) return formatDayKeyShort(minKey);
  const [y, m, d] = parts[0].split('-');
  const [hh, mm] = parts[1].split(':');
  const h24 = parseInt(hh, 10);
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  return `${d}-${m} ${pad(h24 % 12 || 12)}:${mm} ${ampm}`;
}

// IST wall-clock key to epoch ms: "2026-11-08 13:45" or "2026-11-08"
// (midnight IST for a bare day key). Keys from the stats endpoint are
// IST wall-clock times, so subtract the IST offset to get UTC ms.
export function istKeyToMs(key) {
  if (!key) return 0;
  const parts = key.split(' ');
  const [y, m, d] = parts[0].split('-').map(Number);
  let hh = 0, mm = 0;
  if (parts.length > 1) {
    [hh, mm] = parts[1].split(':').map(Number);
  }
  return Date.UTC(y, (m || 1) - 1, d || 1, hh || 0, mm || 0) - IST_OFFSET_MS;
}

// Epoch ms to IST wall-clock key "2026-11-08 13:45"
export function msToIstKey(ms) {
  const ist = toIST(new Date(ms));
  return `${ist.getUTCFullYear()}-${pad(ist.getUTCMonth() + 1)}-${pad(ist.getUTCDate())} ${pad(ist.getUTCHours())}:${pad(ist.getUTCMinutes())}`;
}

// Epoch ms to full Indian format: "08-11-2026 01:45 PM"
export function formatMsIndian(ms) {
  if (!ms && ms !== 0) return '-';
  const ist = toIST(new Date(ms));
  const h24 = ist.getUTCHours();
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  return `${pad(ist.getUTCDate())}-${pad(ist.getUTCMonth() + 1)}-${ist.getUTCFullYear()} ${pad(h24 % 12 || 12)}:${pad(ist.getUTCMinutes())} ${ampm}`;
}

// IST day key: "2026-11-06"
export function istDayKey(date) {
  const ist = toIST(date);
  return `${ist.getUTCFullYear()}-${pad(ist.getUTCMonth() + 1)}-${pad(ist.getUTCDate())}`;
}

// Day key to full Indian format: "06-11-2026"
export function formatDayKeyIndian(dayKey) {
  const [y, m, d] = dayKey.split('-');
  return y && m && d ? `${d}-${m}-${y}` : dayKey;
}

// Day key to short axis label: "06-11"
export function formatDayKeyShort(dayKey) {
  const [y, m, d] = dayKey.split('-');
  return y && m && d ? `${d}-${m}` : dayKey;
}
