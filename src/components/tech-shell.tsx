// Shell dédié aux techniciens — indépendant de app-shell.tsx.
// Volontairement minimal : 3 entrées de navigation, aucun accès aux pages
// admin (recherche, FAB de création, menu "Plus", paramètres, factures…).
// Toujours en navigation du bas, y compris sur grand écran : outil de terrain
// dédié, pas de sidebar (cf. décision d'architecture Phase B).
import { useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, ClipboardList, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSettings, useMyTodoCount } from "@/lib/queries";
import { Header } from "@/components/header";
import { BottomNav } from "@/components/bottom-nav";

const techNavItems: { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean }[] = [
  { to: "/tech", label: "Ma journée", icon: LayoutDashboard, exact: true },
  { to: "/tech/chantiers", label: "Mes chantiers", icon: ClipboardList },
  { to: "/tech/camion", label: "Mon camion", icon: Truck },
];

export function TechShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: settings } = useSettings();
  const { data: todoCount = 0 } = useMyTodoCount();

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut({ scope: "local" });
    toast.success("Déconnecté");
    navigate({ to: "/auth", replace: true });
  }

  const navItems = techNavItems.map((item) => ({
    ...item,
    badgeCount: item.to === "/tech/chantiers" ? todoCount : undefined,
  }));

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header
        settings={settings}
        tagline="Espace technicien"
        onSignOut={handleSignOut}
      />

      <main className="flex-1 pb-24">
        <div className="mx-auto max-w-3xl px-4 py-6 animate-in-up">
          {children}
        </div>
      </main>

      <BottomNav items={navItems} />
    </div>
  );
}
