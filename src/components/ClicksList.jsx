import { useMemo } from 'react';

export default function ClicksList({ data, loading }) {
  const links = useMemo(() => {
    if (!data?.projectClicksByLink) return [];
    return Object.entries(data.projectClicksByLink).sort((a, b) => b[1] - a[1]);
  }, [data]);

  const max = useMemo(
    () => Math.max(1, ...links.map(([, v]) => v)),
    [links]
  );

  if (loading && !data) {
    return (
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 animate-pulse">
        <div className="h-4 bg-[var(--surface-2)] rounded w-40 mb-4" />
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="h-4 bg-[var(--surface-2)] rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl">
      <div className="px-5 py-3.5 border-b border-[var(--border)]">
        <h2 className="text-sm font-medium text-[var(--text-2)]">Project clicks by link</h2>
      </div>
      <div className="p-5 space-y-3">
        {links.length === 0 ? (
          <p className="text-xs text-[var(--faint)]">No data yet</p>
        ) : (
          links.map(([url, count]) => (
            <div key={url}>
              <div className="flex items-center justify-between mb-1">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={url}
                  className="text-xs text-[#2f7cf6] hover:underline truncate max-w-[85%]"
                >
                  {shorten(url)}
                </a>
                <span className="text-xs text-[var(--text-2)] font-medium tabular-nums ml-2 shrink-0">
                  {count.toLocaleString()}
                </span>
              </div>
              <div className="h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#2f7cf6] transition-all duration-500"
                  style={{ width: `${(count / max) * 100}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function shorten(url) {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/^\//, '');
    const display = `${u.hostname}/${path}`;
    return display.length > 50 ? display.slice(0, 47) + '…' : display;
  } catch {
    return url.length > 50 ? url.slice(0, 47) + '…' : url;
  }
}
