import { ReactNode } from "react";
import { Tabs, cn, type TabsItem } from "@cloudflare/kumo";

export const KUMO_PAGE_HEADER_VARIANTS = {
  spacing: {
    compact: {
      classes: "gap-1",
      description: "Compact spacing between header elements",
    },
    base: {
      classes: "gap-2",
      description: "Default spacing between header elements",
    },
    relaxed: {
      classes: "gap-4",
      description: "Relaxed spacing for more prominent headers",
    },
  },
} as const;

export const KUMO_PAGE_HEADER_DEFAULT_VARIANTS = {
  spacing: "base",
} as const;

export type KumoPageHeaderSpacing =
  keyof typeof KUMO_PAGE_HEADER_VARIANTS.spacing;

export interface KumoPageHeaderVariantsProps {
  spacing?: KumoPageHeaderSpacing;
}

export function pageHeaderVariants({
  spacing = KUMO_PAGE_HEADER_DEFAULT_VARIANTS.spacing,
}: KumoPageHeaderVariantsProps = {}) {
  return cn(
    "flex flex-col",
    KUMO_PAGE_HEADER_VARIANTS.spacing[spacing].classes,
  );
}

export interface PageHeaderProps extends KumoPageHeaderVariantsProps {
  /* Meridian customisation: breadcrumbs are optional (Meridian has
     none) and render nothing when absent. The original block required
     them and always rendered a bordered row. */
  breadcrumbs?: ReactNode;
  title?: string;
  description?: string;
  tabs?: TabsItem[];
  defaultTab?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children?: React.ReactNode;
  /* Meridian customisation: content rendered before the title, e.g.
     the mobile hamburger. The original block had no leading slot. */
  leading?: ReactNode;
}

export function PageHeader({
  breadcrumbs,
  title,
  description,
  tabs,
  defaultTab,
  onValueChange,
  spacing = "base",
  className,
  children,
  leading,
}: PageHeaderProps) {
  return (
    <div className={cn(pageHeaderVariants({ spacing }), className)}>
      {breadcrumbs && <div className="border-b border-kumo-line">{breadcrumbs}</div>}

      {(title || description || children) && (
        /* Meridian customisation: the title row carries the actions
           (children) on the right. The original block only rendered
           children inside the tabs row, so a header without tabs
           showed no actions. Title sized to Meridian's header
           (20px / 22px), not the block's 3xl. */
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {leading}
            <div className="flex flex-col gap-2 min-w-0">
              {title && (
                <h1 className="text-[22px] leading-7 tracking-[-0.015em] font-semibold text-[var(--text)] truncate">
                  {title}
                </h1>
              )}
              {description && (
                <p className="max-w-prose text-base text-kumo-subtle">
                  {description}
                </p>
              )}
            </div>
          </div>
          {children && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">{children}</div>
          )}
        </div>
      )}

      {tabs && (
        <div className="flex w-full items-center justify-between border-b border-kumo-line pt-1 pb-3 pl-3">
          <Tabs
            tabs={tabs}
            selectedValue={defaultTab}
            onValueChange={(nextValue) => {
              const stringValue = String(nextValue);
              onValueChange?.(stringValue);
            }}
          />
        </div>
      )}
    </div>
  );
}
