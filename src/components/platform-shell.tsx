import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Building2, ClipboardList, LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { PUBLIC_BRAND_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

const platformNavigation = [
  { to: "/platform", label: "Vue d’ensemble", icon: LayoutDashboard, exact: true },
  { to: "/platform/demandes", label: "Demandes", icon: ClipboardList },
  { to: "/platform/entreprises", label: "Entreprises", icon: Building2 },
];

export function PlatformShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();

  function isActive(item: (typeof platformNavigation)[number]) {
    return item.exact
      ? location.pathname === item.to
      : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
  }

  async function signOut() {
    await supabase.auth.signOut({ scope: "local" });
    navigate({ to: "/connexion", replace: true });
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-[#10271d] text-white lg:sticky lg:top-0 lg:flex lg:h-screen">
        <Link
          to="/platform"
          className="flex h-[76px] items-center gap-3 border-b border-white/10 px-5"
        >
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-accent text-white">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-black tracking-[0.12em]">{PUBLIC_BRAND_NAME}</span>
            <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.18em] text-accent">
              Administration SaaS
            </span>
          </span>
        </Link>
        <nav className="flex-1 space-y-1.5 p-4" aria-label="Administration SaaS">
          {platformNavigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-xl px-4 text-sm font-semibold transition-colors",
                  isActive(item)
                    ? "bg-accent text-white"
                    : "text-white/65 hover:bg-white/8 hover:text-white",
                )}
              >
                <Icon className="h-4.5 w-4.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={signOut}
          className="m-4 flex min-h-11 items-center gap-3 rounded-xl px-4 text-sm font-semibold text-white/65 hover:bg-white/8 hover:text-white"
        >
          <LogOut className="h-4.5 w-4.5" />
          Déconnexion
        </button>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b bg-[#10271d] text-white lg:bg-card lg:text-foreground">
          <div className="mx-auto flex min-h-[68px] max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:min-h-[76px] lg:px-8">
            <Link to="/platform" className="inline-flex items-center gap-3 lg:hidden">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-accent">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-black tracking-[0.12em]">
                  {PUBLIC_BRAND_NAME}
                </span>
                <span className="block text-[8px] uppercase tracking-widest text-white/55">
                  Administration SaaS
                </span>
              </span>
            </Link>
            <div className="hidden lg:block">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">
                Plateforme
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Validation des entreprises et contrôle des accès
              </p>
            </div>
            <button
              type="button"
              onClick={signOut}
              className="grid h-11 w-11 place-items-center rounded-xl hover:bg-white/10 lg:hover:bg-muted"
              aria-label="Se déconnecter"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        <main className="pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-12">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
        </main>

        <nav
          className="fixed inset-x-0 bottom-0 z-30 border-t bg-card lg:hidden"
          style={{
            paddingBottom: "env(safe-area-inset-bottom)",
            boxShadow: "var(--shadow-nav)",
          }}
          aria-label="Administration SaaS mobile"
        >
          <div className="grid grid-cols-3">
            {platformNavigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex min-h-16 flex-col items-center justify-center gap-1.5 px-1 text-[9px] font-semibold",
                    active ? "text-accent" : "text-muted-foreground",
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
