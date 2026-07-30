import { createFileRoute, Link } from "@tanstack/react-router";
import { APP_NAME } from "@/lib/brand";
import { useState, useMemo, useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  ArrowLeftRight,
  AlertTriangle,
  Package,
  Trash2,
  Pencil,
  Search,
  Truck,
  Warehouse,
  History,
  Filter,
  X,
} from "lucide-react";
import {
  useStockProducts,
  useStockLevels,
  useAssignableMembers,
  useStockMovements,
  logStockMovement,
  resolveTechnicianName,
  getGarageLevel,
  getVanLevel,
  type StockProduct,
  type StockLevel,
  type AssignableMember,
  type StockMovement,
  type StockMovementType,
} from "@/lib/queries";
import {
  stockProductSchema,
  type StockProductForm,
  UNITES_STOCK,
  UNITES_VOLUME,
  UNITES_UNITE,
  formatEUR,
  formatDateFR,
} from "@/lib/schemas";
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import { PermissionGate } from "@/components/permission-gate";
import { Pager } from "@/components/pager";
import { PageContainer, PageHeader, PageSection } from "@/components/page-layout";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const HISTORY_PAGE_SIZE = 50;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Erreur";
}

export const Route = createFileRoute("/_app/stock/")({
  head: () => ({ meta: [{ title: `Stock — ${APP_NAME}` }] }),
  component: () => (
    <PermissionGate perm="stock">
      <StockPage />
    </PermissionGate>
  ),
});

function invalidateStock(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["stock_products"] });
  qc.invalidateQueries({ queryKey: ["stock_levels"] });
  qc.invalidateQueries({ queryKey: ["my_van_stock"] });
  qc.invalidateQueries({ queryKey: ["stock_movements"] });
  qc.invalidateQueries({ queryKey: ["my_van_movements"] });
  qc.invalidateQueries({ queryKey: ["product_stats"] });
  qc.invalidateQueries({ queryKey: ["dashboard"] });
}

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

const MOVEMENT_TYPE_LABELS: Record<StockMovementType, string> = {
  entree: "Entrée garage",
  transfert: "Réapprovisionnement",
  consommation: "Consommation",
  ajustement: "Ajustement",
};

function movementLabel(m: StockMovement, members: AssignableMember[]): string {
  const nom = m.product?.nom ?? "Produit";
  const unite = m.product?.unite ?? "";
  const vanName = m.technicien_id
    ? (resolveTechnicianName(members, m.technicien_id) ?? "technicien")
    : null;
  switch (m.type) {
    case "entree":
      return `Entrée garage : +${m.quantite} ${unite} ${nom}`;
    case "transfert":
      return `Réappro → camion de ${vanName} : ${m.quantite} ${unite} ${nom}`;
    case "consommation":
      return `Consommation (${vanName ? `camion de ${vanName}` : "garage"}) : ${m.quantite} ${unite} ${nom}`;
    case "ajustement": {
      const signed = m.quantite > 0 ? `+${m.quantite}` : `${m.quantite}`;
      return `Ajustement ${vanName ? `camion de ${vanName}` : "garage"} : ${signed} ${unite} ${nom}`;
    }
    default:
      return nom;
  }
}

function MovementRow({
  m,
  members,
  showWho = true,
}: {
  m: StockMovement;
  members: AssignableMember[];
  showWho?: boolean;
}) {
  const who = showWho ? (resolveTechnicianName(members, m.created_by) ?? "—") : null;
  const content = (
    <Card>
      <CardContent className="p-3 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium">{movementLabel(m, members)}</p>
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
            {MOVEMENT_TYPE_LABELS[m.type]}
          </span>
        </div>
        <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-x-2">
          <span>{formatDateTime(m.created_at)}</span>
          {who && (
            <>
              <span className="opacity-50">·</span>
              <span>par {who}</span>
            </>
          )}
          {m.intervention_id && (
            <>
              <span className="opacity-50">·</span>
              <span className="text-primary">Voir l'intervention</span>
            </>
          )}
        </div>
        {m.note && <p className="text-xs text-muted-foreground italic">{m.note}</p>}
      </CardContent>
    </Card>
  );
  return m.intervention_id ? (
    <Link to="/interventions/$id" params={{ id: m.intervention_id }}>
      {content}
    </Link>
  ) : (
    content
  );
}

// Les techniciens ont leur propre interface (/tech/camion) et n'atteignent
// jamais cette page — Stock est exclusivement la vue d'ensemble owner/bureau.
function StockPage() {
  return <OwnerStockView />;
}

// ─── Vue propriétaire / bureau ──────────────────────────────────────────────────

type Tab = "catalogue" | "overview" | "history";

function OwnerStockView() {
  const [tab, setTab] = useState<Tab>("overview");
  const [q, setQ] = useState("");
  const qc = useQueryClient();

  const {
    data: products = [],
    isLoading: productsLoading,
    isError: productsError,
  } = useStockProducts();
  const { data: levels = [], isLoading: levelsLoading, isError: levelsError } = useStockLevels();
  const { data: members = [] } = useAssignableMembers();

  const [addProductOpen, setAddProductOpen] = useState(false);
  const [garageInOpen, setGarageInOpen] = useState(false);
  const [replenishOpen, setReplenishOpen] = useState(false);

  const createProductMut = useMutation({
    mutationFn: async (values: StockProductForm) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Non authentifié");
      const { quantite: initialQty, ...productFields } = values;
      const { data: product, error } = await db
        .from("stock_products")
        .insert({ ...productFields, user_id: u.user.id })
        .select()
        .single();
      if (error) throw error;
      const { error: levelErr } = await db.from("stock_levels").insert({
        product_id: product.id,
        technicien_id: null,
        quantite: initialQty || 0,
        user_id: u.user.id,
      });
      if (levelErr) throw levelErr;
    },
    onSuccess: () => {
      toast.success("Produit ajouté");
      invalidateStock(qc);
      setAddProductOpen(false);
    },
    onError: (error: unknown) => toast.error(errorMessage(error)),
  });

  async function handleGarageIn(productId: string, qty: number) {
    const garage = getGarageLevel(levels, productId);
    const { data: u } = await supabase.auth.getUser();
    const next = (garage?.quantite ?? 0) + qty;
    if (garage) {
      const { error } = await db
        .from("stock_levels")
        .update({ quantite: next })
        .eq("id", garage.id);
      if (error) {
        toast.error(error.message);
        return;
      }
    } else {
      const { error } = await db.from("stock_levels").insert({
        product_id: productId,
        technicien_id: null,
        quantite: next,
        user_id: u.user?.id,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
    }
    await logStockMovement({
      product_id: productId,
      type: "entree",
      technicien_id: null,
      quantite: qty,
    });
    invalidateStock(qc);
    toast.success("Stock garage mis à jour");
  }

  async function handleReplenish(productId: string, technicienId: string, qty: number) {
    const garage = getGarageLevel(levels, productId);
    const garageQty = garage?.quantite ?? 0;
    if (garageQty < qty) {
      toast.error(`Stock garage insuffisant (${garageQty} disponible)`);
      return;
    }
    const { data: u } = await supabase.auth.getUser();
    const newGarageQty = garageQty - qty;
    const van = getVanLevel(levels, productId, technicienId);
    const newVanQty = (van?.quantite ?? 0) + qty;

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
        product_id: productId,
        technicien_id: null,
        quantite: newGarageQty,
        user_id: u.user?.id,
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
        product_id: productId,
        technicien_id: technicienId,
        quantite: newVanQty,
        user_id: u.user?.id,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
    }
    await logStockMovement({
      product_id: productId,
      type: "transfert",
      technicien_id: technicienId,
      quantite: qty,
    });
    invalidateStock(qc);
    toast.success("Réapprovisionnement effectué");
  }

  async function handleCorrectVanLevel(productId: string, technicienId: string, newQty: number) {
    const { data: u } = await supabase.auth.getUser();
    const van = getVanLevel(levels, productId, technicienId);
    const previousQty = van?.quantite ?? 0;
    if (van) {
      const { error } = await db.from("stock_levels").update({ quantite: newQty }).eq("id", van.id);
      if (error) {
        toast.error(error.message);
        return;
      }
    } else {
      const { error } = await db.from("stock_levels").insert({
        product_id: productId,
        technicien_id: technicienId,
        quantite: newQty,
        user_id: u.user?.id,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
    }
    await logStockMovement({
      product_id: productId,
      type: "ajustement",
      technicien_id: technicienId,
      quantite: newQty - previousQty,
    });
    invalidateStock(qc);
    toast.success("Niveau corrigé");
  }

  const filteredProducts = useMemo(() => {
    const s = q.trim().toLowerCase();
    return products
      .filter((p) => !s || p.nom.toLowerCase().includes(s))
      .sort((a, b) => a.nom.localeCompare(b.nom));
  }, [products, q]);

  const isLoading = productsLoading || levelsLoading;
  const isError = productsError || levelsError;
  const lowStockCount = products.filter((product) => {
    const garageQty = getGarageLevel(levels, product.id)?.quantite ?? 0;
    return garageQty <= product.seuil_alerte;
  }).length;

  return (
    <PageContainer>
      <PageHeader
        title="Stock"
        subtitle={`${products.length} produit${products.length > 1 ? "s" : ""} au catalogue · ${lowStockCount} alerte${lowStockCount > 1 ? "s" : ""} garage`}
        actions={
          <Dialog open={addProductOpen} onOpenChange={setAddProductOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter un produit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nouveau produit</DialogTitle>
              </DialogHeader>
              <ProductForm
                onSubmit={(v) => createProductMut.mutateAsync(v)}
                submitting={createProductMut.isPending}
                showQuantite
                quantiteLabel="Quantité initiale (garage)"
              />
            </DialogContent>
          </Dialog>
        }
      />

      <div
        className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1"
        role="tablist"
        aria-label="Vues du stock"
      >
        {[
          { v: "overview" as Tab, label: "Vue d'ensemble" },
          { v: "catalogue" as Tab, label: "Catalogue" },
          { v: "history" as Tab, label: "Historique" },
        ].map(({ v, label }) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={tab === v}
            onClick={() => setTab(v)}
            className={cn(
              "min-h-10 rounded-lg px-2 py-2 text-xs font-semibold transition-all sm:text-sm",
              tab === v
                ? "bg-card shadow text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab !== "history" && (
        <div className="relative max-w-2xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un produit…"
            className="pl-9"
          />
        </div>
      )}

      {tab === "overview" && (
        <>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:max-w-2xl">
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => setGarageInOpen(true)}
            >
              <Warehouse className="mr-2 h-4 w-4" /> Entrée garage
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => setReplenishOpen(true)}
              disabled={members.length === 0}
            >
              <ArrowLeftRight className="mr-2 h-4 w-4" /> Réapprovisionner
            </Button>
          </div>

          {isLoading ? (
            <div
              className="grid gap-3 md:grid-cols-2 xl:grid-cols-3"
              aria-label="Chargement du stock"
            >
              {[0, 1, 2, 3, 4, 5].map((item) => (
                <Skeleton key={item} className="h-48 rounded-xl" />
              ))}
            </div>
          ) : isError ? (
            <Card className="border-destructive/30">
              <CardContent className="py-10 text-center text-sm text-destructive">
                Impossible de charger le stock. Réessayez dans quelques instants.
              </CardContent>
            </Card>
          ) : filteredProducts.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                <Package className="mx-auto mb-2 h-8 w-8 opacity-50" />
                {products.length === 0
                  ? "Aucun produit. Ajoutez-en un pour commencer."
                  : "Aucun résultat."}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((p) => (
                <OverviewProductCard
                  key={p.id}
                  product={p}
                  levels={levels}
                  members={members}
                  onCorrectVan={handleCorrectVanLevel}
                />
              ))}
            </div>
          )}

          <GarageInDialog
            open={garageInOpen}
            onOpenChange={setGarageInOpen}
            products={products}
            onSubmit={handleGarageIn}
          />
          <ReplenishDialog
            open={replenishOpen}
            onOpenChange={setReplenishOpen}
            products={products}
            members={members}
            levels={levels}
            onSubmit={handleReplenish}
          />
        </>
      )}

      {tab === "catalogue" &&
        (isLoading ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((item) => (
              <Skeleton key={item} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : isError ? (
          <Card className="border-destructive/30">
            <CardContent className="py-10 text-center text-sm text-destructive">
              Impossible de charger le catalogue.
            </CardContent>
          </Card>
        ) : filteredProducts.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              <Package className="mx-auto mb-2 h-8 w-8 opacity-50" />
              {products.length === 0
                ? "Aucun produit. Ajoutez-en un pour commencer."
                : "Aucun résultat."}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((p) => (
              <CatalogueProductRow key={p.id} product={p} />
            ))}
          </div>
        ))}

      {tab === "history" && <HistoryTab products={products} members={members} />}
    </PageContainer>
  );
}

// ─── Historique des mouvements (propriétaire) ──────────────────────────────────

function HistoryTab({
  products,
  members,
}: {
  products: StockProduct[];
  members: AssignableMember[];
}) {
  const [productFilter, setProductFilter] = useState("all");
  const [technicienFilter, setTechnicienFilter] = useState("all"); // all | garage | <user_id>
  const [typeFilter, setTypeFilter] = useState<"all" | StockMovementType>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [productFilter, technicienFilter, typeFilter, dateFrom, dateTo]);

  const activeFiltersCount = [
    productFilter !== "all" ? 1 : 0,
    technicienFilter !== "all" ? 1 : 0,
    typeFilter !== "all" ? 1 : 0,
    dateFrom ? 1 : 0,
    dateTo ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const {
    data: historyResult,
    isLoading,
    isError,
  } = useStockMovements({
    product_id: productFilter !== "all" ? productFilter : undefined,
    technicien_id:
      technicienFilter === "all"
        ? undefined
        : technicienFilter === "garage"
          ? null
          : technicienFilter,
    type: typeFilter !== "all" ? typeFilter : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo ? `${dateTo}T23:59:59` : undefined,
    page,
    pageSize: HISTORY_PAGE_SIZE,
  });
  const historyData = (historyResult as { rows: StockMovement[]; total: number } | undefined) ?? {
    rows: [],
    total: 0,
  };
  const movements = historyData.rows;
  const total = historyData.total;

  function resetFilters() {
    setProductFilter("all");
    setTechnicienFilter("all");
    setTypeFilter("all");
    setDateFrom("");
    setDateTo("");
  }

  return (
    <PageSection title="Historique des mouvements">
      <button
        onClick={() => setFiltersOpen((v) => !v)}
        className={cn(
          "relative flex h-10 w-full items-center justify-center gap-2 rounded-xl border text-xs font-medium transition-colors sm:max-w-48",
          filtersOpen || activeFiltersCount > 0
            ? "bg-accent/10 border-accent text-accent"
            : "bg-card border-border text-muted-foreground",
        )}
      >
        <Filter className="h-3.5 w-3.5" /> Filtres
        {activeFiltersCount > 0 && (
          <span className="absolute right-3 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-white">
            {activeFiltersCount}
          </span>
        )}
      </button>

      {filtersOpen && (
        <Card>
          <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Produit">
              <Select value={productFilter} onValueChange={setProductFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les produits</SelectItem>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Emplacement">
              <Select value={technicienFilter} onValueChange={setTechnicienFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les emplacements</SelectItem>
                  <SelectItem value="garage">Garage</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      Camion de {m.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Type">
              <Select
                value={typeFilter}
                onValueChange={(value) => setTypeFilter(value as "all" | StockMovementType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  {(Object.keys(MOVEMENT_TYPE_LABELS) as StockMovementType[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {MOVEMENT_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Du">
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </Field>
              <Field label="Au">
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </Field>
            </div>
            {activeFiltersCount > 0 && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" /> Réinitialiser
              </button>
            )}
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <Card className="border-destructive/30">
          <CardContent className="py-10 text-center text-sm text-destructive">
            Impossible de charger l’historique.
          </CardContent>
        </Card>
      ) : movements.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            <History className="mx-auto mb-2 h-8 w-8 opacity-50" />
            Aucun mouvement pour ces filtres.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">
            {total} mouvement{total > 1 ? "s" : ""}
          </div>
          {movements.map((m) => (
            <MovementRow key={m.id} m={m} members={members} />
          ))}
          <Pager page={page} pageSize={HISTORY_PAGE_SIZE} total={total} onPageChange={setPage} />
        </div>
      )}
    </PageSection>
  );
}

// ─── Carte "vue d'ensemble" d'un produit ───────────────────────────────────────

function OverviewProductCard({
  product,
  levels,
  members,
  onCorrectVan,
}: {
  product: StockProduct;
  levels: StockLevel[];
  members: AssignableMember[];
  onCorrectVan: (productId: string, technicienId: string, newQty: number) => void;
}) {
  const garage = getGarageLevel(levels, product.id);
  const garageQty = garage?.quantite ?? 0;
  const garageLow = garageQty <= product.seuil_alerte;
  const garageCritical = garageQty <= 0;

  function correctVan(technicienId: string, currentQty: number) {
    const raw = window.prompt("Corriger la quantité de ce camion", String(currentQty));
    if (raw == null) return;
    const n = Number(raw.replace(",", "."));
    if (!Number.isFinite(n) || n < 0) {
      toast.error("Quantité invalide");
      return;
    }
    onCorrectVan(product.id, technicienId, n);
  }

  return (
    <Card className={cn("h-full overflow-hidden", garageLow && "border-warning/40")}>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="break-words font-semibold leading-snug">{product.nom}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {product.unite} · seuil {product.seuil_alerte}
            </p>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "shrink-0",
              garageCritical
                ? "border-destructive/30 bg-destructive/10 text-destructive"
                : garageLow
                  ? "border-warning/30 bg-warning/10 text-warning-foreground"
                  : "border-success/30 bg-success/10 text-success",
            )}
          >
            {garageCritical ? "Critique" : garageLow ? "Bas" : "OK"}
          </Badge>
        </div>
        <div className="space-y-1.5">
          <div
            className={cn(
              "flex min-h-11 items-center justify-between rounded-lg px-3 py-2 text-sm",
              garageLow ? "bg-warning/10" : "bg-muted/40",
            )}
          >
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Warehouse className="h-3.5 w-3.5" /> Garage
            </span>
            <span
              className={cn(
                "font-bold tabular-nums",
                garageCritical ? "text-destructive" : garageLow && "text-warning-foreground",
              )}
            >
              {garageQty} {product.unite}
              {garageLow && <AlertTriangle className="inline h-3 w-3 ml-1 mb-0.5" />}
            </span>
          </div>
          {members.map((m) => {
            const van = getVanLevel(levels, product.id, m.user_id);
            const vanQty = van?.quantite ?? 0;
            const low = vanQty <= product.seuil_alerte;
            return (
              <button
                key={m.user_id}
                type="button"
                onClick={() => correctVan(m.user_id, vanQty)}
                className={cn(
                  "flex min-h-11 w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                  low ? "bg-warning/10" : "bg-muted/20",
                )}
              >
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Truck className="h-3.5 w-3.5" /> {m.display_name}
                </span>
                <span
                  className={cn("font-semibold tabular-nums", low && "text-warning-foreground")}
                >
                  {vanQty} {product.unite}
                  {low && <AlertTriangle className="inline h-3 w-3 ml-1 mb-0.5" />}
                </span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Dialog : Entrée garage ─────────────────────────────────────────────────────

function GarageInDialog({
  open,
  onOpenChange,
  products,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  products: StockProduct[];
  onSubmit: (productId: string, qty: number) => Promise<void>;
}) {
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("");
  const [saving, setSaving] = useState(false);
  const product = products.find((p) => p.id === productId);

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
      await onSubmit(productId, n);
      setProductId("");
      setQty("");
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Entrée garage (achat)</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Produit">
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger>
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
          </Field>
          <Field label={`Quantité à ajouter${product ? ` (${product.unite})` : ""}`}>
            <Input
              type="number"
              step="0.001"
              min="0"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </Field>
          <Button className="w-full" disabled={saving} onClick={handleSave}>
            {saving ? "Enregistrement…" : "Ajouter au garage"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dialog : Réapprovisionner (garage → camion) ───────────────────────────────

function ReplenishDialog({
  open,
  onOpenChange,
  products,
  members,
  levels,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  products: StockProduct[];
  members: AssignableMember[];
  levels: StockLevel[];
  onSubmit: (productId: string, technicienId: string, qty: number) => Promise<void>;
}) {
  const [productId, setProductId] = useState("");
  const [technicienId, setTechnicienId] = useState("");
  const [qty, setQty] = useState("");
  const [saving, setSaving] = useState(false);
  const product = products.find((p) => p.id === productId);
  const garageQty = productId ? (getGarageLevel(levels, productId)?.quantite ?? 0) : null;

  async function handleSave() {
    const n = Number(qty.replace(",", "."));
    if (!productId) {
      toast.error("Sélectionnez un produit");
      return;
    }
    if (!technicienId) {
      toast.error("Sélectionnez un technicien");
      return;
    }
    if (!Number.isFinite(n) || n <= 0) {
      toast.error("Quantité invalide");
      return;
    }
    setSaving(true);
    try {
      await onSubmit(productId, technicienId, n);
      setProductId("");
      setTechnicienId("");
      setQty("");
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Réapprovisionner un camion</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Produit">
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger>
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
            {garageQty !== null && (
              <p className="text-[11px] text-muted-foreground">
                Disponible au garage : {garageQty} {product?.unite}
              </p>
            )}
          </Field>
          <Field label="Technicien">
            <Select value={technicienId} onValueChange={setTechnicienId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un technicien…" />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.user_id} value={m.user_id}>
                    {m.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={`Quantité${product ? ` (${product.unite})` : ""}`}>
            <Input
              type="number"
              step="0.001"
              min="0"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </Field>
          <Button className="w-full" disabled={saving} onClick={handleSave}>
            {saving ? "Enregistrement…" : "Réapprovisionner"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Catalogue : ligne produit (édition / suppression) ─────────────────────────

function CatalogueProductRow({ product }: { product: StockProduct }) {
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

  const updateMut = useMutation({
    mutationFn: async (values: StockProductForm) => {
      const { quantite: _ignored, ...productFields } = values;
      const { error } = await db.from("stock_products").update(productFields).eq("id", product.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produit mis à jour");
      invalidateStock(qc);
      setEditOpen(false);
    },
    onError: (error: unknown) => toast.error(errorMessage(error)),
  });

  const deleteMut = useMutation({
    mutationFn: async () => {
      const { error } = await db.from("stock_products").delete().eq("id", product.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produit supprimé");
      invalidateStock(qc);
    },
    onError: (error: unknown) => toast.error(errorMessage(error)),
  });

  return (
    <Card className="h-full">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="break-words font-semibold leading-snug">{product.nom}</h3>
            <div className="mt-1 text-sm text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span>{product.unite}</span>
              <span className="opacity-50">·</span>
              <span>
                Seuil : <span className="tabular-nums">{product.seuil_alerte}</span>
              </span>
              <span className="opacity-50">·</span>
              <span>
                {formatEUR(product.prix_achat_ht)} HT/{product.unite}
              </span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[9px] font-semibold",
                  product.type_gestion === "volume"
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {product.type_gestion === "volume" ? "Volume" : "Unité"}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 gap-1.5">
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger asChild>
                <Button size="icon" variant="outline" aria-label={`Modifier ${product.nom}`}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Modifier le produit</DialogTitle>
                </DialogHeader>
                <ProductForm
                  defaultValues={product}
                  onSubmit={(v) => updateMut.mutateAsync(v)}
                  submitting={updateMut.isPending}
                  submitLabel="Enregistrer"
                />
              </DialogContent>
            </Dialog>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  className="border-destructive/30 text-destructive hover:text-destructive"
                  aria-label={`Supprimer ${product.nom}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer ce produit ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    "{product.nom}" et tous ses niveaux de stock (garage + camions) seront
                    définitivement supprimés.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteMut.mutate()}
                    className="bg-destructive"
                    disabled={deleteMut.isPending}
                  >
                    Supprimer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Formulaire produit (catalogue) ─────────────────────────────────────────────

function ProductForm({
  onSubmit,
  submitting,
  defaultValues,
  submitLabel = "Ajouter",
  showQuantite,
  quantiteLabel,
}: {
  onSubmit: (v: StockProductForm) => Promise<void> | void;
  submitting?: boolean;
  defaultValues?: Partial<StockProductForm>;
  submitLabel?: string;
  showQuantite?: boolean;
  quantiteLabel?: string;
}) {
  const form = useForm<StockProductForm>({
    resolver: zodResolver(stockProductSchema) as Resolver<StockProductForm>,
    defaultValues: {
      nom: defaultValues?.nom ?? "",
      type_gestion: defaultValues?.type_gestion ?? "unite",
      unite: defaultValues?.unite ?? "unité",
      quantite: defaultValues?.quantite ?? 0,
      seuil_alerte: defaultValues?.seuil_alerte ?? 0,
      prix_achat_ht: defaultValues?.prix_achat_ht ?? 0,
    },
  });
  const typeGestion = form.watch("type_gestion");
  const uniteOptions = typeGestion === "volume" ? UNITES_VOLUME : UNITES_UNITE;

  // Reset unité quand on change le type
  function handleTypeChange(v: "unite" | "volume") {
    form.setValue("type_gestion", v);
    form.setValue("unite", v === "volume" ? "L" : "unité");
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
      <Field label="Nom du produit *" error={form.formState.errors.nom?.message}>
        <Input placeholder="Ex. Brodifacoum" {...form.register("nom")} />
      </Field>
      <Field label="Type de gestion">
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(["unite", "volume"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => handleTypeChange(t)}
              className={cn(
                "flex-1 py-2 text-xs font-medium transition-colors",
                typeGestion === t
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {t === "unite" ? "À l'unité" : "Liquide (volume)"}
            </button>
          ))}
        </div>
        {typeGestion === "volume" && (
          <p className="text-[10px] text-muted-foreground mt-1">
            Produits liquides/dilués — quantité en L ou ml
          </p>
        )}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Unité">
          <Select
            value={form.watch("unite")}
            onValueChange={(value) => form.setValue("unite", value as StockProductForm["unite"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {uniteOptions.map((u) => (
                <SelectItem key={u} value={u}>
                  {u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        {showQuantite && (
          <Field label={quantiteLabel ?? "Quantité"}>
            <Input
              type="number"
              step={typeGestion === "volume" ? "0.001" : "1"}
              min="0"
              {...form.register("quantite")}
            />
          </Field>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Seuil d'alerte">
          <Input
            type="number"
            step={typeGestion === "volume" ? "0.001" : "1"}
            min="0"
            {...form.register("seuil_alerte")}
          />
        </Field>
        <Field label="Prix d'achat HT">
          <Input type="number" step="0.01" min="0" {...form.register("prix_achat_ht")} />
        </Field>
      </div>
      <DialogFooter>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
