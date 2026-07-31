// Sidebar desktop — nouveau composant, volontairement simple plutôt qu'une
// adoption de src/components/ui/sidebar.tsx (le sidebar shadcn vendu par
// défaut) : ce dernier bascule en tiroir (Sheet) sur mobile, ce qui contredit
// directement la règle du projet ("aucun tiroir obligatoire pour la
// navigation principale sur mobile"). Ici, la navigation mobile reste
// exclusivement la bottom nav existante ; cette Sidebar ne s'affiche jamais
// en dessous de lg (≥1024px) et n'a donc pas besoin de logique de repli.
// Purement présentationnel : reçoit ses entrées en props (déjà filtrées par
// permission par le shell appelant), ne décide d'aucune permission.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Link, useLocation } from "@tanstack/react-router";
import { Bug, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/brand";

export type SidebarNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  badgeCount?: number;
};

function SidebarLink({ item, active }: { item: SidebarNavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to as any}
      className={cn(
        "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
        active
          ? "bg-primary text-primary-foreground shadow-soft"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon
        className={cn(
          "h-5 w-5 shrink-0 transition-all duration-200",
          active ? "stroke-[2.2]" : "stroke-[1.8]",
        )}
      />
      <span className="truncate">{item.label}</span>
      {!!item.badgeCount && item.badgeCount > 0 && (
        <span
          className={cn(
            "ml-auto flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-bold",
            active ? "bg-white/20" : "bg-destructive text-destructive-foreground",
          )}
        >
          {item.badgeCount}
        </span>
      )}
    </Link>
  );
}

export function Sidebar({
  primaryItems,
  secondaryItems,
  brandName,
  logoUrl,
}: {
  primaryItems: SidebarNavItem[];
  secondaryItems?: SidebarNavItem[];
  brandName?: string | null;
  logoUrl?: string | null;
}) {
  const location = useLocation();

  function isActive(item: SidebarNavItem) {
    return item.exact
      ? location.pathname === item.to
      : location.pathname === item.to || location.pathname.startsWith(item.to + "/");
  }

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border/60 bg-card lg:sticky lg:top-0 lg:flex lg:h-screen">
      <Link to="/app" className="flex h-[72px] items-center gap-3 border-b border-border/60 px-5">
        <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-accent shadow-soft">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="h-full w-full object-contain" />
          ) : (
            <Bug className="h-5 w-5 text-white" />
          )}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-bold tracking-tight">{brandName || APP_NAME}</div>
          <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
            Espace professionnel
          </div>
        </div>
      </Link>
      <nav className="flex flex-1 flex-col gap-1.5 overflow-y-auto p-4">
        {primaryItems.map((item) => (
          <SidebarLink key={item.to} item={item} active={isActive(item)} />
        ))}
        {!!secondaryItems?.length && (
          <>
            <div className="my-2 border-t border-border/50" />
            {secondaryItems.map((item) => (
              <SidebarLink key={item.to} item={item} active={isActive(item)} />
            ))}
          </>
        )}
      </nav>
    </aside>
  );
}
