import { createFileRoute, Link } from "@tanstack/react-router";
import { APP_NAME } from "@/lib/brand";
import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuotes } from "@/lib/queries";
import { formatEUR, formatDateFR, STATUTS_DEVIS } from "@/lib/schemas";
import { Plus, Search, ChevronRight, Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PermissionGate } from "@/components/permission-gate";
import { PageContainer, PageHeader } from "@/components/page-layout";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_app/devis/")({
  head: () => ({ meta: [{ title: `Devis — ${APP_NAME}` }] }),
  component: () => (
    <PermissionGate perm="devis">
      <DevisListPage />
    </PermissionGate>
  ),
});

const STATUT_COLORS: Record<string, string> = {
  brouillon: "bg-muted text-muted-foreground",
  envoye: "bg-accent/15 text-accent",
  accepte: "bg-success/15 text-success",
  refuse: "bg-destructive/15 text-destructive",
  converti: "bg-primary/15 text-primary",
};

function statutLabel(v: string) {
  return STATUTS_DEVIS.find((s) => s.value === v)?.label ?? v;
}

function DevisListPage() {
  const { data: devis = [], isLoading, isError } = useQuotes();
  const [q, setQ] = useState("");
  const [statutFilter, setStatutFilter] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeFiltersCount = statutFilter !== "all" ? 1 : 0;

  const filtered = useMemo(() => {
    let list = [...devis];
    const s = q.trim().toLowerCase();
    if (s) {
      list = list.filter((d) =>
        [d.numero, d.client?.raison_sociale, d.notes]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(s)),
      );
    }
    if (statutFilter !== "all") list = list.filter((d) => d.statut === statutFilter);
    return list;
  }, [devis, q, statutFilter]);

  return (
    <PageContainer>
      <PageHeader
        title="Devis"
        subtitle={`${devis.length} document${devis.length > 1 ? "s" : ""}`}
        actions={
          <Button asChild className="shrink-0">
            <Link to="/devis/new">
              <Plus className="mr-2 h-4 w-4" /> Nouveau devis
            </Link>
          </Button>
        }
      />

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un devis…"
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

      {filtersOpen && (
        <Card>
          <CardContent className="p-3 space-y-3">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">
                Statut
              </div>
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => setStatutFilter("all")}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-medium border",
                    statutFilter === "all"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border",
                  )}
                >
                  Tous
                </button>
                {STATUTS_DEVIS.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setStatutFilter(s.value)}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-medium border",
                      statutFilter === s.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-muted-foreground border-border",
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            {activeFiltersCount > 0 && (
              <button
                onClick={() => setStatutFilter("all")}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" /> Réinitialiser
              </button>
            )}
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <Skeleton key={item} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <Card className="border-destructive/30">
          <CardContent className="py-10 text-center text-sm text-destructive">
            Impossible de charger les devis.
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {devis.length === 0 ? "Aucun devis. Créez-en un !" : "Aucun résultat."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div className="col-span-full text-xs text-muted-foreground">{filtered.length} devis</div>
          {filtered.map((d) => (
            <Link key={d.id} to="/devis/$id" params={{ id: d.id }} className="block">
              <Card className="h-full transition-colors hover:border-accent/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="break-words text-sm font-semibold">{d.numero}</span>
                        <Badge
                          className={cn(
                            STATUT_COLORS[d.statut] ?? "bg-muted text-muted-foreground",
                          )}
                        >
                          {statutLabel(d.statut)}
                        </Badge>
                      </div>
                      <div className="mt-1 break-words text-sm text-muted-foreground">
                        {d.client?.raison_sociale ?? "—"}
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{formatDateFR(d.date_devis)}</span>
                        <span>Validité : {formatDateFR(d.date_validite)}</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-bold text-sm">{formatEUR(d.total_ttc)}</div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto mt-1" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
