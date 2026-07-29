// Navigation du bas partagée — mobile uniquement (< lg). Avant cette
// extraction, AppShell et TechShell dupliquaient une nav bar quasiment
// identique. Purement présentationnel : reçoit ses entrées en props, ne
// décide d'aucune permission ni logique métier.
import { Link, useLocation } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";

export type BottomNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  badgeCount?: number;
};

export function BottomNav({ items, trailing }: { items: BottomNavItem[]; trailing?: React.ReactNode }) {
  const location = useLocation();
  const columnCount = items.length + (trailing ? 1 : 0);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border/50 bg-card"
      style={{ paddingBottom: "env(safe-area-inset-bottom)", boxShadow: "var(--shadow-nav)" }}
    >
      <div
        className="mx-auto grid max-w-3xl"
        style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.exact
            ? location.pathname === item.to
            : location.pathname === item.to || location.pathname.startsWith(item.to + "/");
          return (
            <Link
              key={item.to}
              to={item.to as any}
              className={`relative flex flex-col items-center justify-center gap-2 py-3 text-[9px] font-medium transition-all duration-200 ${
                active ? "text-accent nav-active" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className={`relative grid h-8 w-8 place-items-center rounded-xl transition-all duration-200 ${active ? "scale-105 bg-accent/12" : ""}`}>
                <Icon className={`h-[18px] w-[18px] transition-all duration-200 ${active ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
                {!!item.badgeCount && item.badgeCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                    {item.badgeCount}
                  </span>
                )}
              </div>
              <span className={active ? "font-bold" : ""}>{item.label}</span>
            </Link>
          );
        })}
        {trailing}
      </div>
    </nav>
  );
}
