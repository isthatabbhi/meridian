import { LayerCard } from "@cloudflare/kumo/components/layer-card";
import { Tooltip } from "@cloudflare/kumo/components/tooltip";
import { Meter } from "@cloudflare/kumo/components/meter";

export default function TopList({ title, items }) {
  const maxCount = items.length > 0 ? Math.max(...items.map((i) => i.count)) : 1;

  return (
    <LayerCard className="rounded-[12px] flex flex-col h-full">
      <div className="px-5 py-4 border-b border-[var(--border)]">
        <p className="text-[12px] text-[var(--muted)]">{title}</p>
      </div>
      <div className="px-5 py-3 flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <p className="text-[12px] text-[var(--faint)] py-4 text-center">No data</p>
        ) : (
          <div>
            {items.map((item, i) => {
              const barPct = (item.count / maxCount) * 100;
              return (
                <div key={i} className="flex items-center gap-3 rounded-[6px] px-2 py-1.5 -mx-2 hover:bg-[var(--surface-2)] transition-colors">
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
                </div>
              );
            })}
          </div>
        )}
      </div>
    </LayerCard>
  );
}
