import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { useCurrentRole, useMyPoste, useSettings } from "@/lib/queries";
import { destinationForPlatformContext, getCurrentPlatformContext } from "@/lib/platform/access";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const navigate = useNavigate();
  const [accessReady, setAccessReady] = useState(false);
  const [accessError, setAccessError] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function verifyAccess() {
      try {
        const context = await getCurrentPlatformContext();
        if (!mounted) return;
        const destination = destinationForPlatformContext(context);
        if (destination !== "/app") {
          navigate({ to: destination, replace: true });
          return;
        }
        setAccessError(false);
        setAccessReady(true);
      } catch {
        if (mounted) {
          setAccessReady(false);
          setAccessError(true);
        }
      }
    }

    void verifyAccess();
    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (!mounted) return;
      if (event === "SIGNED_OUT") {
        setAccessReady(false);
        navigate({ to: "/connexion", replace: true });
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        void verifyAccess();
      }
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [navigate]);

  if (accessError) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4">
        <div className="max-w-md text-center">
          <p className="font-bold">Impossible de vérifier votre accès.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Réessayez dans quelques instants ou contactez l’administrateur de la plateforme.
          </p>
        </div>
      </div>
    );
  }

  if (!accessReady) {
    return <AppLoading />;
  }

  return <ActiveAppLayout />;
}

function ActiveAppLayout() {
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
        navigate({ to: "/connexion", replace: true });
      } else {
        setSessionReady(true);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "SIGNED_OUT") {
        setSessionReady(false);
        navigate({ to: "/connexion", replace: true });
      } else if (event === "SIGNED_IN" && session) {
        setSessionReady(true);
      } else if (event === "TOKEN_REFRESHED" && session) {
        setSessionReady(true);
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  // Une requête lancée avant l'attachement effectif de la session peut se
  // résoudre "avec succès" sur un résultat vide (RLS sans session ⇒ zéro ligne,
  // pas une erreur), ce qui ressemble à tort à une société non configurée. On
  // ne fait donc confiance au rôle/poste/réglages qu'une fois qu'on les a
  // explicitement redemandés après confirmation de la session.
  useEffect(() => {
    if (!sessionReady) {
      setDataConfirmed(false);
      return;
    }
    let cancelled = false;
    Promise.all([roleQuery.refetch(), posteQuery.refetch(), settingsQuery.refetch()]).then(() => {
      if (!cancelled) setDataConfirmed(true);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionReady]);

  const role = roleQuery.data;
  const myPoste = posteQuery.data;
  const settings = settingsQuery.data;

  // undefined = requête pas encore résolue (on attend) ; une valeur définie
  // (y compris null) = résolue pour de vrai, on peut décider.
  const dataReady =
    dataConfirmed && role !== undefined && myPoste !== undefined && settings !== undefined;

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

  if (!sessionReady || !dataReady || isTechnician || (needsOnboarding && !isOnboardingRoute)) {
    return <AppLoading />;
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

function AppLoading() {
  return (
    <div className="grid min-h-screen place-items-center bg-background">
      <div className="text-sm text-muted-foreground">Chargement...</div>
    </div>
  );
}
