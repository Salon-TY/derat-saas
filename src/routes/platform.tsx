import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { PlatformShell } from "@/components/platform-shell";
import { destinationForPlatformContext, getCurrentPlatformContext } from "@/lib/platform/access";

export const Route = createFileRoute("/platform")({
  component: PlatformLayout,
});

function PlatformLayout() {
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getCurrentPlatformContext()
      .then((context) => {
        if (!active) return;
        if (context.platformAdmin) {
          setAllowed(true);
          return;
        }
        navigate({
          to: destinationForPlatformContext(context),
          replace: true,
        });
      })
      .catch(() => {
        if (active) setError("Impossible de vérifier les droits d’administration.");
      });
    return () => {
      active = false;
    };
  }, [navigate]);

  if (!allowed) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4">
        <div className="text-center text-sm text-muted-foreground">
          {error ?? "Vérification de l’accès plateforme…"}
        </div>
      </div>
    );
  }

  return (
    <PlatformShell>
      <Outlet />
    </PlatformShell>
  );
}
