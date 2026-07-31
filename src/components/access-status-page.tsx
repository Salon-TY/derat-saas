import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Ban, Bug, Clock3, LogOut, PauseCircle, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { PUBLIC_BRAND_NAME } from "@/lib/brand";
import { destinationForPlatformContext, getCurrentPlatformContext } from "@/lib/platform/access";

const icons = {
  pending: Clock3,
  rejected: Ban,
  suspended: PauseCircle,
} satisfies Record<string, LucideIcon>;

export function AccessStatusPage({
  tone,
  title,
  description,
  details,
}: {
  tone: keyof typeof icons;
  title: string;
  description: string;
  details: string;
}) {
  const navigate = useNavigate();
  const [signedIn, setSignedIn] = useState(false);
  const Icon = icons[tone];

  useEffect(() => {
    let mounted = true;
    getCurrentPlatformContext()
      .then((context) => {
        if (!mounted) return;
        setSignedIn(context.authenticated);
        if (!context.authenticated) return;

        const matchesPage =
          (tone === "pending" && context.status === "pending") ||
          (tone === "rejected" &&
            (context.status === "rejected" || context.status === "cancelled")) ||
          (tone === "suspended" && context.status === "suspended");
        if (!matchesPage) {
          navigate({
            to: destinationForPlatformContext(context),
            replace: true,
          });
        }
      })
      .catch(() => {
        if (mounted) setSignedIn(false);
      });
    return () => {
      mounted = false;
    };
  }, [navigate, tone]);

  async function signOut() {
    await supabase.auth.signOut({ scope: "local" });
    navigate({ to: "/", replace: true });
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-primary px-4 py-10">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(232,128,10,0.2),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.1),transparent_30%)]"
      />
      <section className="relative w-full max-w-xl rounded-[28px] border border-white/10 bg-card p-6 text-center shadow-2xl sm:p-10">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground">
          <Bug className="h-7 w-7" />
        </div>
        <p className="mt-4 text-xs font-black uppercase tracking-[0.2em] text-accent">
          {PUBLIC_BRAND_NAME}
        </p>
        <span
          className={`mx-auto mt-7 grid h-16 w-16 place-items-center rounded-full ${
            tone === "pending"
              ? "bg-warning/15 text-warning-foreground"
              : "bg-destructive/10 text-destructive"
          }`}
        >
          <Icon className="h-8 w-8" />
        </span>
        <h1 className="mt-5 text-3xl font-black tracking-tight">{title}</h1>
        <p className="mx-auto mt-3 max-w-md text-base leading-7 text-muted-foreground">
          {description}
        </p>
        <div className="mt-6 rounded-2xl bg-muted/70 p-4 text-left text-sm leading-6 text-muted-foreground">
          {details}
        </div>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild variant="outline" className="min-h-11">
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour au site
            </Link>
          </Button>
          {signedIn ? (
            <Button onClick={signOut} className="min-h-11">
              <LogOut className="mr-2 h-4 w-4" />
              Se déconnecter
            </Button>
          ) : (
            <Button asChild className="min-h-11">
              <Link to="/connexion">Se connecter</Link>
            </Button>
          )}
        </div>
      </section>
    </main>
  );
}
