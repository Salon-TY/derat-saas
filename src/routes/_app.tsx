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
  const [dataConfirmed, setDataConfirmed] = useState(false);
  const roleQuery = useCurrentRole();
  const posteQuery = useMyPoste();
  const settingsQuery = useSettings();

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

  // Une requête lancée avant l'attachement effectif de la session peut se
  // résoudre "avec succès" sur un résultat vide (RLS sans session ⇒ zéro ligne,
  // pas une erreur), ce qui ressemble à tort à une société non configurée. On
  // ne fait donc confiance au rôle/poste/réglages qu'une fois qu'on les a
  // explicitement redemandés après confirmation de la session.
  useEffect(() => {
    if (!sessionReady) { setDataConfirmed(false); return; }
    let cancelled = false;
    Promise.all([roleQuery.refetch(), posteQuery.refetch(), settingsQuery.refetch()]).then(() => {
      if (!cancelled) setDataConfirmed(true);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionReady]);

  const role = roleQuery.data;
  const myPoste = posteQuery.data;
  const settings = settingsQuery.data;

  // undefined = requête pas encore résolue (on attend) ; une valeur définie
  // (y compris null) = résolue pour de vrai, on peut décider.
  const dataReady = dataConfirmed && role !== undefined && myPoste !== undefined && settings !== undefined;

  // Un technicien ne doit JAMAIS rendre l'interface admin, même une fraction
  // de seconde : il a sa propre interface (/tech/*). On attend la résolution
  // complète du rôle/poste/réglages avant de rendre quoi que ce soit.
  const isTechnician = dataReady && role !== "owner" && myPoste === "technicien";

  // Société pas encore configurée : ne concerne que le propriétaire, les
  // employés rejoignent une société déjà configurée par leur patron.
  // "settings" null (aucune ligne) ou nom vide/espaces = réellement non
  // configurée ; tant que dataReady est faux on ne décide rien.
  const isOnboardingRoute = location.pathname === "/onboarding";
  const needsOnboarding = dataReady && role === "owner" && (!settings || !settings.nom.trim());

  useEffect(() => {
    if (dataReady && isTechnician) {
      navigate({ to: "/tech", replace: true });
    }
  }, [dataReady, isTechnician, navigate]);

  useEffect(() => {
    if (needsOnboarding && !isOnboardingRoute) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [needsOnboarding, isOnboardingRoute, navigate]);

  if (
    !sessionReady ||
    !dataReady ||
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
