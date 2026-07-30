/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link } from "@tanstack/react-router";
import { APP_NAME } from "@/lib/brand";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { useMyTodoCount, useMyVanStock } from "@/lib/queries";
import { STATUTS_INTERVENTION } from "@/lib/schemas";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardList, MapPin, Phone, Package } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tech/")({
  head: () => ({ meta: [{ title: `Ma journée — ${APP_NAME}` }] }),
  component: TechToday,
});

const STATUT_COLORS: Record<string, string> = {
  planifiee: "bg-accent/15 text-accent",
  en_cours: "bg-warning/15 text-warning-foreground",
  realisee: "bg-primary/15 text-primary",
  rapport_transmis: "bg-success/15 text-success",
  annulee: "bg-muted text-muted-foreground",
};

function statutLabel(v: string) {
  return STATUTS_INTERVENTION.find((s) => s.value === v)?.label ?? v;
}

function localDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function useMyTodayInterventions(userId: string | null) {
  return useQuery({
    queryKey: ["tech_today_interventions", userId],
    enabled: !!userId,
    queryFn: async () => {
      const today = localDateStr(new Date());
      const { data, error } = await db
        .from("interventions")
        .select("*, client:clients(raison_sociale, telephone)")
        .eq("technicien_id", userId!)
        .eq("date", today)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
}

function TechToday() {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const { data: todoCount = 0 } = useMyTodoCount();
  const { data: todayInterventions = [], isLoading, isError } = useMyTodayInterventions(userId);
  const { data: vanLevels = [] } = useMyVanStock();
  const lowStock = vanLevels.filter((l) => l.product && l.quantite <= l.product.seuil_alerte);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          Espace terrain
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Ma journée</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Vos priorités et interventions du jour.
        </p>
      </div>

      {todoCount > 0 && (
        <Link to="/tech/chantiers" className="block">
          <Card className="border-primary/40 bg-primary/5 hover:border-primary/60 transition-colors">
            <CardContent className="p-3 flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm font-semibold text-primary">
                {todoCount} chantier{todoCount > 1 ? "s" : ""} à faire
              </span>
            </CardContent>
          </Card>
        </Link>
      )}

      {lowStock.length > 0 && (
        <Link to="/tech/camion" className="block">
          <Card className="border-destructive/35 bg-destructive/5 hover:border-destructive/55 transition-colors">
            <CardContent className="p-3 flex items-start gap-2">
              <Package className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <div className="min-w-0 text-sm">
                <span className="font-semibold text-destructive">
                  {lowStock.length} produit{lowStock.length > 1 ? "s" : ""} bas sur mon camion
                </span>
                <ul className="mt-1 space-y-0.5">
                  {lowStock.map((l) => (
                    <li key={l.id} className="break-words text-xs text-destructive/85">
                      {l.product?.nom} — {l.quantite} {l.product?.unite}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Aujourd'hui
        </h2>
        {isLoading || !userId ? (
          <div className="grid gap-2 md:grid-cols-2">
            {[0, 1, 2, 3].map((item) => (
              <Card key={item}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex justify-between gap-3">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : isError ? (
          <Card className="border-destructive/30">
            <CardContent className="py-10 text-center text-sm text-destructive">
              Impossible de charger les interventions du jour.
            </CardContent>
          </Card>
        ) : todayInterventions.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Aucun chantier aujourd'hui.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {todayInterventions.map((inv: any) => (
              <Link key={inv.id} to="/tech/chantiers/$id" params={{ id: inv.id }} className="block">
                <Card className="hover:border-primary/40 transition-colors">
                  <CardContent className="p-3 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="break-words text-sm font-semibold">
                          {inv.client?.raison_sociale ?? "—"}
                        </div>
                        <div className="break-words text-xs text-muted-foreground">
                          {inv.type_intervention}
                        </div>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase",
                          STATUT_COLORS[inv.statut] ?? "bg-muted",
                        )}
                      >
                        {statutLabel(inv.statut)}
                      </span>
                    </div>
                    {inv.adresse_site && (
                      <div className="flex items-start gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                        <span className="break-words">{inv.adresse_site}</span>
                      </div>
                    )}
                    {inv.client?.telephone && (
                      <a
                        href={`tel:${inv.client.telephone}`}
                        className="flex min-h-11 w-fit items-center gap-1.5 rounded-lg bg-primary/10 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Phone className="h-3 w-3" /> Appeler
                      </a>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
