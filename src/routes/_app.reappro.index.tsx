import { createFileRoute, Link } from "@tanstack/react-router";
import { APP_NAME } from "@/lib/brand";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PackagePlus, CheckCircle2, XCircle, Clock, Truck } from "lucide-react";
import {
  useStockRequests,
  useStockLevels,
  useAssignableMembers,
  resolveTechnicianName,
  getGarageLevel,
  getVanLevel,
  logStockMovement,
  type StockRequest,
} from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import { PermissionGate } from "@/components/permission-gate";
import { PageContainer, PageHeader, PageSection } from "@/components/page-layout";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_app/reappro/")({
  head: () => ({ meta: [{ title: `Réappro — ${APP_NAME}` }] }),
  component: () => (
    <PermissionGate perm="reappro">
      <ReapproPage />
    </PermissionGate>
  ),
});

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function invalidateReappro(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["stock_requests"] });
  qc.invalidateQueries({ queryKey: ["my_stock_requests"] });
  qc.invalidateQueries({ queryKey: ["stock_requests_pending_count"] });
  qc.invalidateQueries({ queryKey: ["stock_levels"] });
  qc.invalidateQueries({ queryKey: ["my_van_stock"] });
  qc.invalidateQueries({ queryKey: ["stock_movements"] });
  qc.invalidateQueries({ queryKey: ["my_van_movements"] });
  qc.invalidateQueries({ queryKey: ["dashboard"] });
}

function ReapproPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"en_attente" | "traitees">("en_attente");
  const {
    data: pending = [],
    isLoading: pendingLoading,
    isError: pendingError,
  } = useStockRequests("en_attente");
  const { data: allRequests = [], isLoading: allLoading, isError: allError } = useStockRequests();
  const { data: levels = [] } = useStockLevels();
  const { data: members = [] } = useAssignableMembers();

  const traitees = allRequests.filter((r) => r.statut !== "en_attente");

  // Sert la demande : transfert garage → camion (même logique que "Réapprovisionner"
  // dans Stock), puis marque la demande comme servie.
  async function handleServe(request: StockRequest) {
    const garage = getGarageLevel(levels, request.product_id);
    const garageQty = garage?.quantite ?? 0;
    if (garageQty < request.quantite) {
      toast.error(`Stock garage insuffisant (${garageQty} disponible)`);
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const newGarageQty = garageQty - request.quantite;
    const van = getVanLevel(levels, request.product_id, request.technicien_id);
    const newVanQty = (van?.quantite ?? 0) + request.quantite;

    if (garage) {
      const { error } = await db
        .from("stock_levels")
        .update({ quantite: newGarageQty })
        .eq("id", garage.id);
      if (error) {
        toast.error(error.message);
        return;
      }
    } else {
      const { error } = await db.from("stock_levels").insert({
        product_id: request.product_id,
        technicien_id: null,
        quantite: newGarageQty,
        user_id: user?.id,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
    }
    if (van) {
      const { error } = await db
        .from("stock_levels")
        .update({ quantite: newVanQty })
        .eq("id", van.id);
      if (error) {
        toast.error(error.message);
        return;
      }
    } else {
      const { error } = await db.from("stock_levels").insert({
        product_id: request.product_id,
        technicien_id: request.technicien_id,
        quantite: newVanQty,
        user_id: user?.id,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
    }
    await logStockMovement({
      product_id: request.product_id,
      type: "transfert",
      technicien_id: request.technicien_id,
      quantite: request.quantite,
    });

    const { error } = await db
      .from("stock_requests")
      .update({
        statut: "servie",
        traite_par: user?.id ?? null,
        traite_at: new Date().toISOString(),
      })
      .eq("id", request.id);
    if (error) {
      toast.error(error.message);
      return;
    }

    invalidateReappro(qc);
    toast.success("Demande servie");
  }

  async function handleRefuse(request: StockRequest) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await db
      .from("stock_requests")
      .update({
        statut: "refusee",
        traite_par: user?.id ?? null,
        traite_at: new Date().toISOString(),
      })
      .eq("id", request.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    invalidateReappro(qc);
    toast.success("Demande refusée");
  }

  return (
    <PageContainer>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <PackagePlus className="h-6 w-6 text-primary" />
            Réapprovisionnement
          </span>
        }
        subtitle="Demandes de stock envoyées par les techniciens."
        actions={
          <Button variant="outline" asChild>
            <Link to="/stock">Voir le stock</Link>
          </Button>
        }
      />

      <div
        className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1 sm:max-w-md"
        role="tablist"
        aria-label="État des demandes"
      >
        {[
          {
            v: "en_attente" as const,
            label: `En attente${pending.length > 0 ? ` (${pending.length})` : ""}`,
          },
          { v: "traitees" as const, label: "Traitées" },
        ].map(({ v, label }) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={tab === v}
            onClick={() => setTab(v)}
            className={cn(
              "min-h-10 rounded-lg px-3 py-2 text-xs font-semibold transition-all sm:text-sm",
              tab === v
                ? "bg-card shadow text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "en_attente" ? (
        pendingLoading ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {[0, 1, 2, 3].map((item) => (
              <Skeleton key={item} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : pendingError ? (
          <Card className="border-destructive/30">
            <CardContent className="py-10 text-center text-sm text-destructive">
              Impossible de charger les demandes en attente.
            </CardContent>
          </Card>
        ) : pending.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              <CheckCircle2 className="mx-auto mb-2 h-8 w-8 opacity-50" />
              Aucune demande en attente.
            </CardContent>
          </Card>
        ) : (
          <PageSection
            title={`${pending.length} demande${pending.length > 1 ? "s" : ""} à traiter`}
          >
            <div className="grid gap-3 lg:grid-cols-2">
              {pending.map((r) => (
                <Card key={r.id} className="h-full">
                  <CardContent className="flex h-full flex-col gap-4 p-4 lg:p-6">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="break-words font-semibold leading-snug">
                          {r.product?.nom ?? "Produit"}
                        </p>
                        <p className="mt-2 text-2xl font-bold tabular-nums text-primary">
                          {r.quantite}{" "}
                          <span className="text-sm font-medium text-muted-foreground">
                            {r.product?.unite}
                          </span>
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Truck className="h-3 w-3 shrink-0" />
                          {resolveTechnicianName(members, r.technicien_id) ?? "Technicien"}
                          <span className="opacity-50">·</span>
                          <span>{formatDateTime(r.created_at)}</span>
                        </div>
                        {r.note && (
                          <p className="text-xs text-muted-foreground italic mt-1">{r.note}</p>
                        )}
                      </div>
                    </div>
                    <div className="mt-auto grid grid-cols-2 gap-2">
                      <Button className="min-h-11" onClick={() => handleServe(r)}>
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Servir
                      </Button>
                      <Button
                        variant="outline"
                        className="min-h-11 text-destructive hover:text-destructive"
                        onClick={() => handleRefuse(r)}
                      >
                        <XCircle className="mr-1.5 h-3.5 w-3.5" /> Refuser
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </PageSection>
        )
      ) : allLoading ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {[0, 1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : allError ? (
        <Card className="border-destructive/30">
          <CardContent className="py-10 text-center text-sm text-destructive">
            Impossible de charger les demandes traitées.
          </CardContent>
        </Card>
      ) : traitees.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            <Clock className="mx-auto mb-2 h-8 w-8 opacity-50" />
            Aucune demande traitée pour le moment.
          </CardContent>
        </Card>
      ) : (
        <PageSection
          title={`${traitees.length} demande${traitees.length > 1 ? "s" : ""} traitée${traitees.length > 1 ? "s" : ""}`}
        >
          <div className="grid gap-3 lg:grid-cols-2">
            {traitees.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-3 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="break-words text-sm font-medium">
                      {r.product?.nom ?? "Produit"} — {r.quantite} {r.product?.unite}
                    </p>
                    <Badge
                      variant="outline"
                      className={cn(
                        "shrink-0 gap-1",
                        r.statut === "servie"
                          ? "bg-primary/15 text-primary"
                          : "bg-destructive/15 text-destructive",
                      )}
                    >
                      {r.statut === "servie" ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      {r.statut === "servie" ? "Servie" : "Refusée"}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {resolveTechnicianName(members, r.technicien_id) ?? "Technicien"} ·{" "}
                    {formatDateTime(r.created_at)}
                  </div>
                  {r.note && <p className="text-xs text-muted-foreground italic">{r.note}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </PageSection>
      )}
    </PageContainer>
  );
}
