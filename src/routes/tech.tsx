import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentRole, useMyPoste } from "@/lib/queries";
import { TechShell } from "@/components/tech-shell";
import { destinationForPlatformContext, getCurrentPlatformContext } from "@/lib/platform/access";

export const Route = createFileRoute("/tech")({
  component: TechLayout,
});

function TechLayout() {
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
        if (destination !== "/tech") {
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
      <div className="grid min-h-screen place-items-center bg-background px-4 text-center">
        <div>
          <p className="font-bold">Impossible de vérifier votre accès.</p>
          <p className="mt-2 text-sm text-muted-foreground">Réessayez dans quelques instants.</p>
        </div>
      </div>
    );
  }

  if (!accessReady) {
    return <TechLoading />;
  }

  return <ActiveTechLayout />;
}

function ActiveTechLayout() {
  const navigate = useNavigate();
  const [sessionReady, setSessionReady] = useState(false);
  const { data: role } = useCurrentRole();
  const { data: myPoste } = useMyPoste();

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
      } else if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session) {
        setSessionReady(true);
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  const posteResolved = role !== undefined && myPoste !== undefined;
  const isTechnician = role !== undefined && role !== "owner" && myPoste === "technicien";

  // Un non-technicien (owner, bureau) ne doit jamais voir l'interface
  // technicien — retour à l'interface admin.
  useEffect(() => {
    if (sessionReady && posteResolved && !isTechnician) {
      navigate({ to: "/app", replace: true });
    }
  }, [sessionReady, posteResolved, isTechnician, navigate]);

  if (!sessionReady || !posteResolved || !isTechnician) {
    return <TechLoading />;
  }

  return (
    <TechShell>
      <Outlet />
    </TechShell>
  );
}

function TechLoading() {
  return (
    <div className="grid min-h-screen place-items-center bg-background">
      <div className="text-sm text-muted-foreground">Chargement...</div>
    </div>
  );
}
