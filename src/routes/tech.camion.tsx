/* eslint-disable @typescript-eslint/no-explicit-any */
// "Mon camion" — technicien uniquement. Aucune vue garage, aucun autre
// camion, aucune entrée de stock, aucun transfert : uniquement ses propres
// niveaux, ses demandes de réappro et son historique de mouvements.
import { createFileRoute } from "@tanstack/react-router";
import { APP_NAME } from "@/lib/brand";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Truck,
  Search,
  AlertTriangle,
  PackagePlus,
  History,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  useMyVanStock,
  useMyVanMovements,
  useMyStockRequests,
  useStockProducts,
  type StockProduct,
  type StockLevel,
  type StockRequestStatut,
} from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tech/camion")({
  head: () => ({ meta: [{ title: `Mon camion — ${APP_NAME}` }] }),
  component: TechCamionPage,
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

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  entree: "Entrée garage",
  transfert: "Réapprovisionnement reçu",
  consommation: "Consommation",
  ajustement: "Ajustement",
};

const REQUEST_STATUT_LABELS: Record<StockRequestStatut, string> = {
  en_attente: "En attente",
  servie: "Servie",
  refusee: "Refusée",
};

const REQUEST_STATUT_ICONS: Record<StockRequestStatut, React.ReactNode> = {
  en_attente: <Clock className="h-3 w-3" />,
  servie: <CheckCircle2 className="h-3 w-3" />,
  refusee: <XCircle className="h-3 w-3" />,
};

const REQUEST_STATUT_COLORS: Record<StockRequestStatut, string> = {
  en_attente: "bg-accent/15 text-accent",
  servie: "bg-primary/15 text-primary",
  refusee: "bg-destructive/15 text-destructive",
};

type Tab = "stock" | "reappro" | "history";

function TechCamionPage() {
  const [tab, setTab] = useState<Tab>("stock");
  const [q, setQ] = useState("");
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestProductId, setRequestProductId] = useState<string | undefined>(undefined);
  const qc = useQueryClient();

  const { data: levels = [], isLoading, isError } = useMyVanStock();
  const {
    data: movements = [],
    isLoading: movementsLoading,
    isError: movementsError,
  } = useMyVanMovements();
  const {
    data: myRequests = [],
    isLoading: requestsLoading,
    isError: requestsError,
  } = useMyStockRequests();
  const { data: products = [] } = useStockProducts();

  const filtered = levels
    .filter(
      (l) => !q.trim() || (l.product?.nom ?? "").toLowerCase().includes(q.trim().toLowerCase()),
    )
    .sort((a, b) => (a.product?.nom ?? "").localeCompare(b.product?.nom ?? ""));

  const pendingCount = myRequests.filter((r) => r.statut === "en_attente").length;

  function openRequestDialog(productId?: string) {
    setRequestProductId(productId);
    setRequestOpen(true);
  }

  async function handleRequest(productId: string, quantite: number, note: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await db.from("stock_requests").insert({
      product_id: productId,
      technicien_id: user.id,
      quantite,
      note: note || null,
      user_id: user.id,
    });
    if (error) throw error;
    qc.invalidateQueries({ queryKey: ["my_stock_requests"] });
    qc.invalidateQueries({ queryKey: ["stock_requests_pending_count"] });
    toast.success("Demande de réappro envoyée");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            <Truck className="h-4 w-4" /> Stock terrain
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Mon camion</h1>
          <p className="mt-1 hidden text-sm text-muted-foreground sm:block">
            Consultez votre stock et vos demandes de réapprovisionnement.
          </p>
        </div>
        <Button className="min-h-11 shrink-0" size="sm" onClick={() => openRequestDialog()}>
          <PackagePlus className="mr-1.5 h-4 w-4" /> Réappro
        </Button>
      </div>

      <div
        className="flex gap-1 rounded-xl bg-muted p-1"
        role="tablist"
        aria-label="Sections du camion"
      >
        {[
          { v: "stock" as Tab, label: "Mon camion" },
          { v: "reappro" as Tab, label: `Réappro${pendingCount > 0 ? ` (${pendingCount})` : ""}` },
          { v: "history" as Tab, label: "Historique" },
        ].map(({ v, label }) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={tab === v}
            onClick={() => setTab(v)}
            className={cn(
              "min-h-11 flex-1 rounded-lg px-2 text-xs font-semibold transition-all",
              tab === v
                ? "bg-card shadow text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "stock" && (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher un produit…"
              className="h-11 pl-9"
            />
          </div>
          {isLoading ? (
            <div className="grid gap-2 md:grid-cols-2">
              {[0, 1, 2, 3].map((item) => (
                <Card key={item}>
                  <CardContent className="space-y-3 p-4">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-11 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : isError ? (
            <Card className="border-destructive/30">
              <CardContent className="py-10 text-center text-sm text-destructive">
                Impossible de charger le stock du camion.
              </CardContent>
            </Card>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                {levels.length === 0
                  ? "Aucun produit sur votre camion pour le moment."
                  : "Aucun résultat."}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {filtered.map((l) => {
                const low = l.product ? l.quantite <= l.product.seuil_alerte : false;
                return (
                  <Card key={l.id} className={low ? "border-destructive/40" : ""}>
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="break-words font-semibold">{l.product?.nom ?? "—"}</h3>
                            {low && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-destructive px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-destructive-foreground">
                                <AlertTriangle className="h-3 w-3" /> Stock bas
                              </span>
                            )}
                          </div>
                          <div className="mt-1 text-sm text-muted-foreground">
                            <span className="font-medium text-foreground tabular-nums">
                              {l.quantite}
                            </span>{" "}
                            {l.product?.unite}
                            {l.product && (
                              <span className="opacity-50">
                                {" "}
                                · Seuil : {l.product.seuil_alerte}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="min-h-11 w-full shrink-0 text-xs sm:w-auto"
                          onClick={() => openRequestDialog(l.product_id)}
                        >
                          <PackagePlus className="mr-1 h-3.5 w-3.5" /> Demander
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === "reappro" &&
        (requestsLoading ? (
          <div className="grid gap-2 md:grid-cols-2">
            {[0, 1, 2].map((item) => (
              <Card key={item}>
                <CardContent className="space-y-3 p-4">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : requestsError ? (
          <Card className="border-destructive/30">
            <CardContent className="py-10 text-center text-sm text-destructive">
              Impossible de charger les demandes de réapprovisionnement.
            </CardContent>
          </Card>
        ) : myRequests.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              <PackagePlus className="mx-auto mb-2 h-8 w-8 opacity-50" />
              Aucune demande de réappro pour le moment.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {myRequests.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-3 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="break-words text-sm font-medium">
                      {r.product?.nom ?? "Produit"} — {r.quantite} {r.product?.unite}
                    </p>
                    <span
                      className={cn(
                        "shrink-0 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                        REQUEST_STATUT_COLORS[r.statut],
                      )}
                    >
                      {REQUEST_STATUT_ICONS[r.statut]} {REQUEST_STATUT_LABELS[r.statut]}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {formatDateTime(r.created_at)}
                  </div>
                  {r.note && (
                    <p className="break-words text-xs italic text-muted-foreground">{r.note}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ))}

      {tab === "history" &&
        (movementsLoading ? (
          <div className="grid gap-2 md:grid-cols-2">
            {[0, 1, 2].map((item) => (
              <Card key={item}>
                <CardContent className="space-y-3 p-4">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : movementsError ? (
          <Card className="border-destructive/30">
            <CardContent className="py-10 text-center text-sm text-destructive">
              Impossible de charger l’historique du camion.
            </CardContent>
          </Card>
        ) : movements.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              <History className="mx-auto mb-2 h-8 w-8 opacity-50" />
              Aucun mouvement sur votre camion pour le moment.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {movements.map((m) => (
              <Card key={m.id}>
                <CardContent className="p-3 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="break-words text-sm font-medium">
                      {m.product?.nom ?? "Produit"} — {m.quantite > 0 ? "+" : ""}
                      {m.quantite} {m.product?.unite}
                    </p>
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                      {MOVEMENT_TYPE_LABELS[m.type] ?? m.type}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {formatDateTime(m.created_at)}
                  </div>
                  {m.note && (
                    <p className="break-words text-xs italic text-muted-foreground">{m.note}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ))}

      <RequestReapproDialog
        open={requestOpen}
        onOpenChange={setRequestOpen}
        products={products}
        levels={levels}
        defaultProductId={requestProductId}
        onSubmit={handleRequest}
      />
    </div>
  );
}

function RequestReapproDialog({
  open,
  onOpenChange,
  products,
  levels,
  defaultProductId,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  products: StockProduct[];
  levels: StockLevel[];
  defaultProductId?: string;
  onSubmit: (productId: string, qty: number, note: string) => Promise<void>;
}) {
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const product = products.find((p) => p.id === productId);
  const currentQty = productId
    ? (levels.find((l) => l.product_id === productId)?.quantite ?? 0)
    : null;

  function reset(productId?: string) {
    setProductId(productId ?? "");
    setQty("");
    setNote("");
  }

  async function handleSave() {
    const n = Number(qty.replace(",", "."));
    if (!productId) {
      toast.error("Sélectionnez un produit");
      return;
    }
    if (!Number.isFinite(n) || n <= 0) {
      toast.error("Quantité invalide");
      return;
    }
    setSaving(true);
    try {
      await onSubmit(productId, n, note.trim());
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Erreur");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (v) reset(defaultProductId);
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Demander du réapprovisionnement</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Produit
            </label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger className="min-h-11">
                <SelectValue placeholder="Sélectionner un produit…" />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {currentQty !== null && (
              <p className="text-[11px] text-muted-foreground">
                Sur mon camion actuellement : {currentQty} {product?.unite}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Quantité souhaitée{product ? ` (${product.unite})` : ""}
            </label>
            <Input
              className="h-11"
              type="number"
              step="0.001"
              min="0"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Note (optionnel)
            </label>
            <Input
              className="h-11"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex. urgent, plus qu'une boîte…"
            />
          </div>
          <Button className="min-h-11 w-full" disabled={saving} onClick={handleSave}>
            {saving ? "Envoi…" : "Envoyer la demande"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
