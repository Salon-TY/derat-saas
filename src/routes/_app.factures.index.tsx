/* eslint-disable @typescript-eslint/no-explicit-any -- typage historique des résultats paginés, logique inchangée */
import { createFileRoute, Link } from "@tanstack/react-router";
import { APP_NAME } from "@/lib/brand";
import { useEffect, useState, useMemo } from "react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useInvoices, useRelances, useInvoicesStatutCounts, useClients } from "@/lib/queries";
import { formatEUR, formatDateFR, STATUTS_FACTURE } from "@/lib/schemas";
import { Plus, FileText, Search, Filter, X } from "lucide-react";
import { cn, useDebouncedValue } from "@/lib/utils";
import { db } from "@/lib/db";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { PermissionGate } from "@/components/permission-gate";
import { Pager } from "@/components/pager";
import { PageContainer, PageHeader } from "@/components/page-layout";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const PAGE_SIZE = 50;

const searchSchema = z.object({
  statut: fallback(z.string(), "all").default("all"),
});

export const Route = createFileRoute("/_app/factures/")({
  head: () => ({ meta: [{ title: `Factures — ${APP_NAME}` }] }),
  validateSearch: zodValidator(searchSchema),
  component: () => (
    <PermissionGate perm="factures">
      <FacturesPage />
    </PermissionGate>
  ),
});

const STATUT_COLORS: Record<string, string> = {
  brouillon: "bg-muted text-muted-foreground",
  envoyee: "bg-accent/15 text-accent",
  payee: "bg-primary/15 text-primary",
  retard: "bg-destructive/15 text-destructive",
};

function statutLabel(v: string) {
  return STATUTS_FACTURE.find((s) => s.value === v)?.label ?? v;
}

function getPeriodDates(period: string): { start: string; end: string } | null {
  const now = new Date();
  const localDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const today = localDate(now);
  if (period === "week") {
    const dow = now.getDay();
    const ws = new Date(now);
    ws.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
    return { start: localDate(ws), end: today };
  }
  if (period === "month") {
    return {
      start: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`,
      end: today,
    };
  }
  if (period === "quarter") {
    const q = Math.floor(now.getMonth() / 3);
    const start = new Date(now.getFullYear(), q * 3, 1);
    return { start: start.toISOString().slice(0, 10), end: today };
  }
  if (period === "year") {
    return { start: `${now.getFullYear()}-01-01`, end: today };
  }
  return null;
}

function FacturesPage() {
  const { statut: statutParam } = Route.useSearch();

  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 300);
  const [statutFilter, setStatutFilter] = useState(statutParam || "all");
  const [period, setPeriod] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [sortField, setSortField] = useState<"date" | "montant">("date");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [debouncedQ, statutFilter, period, clientFilter, sortField, sortDir]);

  const periodDates = period !== "all" ? getPeriodDates(period) : null;

  const {
    data: listResult,
    isLoading,
    isError,
  } = useInvoices({
    statut: statutFilter !== "all" ? statutFilter : undefined,
    client_id: clientFilter !== "all" ? clientFilter : undefined,
    dateFrom: periodDates?.start,
    dateTo: periodDates?.end,
    search: debouncedQ.trim() || undefined,
    sortField,
    sortDir,
    page,
    pageSize: PAGE_SIZE,
  });
  const listData = (listResult as { rows: any[]; total: number } | undefined) ?? {
    rows: [],
    total: 0,
  };
  const filtered = listData.rows;
  const total = listData.total;

  const { data: relances = [] } = useRelances();
  const { data: statutCounts } = useInvoicesStatutCounts();
  // Liste des clients pour le filtre : la liste complète des clients du
  // compte (bornée à 200, cf. useClients), pas uniquement ceux qui ont déjà
  // une facture sur la page courante.
  const { data: allClients = [] } = useClients();
  const clients = useMemo(
    () => allClients.map((c) => ({ id: c.id, nom: c.raison_sociale })),
    [allClients],
  );

  // Build per-invoice relance index
  const relancedSet = useMemo(() => {
    const s = new Set<string>();
    for (const r of relances) s.add(r.facture_id);
    return s;
  }, [relances]);

  const _now = new Date();
  const today = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, "0")}-${String(_now.getDate()).padStart(2, "0")}`;
  const navigate = Route.useNavigate();
  const qc = useQueryClient();

  const activeFiltersCount = [
    q.trim() ? 1 : 0,
    statutFilter !== "all" ? 1 : 0,
    period !== "all" ? 1 : 0,
    clientFilter !== "all" ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  function resetFilters() {
    setQ("");
    setStatutFilter("all");
    setPeriod("all");
    setClientFilter("all");
    setSortField("date");
    setSortDir("desc");
  }

  async function updateStatut(id: string, statut: string) {
    const { error } = await db.from("invoices").update({ statut }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["invoices"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    toast.success("Statut mis à jour");
  }

  const STATUT_FILTERS = [
    { value: "all", label: "Toutes" },
    { value: "brouillon", label: "Brouillon" },
    { value: "envoyee", label: "Envoyée" },
    { value: "payee", label: "Payée" },
    { value: "retard", label: "En retard" },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Factures"
        subtitle={`${total} facture${total > 1 ? "s" : ""}`}
        actions={
          <Button asChild className="shrink-0">
            <Link to="/factures/new">
              <Plus className="mr-2 h-4 w-4" /> Nouvelle facture
            </Link>
          </Button>
        }
      />

      {/* Search + filter toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="N° facture, client, montant…"
            className="pl-9"
          />
        </div>
        <button
          onClick={() => setFiltersOpen((v) => !v)}
          className={cn(
            "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors",
            filtersOpen || activeFiltersCount > 0
              ? "bg-accent/10 border-accent text-accent"
              : "bg-card border-border text-muted-foreground",
          )}
        >
          <Filter className="h-4 w-4" />
          {activeFiltersCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-white">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>

      {/* Quick statut chips */}
      <div className="flex flex-wrap gap-1.5">
        {STATUT_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setStatutFilter(f.value)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
              statutFilter === f.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:text-foreground",
            )}
          >
            {f.label}
            <span className="ml-1.5 opacity-70">{statutCounts?.[f.value] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Filter panel */}
      {filtersOpen && (
        <Card>
          <CardContent className="p-3 space-y-3">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">
                Période
              </div>
              <div className="flex flex-wrap gap-1">
                {[
                  { v: "all", l: "Toutes" },
                  { v: "week", l: "Cette semaine" },
                  { v: "month", l: "Ce mois" },
                  { v: "quarter", l: "Ce trimestre" },
                  { v: "year", l: "Cette année" },
                ].map(({ v, l }) => (
                  <button
                    key={v}
                    onClick={() => setPeriod(v)}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-medium border",
                      period === v
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-muted-foreground border-border",
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
            {clients.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">
                  Client
                </div>
                <select
                  value={clientFilter}
                  onChange={(e) => setClientFilter(e.target.value)}
                  className="w-full rounded-lg border bg-card px-3 py-1.5 text-sm"
                >
                  <option value="all">Tous les clients</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">
                Tri
              </div>
              <div className="flex flex-wrap gap-1">
                {[
                  { f: "date", d: "desc", l: "Date ↓" },
                  { f: "date", d: "asc", l: "Date ↑" },
                  { f: "montant", d: "desc", l: "Montant ↓" },
                  { f: "montant", d: "asc", l: "Montant ↑" },
                ].map(({ f, d, l }) => (
                  <button
                    key={l}
                    onClick={() => {
                      setSortField(f as any);
                      setSortDir(d as any);
                    }}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-medium border",
                      sortField === f && sortDir === d
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-muted-foreground border-border",
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
            {activeFiltersCount > 0 && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" /> Réinitialiser les filtres
              </button>
            )}
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <Skeleton key={item} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <Card className="border-destructive/30">
          <CardContent className="py-10 text-center text-sm text-destructive">
            Impossible de charger les factures.
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {(statutCounts?.all ?? 0) === 0
              ? "Aucune facture. Commencez par en créer une."
              : "Aucune facture pour ces filtres."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div className="col-span-full text-xs text-muted-foreground">
            {total} facture{total > 1 ? "s" : ""}
          </div>
          {filtered.map((inv) => (
            <Card key={inv.id} className="overflow-hidden">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold">Facture N°{inv.numero}</div>
                    <div className="break-words text-sm text-muted-foreground">
                      {(inv.client as any)?.raison_sociale ?? "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDateFR(inv.date_facture)}
                      {inv.echeance ? ` · éch. ${formatDateFR(inv.echeance)}` : ""}
                    </div>
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    <div className="font-bold text-lg">{formatEUR(inv.total_ttc)}</div>
                    <Badge className={cn(STATUT_COLORS[inv.statut] ?? "bg-muted")}>
                      {statutLabel(inv.statut)}
                    </Badge>
                    {/* Relance badges */}
                    {(inv.statut === "retard" || inv.statut === "envoyee") &&
                      (relancedSet.has(inv.id) ? (
                        <div className="ml-1 inline-flex items-center rounded-full bg-accent/15 px-2 py-0.5 text-[9px] font-semibold text-accent">
                          Relancé
                        </div>
                      ) : inv.echeance && inv.echeance < today ? (
                        <div className="inline-flex items-center rounded-full bg-destructive/15 text-destructive text-[9px] font-semibold px-2 py-0.5 ml-1">
                          À relancer
                        </div>
                      ) : null)}
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Link to="/factures/$id" params={{ id: inv.id }}>
                    <Button variant="outline" size="sm" className="min-h-11 text-xs">
                      <FileText className="mr-1 h-3 w-3" />
                      Voir
                    </Button>
                  </Link>
                  {inv.statut === "brouillon" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-h-11 text-xs"
                      onClick={() => updateStatut(inv.id, "envoyee")}
                    >
                      Marquer envoyée
                    </Button>
                  )}
                  {inv.statut === "envoyee" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-h-11 text-xs text-primary"
                      onClick={() => updateStatut(inv.id, "payee")}
                    >
                      Marquer payée
                    </Button>
                  )}
                  {(inv.statut === "envoyee" || inv.statut === "brouillon") && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-h-11 text-xs text-destructive"
                      onClick={() => updateStatut(inv.id, "retard")}
                    >
                      En retard
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          <div className="col-span-full">
            <Pager page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
          </div>
        </div>
      )}
    </PageContainer>
  );
}
