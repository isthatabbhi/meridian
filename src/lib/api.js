const API_URL = 'https://tracker.isthatabbhi.tech/api/stats';

export async function fetchStats() {
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data.ok) throw new Error('API returned ok:false');
  return data;
}
