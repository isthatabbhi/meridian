export default function StatusStrip({ data, loading }) {
  if (loading && !data) {
    return (
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 animate-pulse">
        <div className="h-4 bg-[var(--surface-2)] rounded w-48 mb-3" />
        <div className="h-3 bg-[var(--surface-2)] rounded w-full" />
      </div>
    );
  }
  if (!data) return null;

  const segments = [
    { label: 'Pageviews',         count: data.pageviews        ?? 0, color: '#2b7fff' },
    { label: 'Project clicks',    count: data.projectClicks    ?? 0, color: '#8b5cf6' },
    { label: 'Resume downloads',  count: data.resumeDownloads  ?? 0, color: '#f59e0b' },
    { label: 'Contact events',    count: data.contactEvents    ?? 0, color: '#10b981' },
  ];

  const total = segments.reduce((s, seg) => s + seg.count, 0) || 1;

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-[var(--text-2)]">Events breakdown</h2>
        <span className="text-xs text-[var(--muted)]">
          {data.totalEvents ?? 0} total · All-time
        </span>
      </div>

      {/* Segmented bar */}
      <div className="flex h-2.5 rounded-full overflow-hidden bg-[var(--surface-2)] mb-4">
        {segments.map(seg =>
          seg.count > 0 ? (
            <div
              key={seg.label}
              style={{ width: `${(seg.count / total) * 100}%`, backgroundColor: seg.color }}
              className="transition-all duration-500 first:rounded-l-full last:rounded-r-full"
            />
          ) : null
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {segments.map(seg => (
          <div key={seg.label} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
            <span className="text-[var(--muted)]">{seg.label}</span>
            <span className="text-[var(--text)] font-medium">{seg.count.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
