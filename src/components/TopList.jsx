import { useState, useEffect, useRef } from 'react';
import { LayerCard } from "@cloudflare/kumo/components/layer-card";
import { Tooltip } from "@cloudflare/kumo/components/tooltip";
import { Meter } from "@cloudflare/kumo/components/meter";
import { Text } from "@cloudflare/kumo/components/text";
import { useScrollEscape } from '../lib/use-scroll-escape';

/* Small icon buttons that appear on a row when it is hovered, like
   Cloudflare's Top N tables (verified live 2026-11-10): Filter
   (funnel), Exclude (circle with a slash), Copy (copy icon). Copy
   copies the row label to the clipboard. Filter narrows the table to
   that row only; Exclude hides that row. Clicking the active Filter
   again, or the "Clear" chip, restores the full list. */
function FilterIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="m1.774 3.72.37-.836h11.711l.371.836-4.649 5.135v3.26l-.214.411-2.155 1.5-.785-.41V8.855L1.773 3.72Zm1.498.164 4.021 4.443.13.335v3.997l1.154-.804V8.662l.13-.335 4.021-4.443H3.272Z" fill-rule="evenodd"/></svg>
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
    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M14 1.5H6l-.5.5v2.5h1v-2h7v7h-2v1H14l.5-.5V2l-.5-.5z"/><path d="M2 5.5l-.5.5v8l.5.5h8l.5-.5V6l-.5-.5H2zm7.5 8h-7v-7h7v7z"/></svg>
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

  /* Scroll capture only when the list actually overflows the card
     (user order 2026-11-10): a card whose rows all fit has no
     scrollbar, so the wheel should scroll the page normally.
     Measure the real scrollHeight vs clientHeight, so filter /
     exclude changes that shrink the list release the capture. */
  const listRef = useRef(null);
  const [needsScroll, setNeedsScroll] = useState(false);
  /* Scroll escape (user order 2026-11-12): only when the user is
     forcibly pushing past the list, 5 boundary pushes scroll the
     whole page. Normal list scrolling is untouched. */
  useScrollEscape(listRef, needsScroll);
  /* Whether the list is scrolled down (user order 2026-11-10):
     when scrolling, the top row must not hard-touch the top line,
     so a top fade is shown only while scrollTop > 0. At rest the
     first row sits on its own top padding, fully visible. */
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const check = () => setNeedsScroll(el.scrollHeight > el.clientHeight + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [visible.length, items.length]);

  const copyLabel = async (label) => {
    try {
      await navigator.clipboard.writeText(label);
      setCopiedLabel(label);
      setTimeout(() => setCopiedLabel((c) => (c === label ? null : c)), 1500);
    } catch {}
  };

  return (
    <LayerCard className="rounded-[12px] flex flex-col h-[250px] pb-4">
      <div className="px-5 py-4 border-b border-[var(--cf-border-chrome)] flex items-center justify-between gap-2">
        <Text variant="secondary" size="xs" bold>{title}</Text>
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
      <div ref={listRef} {...(needsScroll ? { 'data-lenis-prevent': true } : {})} onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 0)} className={`px-5 pt-5 pb-5 flex-1 overflow-y-auto thin-scroll${needsScroll ? ' overscroll-contain' : ''}`} style={needsScroll ? { maskImage: scrolled ? 'linear-gradient(to bottom, transparent 0, black 28px, black calc(100% - 28px), transparent 100%)' : 'linear-gradient(to bottom, black calc(100% - 28px), transparent 100%)', WebkitMaskImage: scrolled ? 'linear-gradient(to bottom, transparent 0, black 28px, black calc(100% - 28px), transparent 100%)' : 'linear-gradient(to bottom, black calc(100% - 28px), transparent 100%)' } : undefined}>
        {items.length === 0 ? (
          <p className="text-[12px] leading-4 text-[var(--faint)] py-6 text-center">No data</p>
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
              /* CF meter bars (user order 2026-11-11): the bar length is
                 linear to the max, and even the smallest value shows a
                 visible bar, so floor a nonzero count at 3% of the track
                 (about 5px) instead of rendering 0-1px like CF never
                 does. The label is a fixed 150px, not half the row, so
                 the meter track takes the same large share of the row
                 as CF's Top N tables instead of being squeezed to
                 ~50px. */
              const barPct = item.count > 0 ? Math.max((item.count / maxCount) * 100, 3) : 0;
              const isFiltered = filterLabel === item.label;
              return (
                <div key={i} className="group flex items-center gap-3 rounded-[6px] px-2 py-1.5 -mx-2 h-[28px] hover:bg-[var(--surface-2)] transition-colors">
                  {/* Label left-justified, meter on the right. The outer
                      div is the flex child so the label always stretches
                      full width and left-aligns; the tooltip only shows
                      the full label on hover. Row keeps its 28px pitch
                      (py-2 + 16px line). */}
                  <div className="w-[150px] shrink-0 min-w-0 text-left">
                    <Tooltip content={item.label} side="top" className="block w-full text-left">
                      <span className="block text-left text-[12px] leading-4 font-bold text-[var(--text-2)] truncate hover:text-[var(--text)] transition-colors">
                        {item.label}
                      </span>
                    </Tooltip>
                  </div>
                  {/* Kumo Meter as the bar. The row carries its own
                      label and count, so the Meter's label/value
                      header is hidden by .meter-bar-only in index.css
                      and only the 8px track shows. The indicator
                      fill is forced to --meter-fill (#005AEA) by a
                      .meter-bar-only rule in index.css, because
                      Kumo's Meter drops the custom gradient passed
                      via indicatorClassName and renders the accent
                      instead. */}
                  <Meter
                    label={item.label}
                    showValue={false}
                    value={barPct}
                    className="meter-bar-only flex-1 min-w-0"
                    trackClassName="bg-[var(--cf-bg-track)]"
                    indicatorClassName="from-[var(--meter-fill)] via-[var(--meter-fill)] to-[var(--meter-fill)]"
                  />
                  <span className="text-[12px] leading-4 font-bold text-[var(--text)] tabular-nums w-[40px] text-right shrink-0">
                    {item.count}
                  </span>
                  {/* Row hover actions, like Cloudflare's Top N tables:
                      Filter, Exclude, Copy. They take no layout space
                      until hovered (hidden, not opacity-0), so the
                      meter track stays long; on hover they appear and
                      the meter shrinks to make room. */}
                  <span className="hidden group-hover:flex items-center gap-0.5 shrink-0 transition-opacity">
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
