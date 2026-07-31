import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Bug, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { APP_NAME, PUBLIC_BRAND_NAME } from "@/lib/brand";
import { resolveSignedInDestination } from "@/lib/platform/access";
import { usernameToEmail } from "@/lib/team";

export const Route = createFileRoute("/connexion")({
  head: () => ({ meta: [{ title: `Connexion — ${PUBLIC_BRAND_NAME}` }] }),
  component: ConnexionPage,
});

function ConnexionPage() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      if (!data.session) {
        setCheckingSession(false);
        return;
      }
      try {
        navigate({ to: await resolveSignedInDestination(), replace: true });
      } catch {
        setCheckingSession(false);
        toast.error("Impossible de vérifier le statut de votre accès.");
      }
    });
    return () => {
      active = false;
    };
  }, [navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const value = identifier.trim();
      const email = value.includes("@") ? value : usernameToEmail(value);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate({ to: await resolveSignedInDestination(), replace: true });
    } catch {
      await supabase.auth.signOut({ scope: "local" });
      toast.error("Identifiant, mot de passe ou statut d’accès incorrect.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-primary px-4 py-10">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(232,128,10,0.22),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.1),transparent_32%)]"
      />
      <div className="relative w-full max-w-md">
        <Link
          to="/"
          className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-primary-foreground/75 transition-colors hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au site
        </Link>
        <Card className="border-white/10 shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent text-accent-foreground shadow-lg shadow-accent/25">
              <Bug className="h-7 w-7" />
            </div>
            <p className="mt-3 text-xs font-bold uppercase tracking-[0.2em] text-accent">
              {PUBLIC_BRAND_NAME}
            </p>
            <CardTitle className="text-2xl tracking-tight">Connexion</CardTitle>
            <CardDescription>Accédez à votre espace {APP_NAME}</CardDescription>
          </CardHeader>
          <CardContent>
            {checkingSession ? (
              <div className="flex min-h-52 items-center justify-center text-sm text-muted-foreground">
                Vérification de votre session…
              </div>
            ) : (
              <>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="identifier">Identifiant ou email</Label>
                    <Input
                      id="identifier"
                      type="text"
                      required
                      value={identifier}
                      onChange={(event) => setIdentifier(event.target.value)}
                      autoComplete="username"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Mot de passe</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="current-password"
                      className="h-11"
                    />
                  </div>
                  <Button type="submit" className="min-h-11 w-full" disabled={loading}>
                    {loading ? "Vérification…" : "Se connecter"}
                  </Button>
                </form>
                <div className="mt-5 rounded-2xl bg-muted/70 p-4 text-sm text-muted-foreground">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <p>
                      L’accès à la plateforme est validé manuellement. Aucun rôle ni entreprise ne
                      peut être choisi depuis cet écran.
                    </p>
                  </div>
                </div>
                <Button asChild variant="outline" className="mt-4 min-h-11 w-full">
                  <Link to="/demande-acces">Demander un accès</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
