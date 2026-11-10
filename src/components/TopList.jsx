import { useState } from 'react';
import { LayerCard } from "@cloudflare/kumo/components/layer-card";
import { Tooltip } from "@cloudflare/kumo/components/tooltip";
import { Meter } from "@cloudflare/kumo/components/meter";

/* Small icon buttons that appear on a row when it is hovered, like
   Cloudflare's Top N tables (verified live 2026-11-10): Filter
   (funnel), Exclude (circle with a slash), Copy (copy icon). Copy
   copies the row label to the clipboard. Filter narrows the table to
   that row only; Exclude hides that row. Clicking the active Filter
   again, or the "Clear" chip, restores the full list. */
function FilterIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 2h14l-5.5 6.5V14l-3-1.5V8.5L1 2z" />
    </svg>
  );
}
function ExcludeIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="8" cy="8" r="6.5" />
      <path d="M3.5 3.5l9 9" />
    </svg>
  );
}
function CopyIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
      <path d="M10.5 5.5v-3a1.5 1.5 0 0 0-1.5-1.5H4A1.5 1.5 0 0 0 2.5 2.5v5A1.5 1.5 0 0 0 4 9h1.5" />
    </svg>
  );
}

export default function TopList({ title, items }) {
  const maxCount = items.length > 0 ? Math.max(...items.map((i) => i.count)) : 1;
  const [filterLabel, setFilterLabel] = useState(null);
  const [excluded, setExcluded] = useState(() => new Set());
  const [copiedLabel, setCopiedLabel] = useState(null);

  const visible = items.filter((i) => {
    if (filterLabel && i.label !== filterLabel) return false;
    if (excluded.has(i.label)) return false;
    return true;
  });

  const copyLabel = async (label) => {
    try {
      await navigator.clipboard.writeText(label);
      setCopiedLabel(label);
      setTimeout(() => setCopiedLabel((c) => (c === label ? null : c)), 1500);
    } catch {}
  };

  return (
    <LayerCard className="rounded-[12px] flex flex-col h-full">
      <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between gap-2">
        <p className="text-[12px] text-[var(--muted)]">{title}</p>
        {filterLabel && (
          <button
            onClick={() => setFilterLabel(null)}
            className="text-[11px] text-[var(--accent)] hover:underline cursor-pointer"
            title="Clear filter"
          >
            Clear filter
          </button>
        )}
      </div>
      <div className="px-5 py-3 flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <p className="text-[12px] text-[var(--faint)] py-4 text-center">No data</p>
        ) : visible.length === 0 ? (
          <p className="text-[12px] text-[var(--faint)] py-4 text-center">
            {filterLabel ? 'No rows match the filter' : 'All rows excluded'}
            <button
              onClick={() => { setFilterLabel(null); setExcluded(new Set()); }}
              className="block mx-auto mt-1 text-[11px] text-[var(--accent)] hover:underline cursor-pointer"
            >
              Reset
            </button>
          </p>
        ) : (
          <div>
            {visible.map((item, i) => {
              const barPct = (item.count / maxCount) * 100;
              const isFiltered = filterLabel === item.label;
              return (
                <div key={i} className="group flex items-center gap-3 rounded-[6px] px-2 py-1.5 -mx-2 hover:bg-[var(--surface-2)] transition-colors">
                  {/* Label left-justified, meter on the right. The outer
                      div is the flex child so the label always stretches
                      full width and left-aligns; the tooltip only shows
                      the full label on hover. Row keeps its 28px pitch
                      (py-2 + 16px line). */}
                  <div className="flex-1 min-w-0 text-left">
                    <Tooltip content={item.label} side="top" className="block w-full text-left">
                      <span className="block text-left text-[12px] leading-4 text-[var(--text-2)] truncate hover:text-white transition-colors">
                        {item.label}
                      </span>
                    </Tooltip>
                  </div>
                  {/* Kumo Meter as the bar. The row carries its own
                      label and count, so the Meter's label/value
                      header is hidden by .meter-bar-only in index.css
                      and only the 8px track shows. The indicator
                      gradient stops are overridden to the exact
                      Meridian blue so the bar matches the old div. */}
                  <Meter
                    label={item.label}
                    showValue={false}
                    value={barPct}
                    className="meter-bar-only w-[160px] shrink-0"
                    trackClassName="bg-[var(--surface-2)]"
                    indicatorClassName="from-[#2f7cf6] via-[#2f7cf6] to-[#2f7cf6]"
                  />
                  <span className="text-[12px] leading-4 text-[var(--text)] tabular-nums w-[40px] text-right shrink-0">
                    {item.count}
                  </span>
                  {/* Row hover actions, like Cloudflare's Top N tables:
                      Filter, Exclude, Copy. Hidden until the row is
                      hovered (opacity-0 group-hover:opacity-100). */}
                  <span className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setFilterLabel(isFiltered ? null : item.label)}
                      className={`p-1 rounded-[4px] cursor-pointer ${isFiltered ? 'text-[var(--accent)] bg-[var(--surface-2)]' : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]'}`}
                      title={isFiltered ? 'Clear filter' : 'Filter to this row'}
                      aria-label="Filter to this row"
                    >
                      <FilterIcon />
                    </button>
                    <button
                      onClick={() => setExcluded((prev) => { const next = new Set(prev); next.add(item.label); return next; })}
                      className="p-1 rounded-[4px] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] cursor-pointer"
                      title="Exclude this row"
                      aria-label="Exclude this row"
                    >
                      <ExcludeIcon />
                    </button>
                    <button
                      onClick={() => copyLabel(item.label)}
                      className="p-1 rounded-[4px] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] cursor-pointer"
                      title={copiedLabel === item.label ? 'Copied!' : 'Copy label'}
                      aria-label="Copy label"
                    >
                      <CopyIcon />
                    </button>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </LayerCard>
  );
}
