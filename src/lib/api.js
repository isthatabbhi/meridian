const API_URL = 'https://tracker.isthatabbhi.tech/api/stats';
/* Demo snapshot: the last recorded stats, aggregated from the KV
   day keys on 2026-11-10 (407 events). Used only when the live
   /api/stats fetch fails (the KV list quota is exhausted until
   11 Nov 5:30 AM IST). Once the quota resets and the live endpoint
   answers again, the dashboard resumes live data automatically,
   because the live fetch is tried first on every poll. The demo
   payload is marked demo:true so the UI can label it. */
const DEMO_URL = '/demo-stats.json';

export async function fetchStats() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.ok) throw new Error('API returned ok:false');
    return data;
  } catch (liveErr) {
    const demoRes = await fetch(DEMO_URL);
    if (!demoRes.ok) throw liveErr;
    const demo = await demoRes.json();
    return { ...demo, demo: true };
  }
}
