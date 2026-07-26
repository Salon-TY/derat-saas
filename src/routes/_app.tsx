import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { useCurrentRole, useMyPoste, useSettings } from "@/lib/queries";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sessionReady, setSessionReady] = useState(false);
  const { data: role } = useCurrentRole();
  const { data: myPoste } = useMyPoste();
  const { data: settings } = useSettings();

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (!data.session) {
        navigate({ to: "/auth", replace: true });
      } else {
        setSessionReady(true);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "SIGNED_OUT") {
        setSessionReady(false);
        navigate({ to: "/auth", replace: true });
      } else if (event === "SIGNED_IN" && session) {
        setSessionReady(true);
      } else if (event === "TOKEN_REFRESHED" && session) {
        setSessionReady(true);
      }
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, [navigate]);

  const posteResolved = role !== undefined && myPoste !== undefined;
  const settingsResolved = settings !== undefined;
  const isTechnician = role !== undefined && role !== "owner" && myPoste === "technicien";

  // Société pas encore configurée (nom vide) : ne concerne que le propriétaire,
  // les employés rejoignent une société déjà configurée par leur patron.
  const isOnboardingRoute = location.pathname === "/onboarding";
  const needsOnboarding = role === "owner" && settingsResolved && !settings?.nom?.trim();

  // Un technicien ne doit JAMAIS rendre l'interface admin, même une fraction
  // de seconde : il a sa propre interface (/tech/*). On attend la résolution
  // du rôle/poste avant de rendre quoi que ce soit.
  useEffect(() => {
    if (sessionReady && posteResolved && isTechnician) {
      navigate({ to: "/tech", replace: true });
    }
  }, [sessionReady, posteResolved, isTechnician, navigate]);

  useEffect(() => {
    if (sessionReady && posteResolved && settingsResolved && needsOnboarding && !isOnboardingRoute) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [sessionReady, posteResolved, settingsResolved, needsOnboarding, isOnboardingRoute, navigate]);

  if (
    !sessionReady ||
    !posteResolved ||
    !settingsResolved ||
    isTechnician ||
    (needsOnboarding && !isOnboardingRoute)
  ) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="text-sm text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
