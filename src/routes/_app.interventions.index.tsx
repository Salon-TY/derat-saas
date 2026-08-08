import { createFileRoute, Link } from "@tanstack/react-router";
import { APP_NAME } from "@/lib/brand";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useInterventions,
  useAssignableMembers,
  useInterventionsCountByStatut,
  useInterventionNuisibleTypes,
  type Intervention,
  type AssignableMember,
} from "@/lib/queries";
import {
  STATUTS_INTERVENTION,
  STATUT_INTERVENTION_COLORS,
  formatDateFR,
  formatHeure,
  statutInterventionLabel,
} from "@/lib/schemas";
import {
  AlertCircle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Columns3,
  Filter,
  List as ListIcon,
  MapPin,
  Phone,
  Plus,
  Search,
  Sun,
  TriangleAlert,
  UserRound,
  X,
} from "lucide-react";
import { cn, useDebouncedValue } from "@/lib/utils";
import { Pager } from "@/components/pager";
import { PageContainer, PageHeader } from "@/components/page-layout";

const PAGE_SIZE = 50;
const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export const Route = createFileRoute("/_app/interventions/")({
  head: () => ({ meta: [{ title: `Interventions — ${APP_NAME}` }] }),
  component: InterventionsPage,
});

type View = "list" | "day" | "week" | "technicien";

// Hypothèse fixe pour la détection de chevauchement visuel dans la vue
// Technicien — pas de durée estimée par type d'intervention en V1 (cahier
// des charges : idée à évaluer séparément). Non persistée, non configurable.
const SLOT_DURATION_MIN = 60;

function timeToMinutes(t: string): number | null {
  const m = /^(\d{2}):(\d{2})/.exec(t);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function sortBySlot(a: Intervention, b: Intervention) {
  const ta = a.heure_prevue ? timeToMinutes(a.heure_prevue) : null;
  const tb = b.heure_prevue ? timeToMinutes(b.heure_prevue) : null;
  if (ta === null && tb === null) return 0;
  if (ta === null) return 1;
  if (tb === null) return -1;
  return ta - tb;
}

const DEFAULT_GRID_START_HOUR = 7;
const DEFAULT_GRID_END_HOUR = 19;
const GRID_HOUR_HEIGHT_PX = 56;

// Plage d'heures affichée par la grille horaire — 7h-19h par défaut, étendue
// si un créneau planifié tombe en dehors (jamais de donnée cachée).
function computeHourRange(items: Intervention[]): { start: number; end: number } {
  let start = DEFAULT_GRID_START_HOUR;
  let end = DEFAULT_GRID_END_HOUR;
  for (const intervention of items) {
    if (!intervention.heure_prevue) continue;
    const mins = timeToMinutes(intervention.heure_prevue);
    if (mins === null) continue;
    const hourStart = Math.floor(mins / 60);
    const hourEnd = Math.ceil((mins + SLOT_DURATION_MIN) / 60);
    if (hourStart < start) start = hourStart;
    if (hourEnd > end) end = hourEnd;
  }
  return { start, end };
}

// Regroupe les créneaux d'une colonne qui se chevauchent (même logique de
// fenêtre que findConflicts) et attribue à chacun sa position/largeur
// relative dans son groupe, pour un affichage côte à côte façon agenda.
function layoutTimelineItems(
  items: Intervention[],
): { intervention: Intervention; start: number; slot: number; slotCount: number }[] {
  const withStart = items
    .map((intervention) => ({
      intervention,
      start: intervention.heure_prevue ? timeToMinutes(intervention.heure_prevue) : null,
    }))
    .filter((x): x is { intervention: Intervention; start: number } => x.start !== null)
    .sort((a, b) => a.start - b.start);

  const result: { intervention: Intervention; start: number; slot: number; slotCount: number }[] =
    [];
  let cluster: typeof withStart = [];
  let clusterEnd = -Infinity;

  function flushCluster() {
    if (cluster.length === 0) return;
    const n = cluster.length;
    cluster.forEach((entry, index) => {
      result.push({
        intervention: entry.intervention,
        start: entry.start,
        slot: index,
        slotCount: n,
      });
    });
    cluster = [];
  }

  for (const entry of withStart) {
    if (cluster.length === 0 || entry.start < clusterEnd) {
      cluster.push(entry);
      clusterEnd = Math.max(clusterEnd, entry.start + SLOT_DURATION_MIN);
    } else {
      flushCluster();
      cluster = [entry];
      clusterEnd = entry.start + SLOT_DURATION_MIN;
    }
  }
  flushCluster();
  return result;
}

// Créneaux dont la fenêtre [début, début + SLOT_DURATION_MIN[ chevauche un
// autre créneau du même technicien.
function findConflicts(items: Intervention[]): Set<string> {
  const withStart = items
    .map((intervention) => ({
      intervention,
      start: intervention.heure_prevue ? timeToMinutes(intervention.heure_prevue) : null,
    }))
    .filter((x): x is { intervention: Intervention; start: number } => x.start !== null)
    .sort((a, b) => a.start - b.start);
  const conflicts = new Set<string>();
  for (let i = 1; i < withStart.length; i++) {
    const prev = withStart[i - 1];
    const curr = withStart[i];
    if (curr.start < prev.start + SLOT_DURATION_MIN) {
      conflicts.add(prev.intervention.id);
      conflicts.add(curr.intervention.id);
    }
  }
  return conflicts;
}

function toISO(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function weekStart(date: Date): Date {
  const result = startOfDay(date);
  const dayOfWeek = result.getDay();
  result.setDate(result.getDate() + (dayOfWeek === 0 ? -6 : 1 - dayOfWeek));
  return result;
}

function addDays(date: Date, amount: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

function useRangeInterventions(start: string, end: string) {
  return useQuery({
    queryKey: ["interventions_range", start, end],
    queryFn: async (): Promise<Intervention[]> => {
      const { data, error } = await db
        .from("interventions")
        .select("*, client:clients(raison_sociale, telephone)")
        .gte("date", start)
        .lte("date", end)
        .order("date")
        .order("heure_prevue", { ascending: true, nullsFirst: false })
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
}

function InterventionsPage() {
  const [view, setView] = useState<View>("day");
  const today = useMemo(() => startOfDay(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(today);

  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 300);
  const [statutFilter, setStatutFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [technicienFilter, setTechnicienFilter] = useState("all");
  const [technicienPeriod, setTechnicienPeriod] = useState<"day" | "week">("day");
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [debouncedQ, statutFilter, typeFilter, periodFilter, technicienFilter, sortDir]);

  const periodDates = useMemo(() => {
    if (periodFilter === "all") return null;
    const now = new Date();
    const todayString = toISO(now);
    if (periodFilter === "today") return { from: todayString, to: todayString };
    if (periodFilter === "week") {
      const start = weekStart(now);
      return { from: toISO(start), to: toISO(addDays(start, 6)) };
    }
    if (periodFilter === "month") {
      return {
        from: toISO(new Date(now.getFullYear(), now.getMonth(), 1)),
        to: todayString,
      };
    }
    return null;
  }, [periodFilter]);

  const {
    data: listResult,
    isLoading,
    isError,
  } = useInterventions({
    statut: statutFilter !== "all" ? statutFilter : undefined,
    technicien_id: technicienFilter !== "all" ? technicienFilter : undefined,
    type_nuisible: typeFilter !== "all" ? typeFilter : undefined,
    search: debouncedQ.trim() || undefined,
    dateFrom: periodDates?.from,
    dateTo: periodDates?.to,
    sortDir,
    page,
    pageSize: PAGE_SIZE,
  });
  const listData = (listResult as { rows: Intervention[]; total: number } | undefined) ?? {
    rows: [],
    total: 0,
  };
  const filteredList = listData.rows;
  const total = listData.total;

  const { data: assignableMembers = [] } = useAssignableMembers();
  const { data: aVerifierCount = 0 } = useInterventionsCountByStatut("realisee");
  const { data: nuisibleTypes = [] } = useInterventionNuisibleTypes();

  const technicianNames = useMemo(
    () => new Map(assignableMembers.map((member) => [member.user_id, member.display_name])),
    [assignableMembers],
  );

  const activeFiltersCount = [
    q.trim() ? 1 : 0,
    statutFilter !== "all" ? 1 : 0,
    typeFilter !== "all" ? 1 : 0,
    periodFilter !== "all" ? 1 : 0,
    technicienFilter !== "all" ? 1 : 0,
  ].reduce((sum, value) => sum + value, 0);

  const currentWeekStart = weekStart(selectedDate);
  const currentWeekEnd = addDays(currentWeekStart, 6);
  const isDayGranularity = view === "day" || (view === "technicien" && technicienPeriod === "day");
  const rangeStart = isDayGranularity ? toISO(selectedDate) : toISO(currentWeekStart);
  const rangeEnd = isDayGranularity ? toISO(selectedDate) : toISO(currentWeekEnd);
  const {
    data: rangeInterventions = [],
    isLoading: rangeLoading,
    isError: rangeError,
  } = useRangeInterventions(
    view !== "list" ? rangeStart : "9999-01-01",
    view !== "list" ? rangeEnd : "9999-01-01",
  );

  const filteredRangeInterventions = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rangeInterventions.filter((intervention) => {
      if (technicienFilter !== "all" && intervention.technicien_id !== technicienFilter)
        return false;
      if (statutFilter !== "all" && intervention.statut !== statutFilter) return false;
      if (typeFilter !== "all" && intervention.type_nuisible !== typeFilter) return false;
      if (!term) return true;
      return [
        intervention.client?.raison_sociale,
        intervention.adresse_site,
        intervention.type_intervention,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term));
    });
  }, [rangeInterventions, technicienFilter, statutFilter, typeFilter, q]);

  function previousPeriod() {
    setSelectedDate((date) => addDays(date, isDayGranularity ? -1 : -7));
  }

  function nextPeriod() {
    setSelectedDate((date) => addDays(date, isDayGranularity ? 1 : 7));
  }

  const isCurrentPeriod = isDayGranularity
    ? toISO(selectedDate) === toISO(today)
    : toISO(currentWeekStart) === toISO(weekStart(today));

  const headerLabel = isDayGranularity
    ? selectedDate.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : `Semaine du ${currentWeekStart.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
      })} au ${currentWeekEnd.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
      })}`;

  function resetFilters() {
    setQ("");
    setStatutFilter("all");
    setTypeFilter("all");
    setPeriodFilter("all");
    setSortDir("desc");
    setTechnicienFilter("all");
  }

  return (
    <PageContainer>
      <PageHeader
        title="Terrain"
        subtitle="Planifiez et suivez les interventions de votre équipe."
        actions={
          <Button asChild className="w-full sm:w-auto">
            <Link to="/interventions/new">
              <Plus className="h-4 w-4" />
              Ajouter une intervention
            </Link>
          </Button>
        }
      />

      {aVerifierCount > 0 && (
        <button
          type="button"
          onClick={() => {
            setStatutFilter("realisee");
            setView("list");
            setFiltersOpen(false);
          }}
          className="flex w-full items-center gap-3 rounded-2xl border border-warning/50 bg-warning/10 p-4 text-left text-sm transition-colors hover:border-warning"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-warning/20 text-warning-foreground">
            <ClipboardCheck className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">
              {aVerifierCount} rapport{aVerifierCount > 1 ? "s" : ""} à vérifier
            </span>
            <span className="mt-1 block text-xs text-muted-foreground">
              Ouvrir la file des interventions terminées.
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      )}

      <Card className="hover:translate-y-0 hover:shadow-soft">
        <CardContent className="space-y-4 p-4 lg:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div
              className="grid grid-cols-4 gap-1 rounded-xl bg-muted p-1 lg:w-96"
              aria-label="Choisir la vue du planning"
            >
              {[
                { value: "list" as View, label: "Liste", icon: ListIcon },
                { value: "day" as View, label: "Jour", icon: Sun },
                { value: "week" as View, label: "Semaine", icon: CalendarDays },
                { value: "technicien" as View, label: "Technicien", icon: Columns3 },
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setView(value)}
                  aria-pressed={view === value}
                  className={cn(
                    "flex h-10 items-center justify-center gap-2 rounded-xl text-xs font-semibold transition-all",
                    view === value
                      ? "bg-card text-foreground shadow-soft"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>

            {assignableMembers.length > 1 && (
              <div className="flex min-w-0 flex-1 items-center gap-3 lg:justify-end">
                <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" />
                <Select value={technicienFilter} onValueChange={setTechnicienFilter}>
                  <SelectTrigger className="h-11 min-w-0 flex-1 lg:max-w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les techniciens</SelectItem>
                    {assignableMembers.map((member) => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        {member.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {
            <ListControls
              q={q}
              onQueryChange={setQ}
              filtersOpen={filtersOpen}
              onToggleFilters={() => setFiltersOpen((open) => !open)}
              activeFiltersCount={activeFiltersCount}
            />
          }

          {view !== "list" && (
            <PeriodNavigation
              label={headerLabel}
              isCurrentPeriod={isCurrentPeriod}
              onPrevious={previousPeriod}
              onNext={nextPeriod}
              onToday={() => setSelectedDate(startOfDay(new Date()))}
            />
          )}
        </CardContent>
      </Card>

      {filtersOpen && (
        <FilterPanel
          periodFilter={periodFilter}
          onPeriodChange={setPeriodFilter}
          statutFilter={statutFilter}
          onStatusChange={setStatutFilter}
          typeFilter={typeFilter}
          onTypeChange={setTypeFilter}
          nuisibleTypes={nuisibleTypes}
          sortDir={sortDir}
          onSortChange={setSortDir}
          activeFiltersCount={activeFiltersCount}
          onReset={resetFilters}
        />
      )}

      {view === "list" && (
        <ListView
          interventions={filteredList}
          total={total}
          isLoading={isLoading}
          isError={isError}
          hasFilters={activeFiltersCount > 0}
          technicianNames={technicianNames}
          page={page}
          onPageChange={setPage}
          onResetFilters={resetFilters}
        />
      )}

      {view === "day" && (
        <DayView
          date={selectedDate}
          interventions={filteredRangeInterventions}
          isLoading={rangeLoading}
          isError={rangeError}
          today={today}
          technicianNames={technicianNames}
        />
      )}

      {view === "week" && (
        <WeekView
          weekStartDate={currentWeekStart}
          interventions={filteredRangeInterventions}
          selectedDate={selectedDate}
          onSelectDay={(date) => {
            setSelectedDate(date);
            setView("day");
          }}
          today={today}
          isLoading={rangeLoading}
          isError={rangeError}
          technicianNames={technicianNames}
        />
      )}

      {view === "technicien" && (
        <TechnicienView
          interventions={filteredRangeInterventions}
          assignableMembers={assignableMembers}
          isLoading={rangeLoading}
          isError={rangeError}
          period={technicienPeriod}
          onPeriodChange={setTechnicienPeriod}
          weekStartDate={currentWeekStart}
        />
      )}
    </PageContainer>
  );
}

function ListControls({
  q,
  onQueryChange,
  filtersOpen,
  onToggleFilters,
  activeFiltersCount,
}: {
  q: string;
  onQueryChange: (value: string) => void;
  filtersOpen: boolean;
  onToggleFilters: () => void;
  activeFiltersCount: number;
}) {
  return (
    <div className="flex gap-3 border-t border-border/50 pt-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Adresse, nuisible, produit…"
          className="h-11 pl-10 pr-10"
          aria-label="Rechercher une intervention"
        />
        {q && (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            className="absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Effacer la recherche"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <Button
        type="button"
        variant={filtersOpen || activeFiltersCount > 0 ? "secondary" : "outline"}
        className="h-11 shrink-0"
        onClick={onToggleFilters}
        aria-expanded={filtersOpen}
      >
        <Filter className="h-4 w-4" />
        <span className="hidden sm:inline">Filtres</span>
        {activeFiltersCount > 0 && (
          <Badge variant="secondary" className="h-5 min-w-5 justify-center px-1.5">
            {activeFiltersCount}
          </Badge>
        )}
      </Button>
    </div>
  );
}

function PeriodNavigation({
  label,
  isCurrentPeriod,
  onPrevious,
  onNext,
  onToday,
}: {
  label: string;
  isCurrentPeriod: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
}) {
  return (
    <div className="flex items-center gap-2 border-t border-border/50 pt-4">
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="shrink-0"
        onClick={onPrevious}
        aria-label="Période précédente"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="min-w-0 flex-1 text-center">
        <div className="truncate text-sm font-semibold capitalize sm:text-base">{label}</div>
      </div>
      {!isCurrentPeriod && (
        <Button type="button" size="sm" variant="outline" onClick={onToday}>
          Aujourd’hui
        </Button>
      )}
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="shrink-0"
        onClick={onNext}
        aria-label="Période suivante"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

function FilterPanel({
  periodFilter,
  onPeriodChange,
  statutFilter,
  onStatusChange,
  typeFilter,
  onTypeChange,
  nuisibleTypes,
  sortDir,
  onSortChange,
  activeFiltersCount,
  onReset,
}: {
  periodFilter: string;
  onPeriodChange: (value: string) => void;
  statutFilter: string;
  onStatusChange: (value: string) => void;
  typeFilter: string;
  onTypeChange: (value: string) => void;
  nuisibleTypes: string[];
  sortDir: "desc" | "asc";
  onSortChange: (value: "desc" | "asc") => void;
  activeFiltersCount: number;
  onReset: () => void;
}) {
  return (
    <Card className="hover:translate-y-0 hover:shadow-soft">
      <CardContent className="grid gap-6 p-4 md:grid-cols-2 lg:p-6 xl:grid-cols-4">
        <FilterGroup label="Période">
          {[
            { value: "all", label: "Toutes" },
            { value: "today", label: "Aujourd’hui" },
            { value: "week", label: "Cette semaine" },
            { value: "month", label: "Ce mois" },
          ].map((option) => (
            <FilterChip
              key={option.value}
              active={periodFilter === option.value}
              onClick={() => onPeriodChange(option.value)}
            >
              {option.label}
            </FilterChip>
          ))}
        </FilterGroup>

        <FilterGroup label="Statut">
          {[{ value: "all", label: "Tous" }, ...STATUTS_INTERVENTION].map((option) => (
            <FilterChip
              key={option.value}
              active={statutFilter === option.value}
              onClick={() => onStatusChange(option.value)}
            >
              {option.label}
            </FilterChip>
          ))}
        </FilterGroup>

        {nuisibleTypes.length > 0 && (
          <FilterGroup label="Type de nuisible">
            <FilterChip active={typeFilter === "all"} onClick={() => onTypeChange("all")}>
              Tous
            </FilterChip>
            {nuisibleTypes.map((type) => (
              <FilterChip
                key={type}
                active={typeFilter === type}
                onClick={() => onTypeChange(type)}
              >
                {type}
              </FilterChip>
            ))}
          </FilterGroup>
        )}

        <div className="space-y-4">
          <FilterGroup label="Tri">
            <FilterChip active={sortDir === "desc"} onClick={() => onSortChange("desc")}>
              Plus récentes
            </FilterChip>
            <FilterChip active={sortDir === "asc"} onClick={() => onSortChange("asc")}>
              Plus anciennes
            </FilterChip>
          </FilterGroup>
          {activeFiltersCount > 0 && (
            <Button type="button" variant="ghost" size="sm" onClick={onReset}>
              <X className="h-4 w-4" />
              Réinitialiser
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-2 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function ListView({
  interventions,
  total,
  isLoading,
  isError,
  hasFilters,
  technicianNames,
  page,
  onPageChange,
  onResetFilters,
}: {
  interventions: Intervention[];
  total: number;
  isLoading: boolean;
  isError: boolean;
  hasFilters: boolean;
  technicianNames: Map<string, string>;
  page: number;
  onPageChange: (page: number) => void;
  onResetFilters: () => void;
}) {
  if (isLoading) return <PlanningLoading />;
  if (isError) {
    return (
      <PlanningState
        icon={AlertCircle}
        title="Impossible de charger les interventions"
        description="Une erreur est survenue pendant le chargement. Réessayez dans quelques instants."
      />
    );
  }
  if (interventions.length === 0) {
    return (
      <PlanningState
        icon={hasFilters ? Search : CalendarDays}
        title={hasFilters ? "Aucun résultat" : "Aucune intervention"}
        description={
          hasFilters
            ? "Aucune intervention ne correspond aux critères sélectionnés."
            : "Les prochaines interventions apparaîtront ici."
        }
        action={
          hasFilters ? (
            <Button type="button" variant="outline" onClick={onResetFilters}>
              Réinitialiser les filtres
            </Button>
          ) : (
            <Button asChild>
              <Link to="/interventions/new">
                <Plus className="h-4 w-4" />
                Ajouter une intervention
              </Link>
            </Button>
          )
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        <span className="font-semibold tabular-nums text-foreground">{total}</span> intervention
        {total > 1 ? "s" : ""}
      </p>
      <div className="grid gap-3">
        {interventions.map((intervention) => (
          <InterventionListCard
            key={intervention.id}
            intervention={intervention}
            technicianName={
              intervention.technicien_id
                ? technicianNames.get(intervention.technicien_id)
                : undefined
            }
          />
        ))}
      </div>
      <Pager page={page} pageSize={PAGE_SIZE} total={total} onPageChange={onPageChange} />
    </div>
  );
}

function InterventionListCard({
  intervention,
  technicianName,
}: {
  intervention: Intervention;
  technicianName?: string;
}) {
  const clientName = intervention.client?.raison_sociale ?? "Client supprimé";
  return (
    <Card className="hover:border-primary/30">
      <CardContent className="p-4">
        <div className="flex items-start gap-3 lg:items-center">
          <div className="hidden w-24 shrink-0 lg:block">
            <div className="text-sm font-semibold tabular-nums">
              {formatDateFR(intervention.date)}
            </div>
            {formatHeure(intervention.heure_prevue) && (
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <Clock3 className="h-3.5 w-3.5" />
                {formatHeure(intervention.heure_prevue)}
              </div>
            )}
          </div>

          <Link to="/interventions/$id" params={{ id: intervention.id }} className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="min-w-0 truncate font-semibold">{clientName}</h2>
              <StatusBadge status={intervention.statut} />
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
              <span className="lg:hidden">{formatDateFR(intervention.date)}</span>
              {formatHeure(intervention.heure_prevue) && (
                <span className="flex items-center gap-1 lg:hidden">
                  <Clock3 className="h-3.5 w-3.5" />
                  {formatHeure(intervention.heure_prevue)}
                </span>
              )}
              <span>{intervention.type_intervention}</span>
              {intervention.type_nuisible && <span>{intervention.type_nuisible}</span>}
              {technicianName && (
                <span className="flex items-center gap-1">
                  <UserRound className="h-3.5 w-3.5" />
                  {technicianName}
                </span>
              )}
            </div>
            {intervention.adresse_site && (
              <div className="mt-2 flex items-start gap-2 text-xs text-muted-foreground">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="line-clamp-2 lg:truncate">{intervention.adresse_site}</span>
              </div>
            )}
          </Link>

          {intervention.client?.telephone && (
            <Button asChild variant="outline" size="sm" className="shrink-0">
              <a href={`tel:${intervention.client.telephone}`}>
                <Phone className="h-4 w-4" /> Appeler
              </a>
            </Button>
          )}

          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground lg:mt-0" />
        </div>
      </CardContent>
    </Card>
  );
}

function DayView({
  date,
  interventions,
  isLoading,
  isError,
  today,
  technicianNames,
}: {
  date: Date;
  interventions: Intervention[];
  isLoading: boolean;
  isError: boolean;
  today: Date;
  technicianNames: Map<string, string>;
}) {
  const isToday = toISO(date) === toISO(today);
  if (isLoading) return <PlanningLoading count={4} />;
  if (isError) {
    return (
      <PlanningState
        icon={AlertCircle}
        title="Impossible de charger cette journée"
        description="Une erreur est survenue pendant le chargement du planning."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold tabular-nums text-foreground">{interventions.length}</span>{" "}
          intervention{interventions.length !== 1 ? "s" : ""}
        </p>
        <Button asChild size="sm">
          <Link to="/interventions/new">
            <Plus className="h-4 w-4" />
            Nouvelle
          </Link>
        </Button>
      </div>

      {interventions.length === 0 ? (
        <PlanningState
          icon={Sun}
          title={isToday ? "Journée libre aujourd’hui" : "Aucune intervention ce jour"}
          description="Aucune intervention n’est planifiée pour cette date."
        />
      ) : (
        <div className="grid gap-3">
          {interventions.map((intervention) => (
            <PlanningCard
              key={intervention.id}
              intervention={intervention}
              technicianName={
                intervention.technicien_id
                  ? technicianNames.get(intervention.technicien_id)
                  : undefined
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function WeekView({
  weekStartDate,
  interventions,
  selectedDate,
  onSelectDay,
  today,
  isLoading,
  isError,
  technicianNames,
}: {
  weekStartDate: Date;
  interventions: Intervention[];
  selectedDate: Date;
  onSelectDay: (date: Date) => void;
  today: Date;
  isLoading: boolean;
  isError: boolean;
  technicianNames: Map<string, string>;
}) {
  const todayString = toISO(today);
  const selectedString = toISO(selectedDate);
  const byDate = useMemo(() => {
    const grouped: Record<string, Intervention[]> = {};
    for (const intervention of interventions) {
      if (!grouped[intervention.date]) grouped[intervention.date] = [];
      grouped[intervention.date].push(intervention);
    }
    return grouped;
  }, [interventions]);
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStartDate, index));

  if (isLoading) return <PlanningLoading count={7} />;
  if (isError) {
    return (
      <PlanningState
        icon={AlertCircle}
        title="Impossible de charger cette semaine"
        description="Une erreur est survenue pendant le chargement du planning."
      />
    );
  }

  return (
    <>
      <div className="hidden grid-cols-7 gap-3 lg:grid">
        {days.map((day, index) => {
          const dateString = toISO(day);
          const dayInterventions = byDate[dateString] ?? [];
          const isToday = dateString === todayString;
          const isSelected = dateString === selectedString;
          return (
            <section
              key={dateString}
              className={cn(
                "min-w-0 rounded-2xl border bg-card shadow-soft",
                isToday
                  ? "border-accent/50"
                  : isSelected
                    ? "border-primary/40"
                    : "border-border/50",
              )}
            >
              <button
                type="button"
                onClick={() => onSelectDay(day)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-t-2xl border-b border-border/50 p-3 text-left transition-colors hover:bg-muted/50",
                  isToday && "bg-accent/10",
                )}
              >
                <span>
                  <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {JOURS[index]}
                  </span>
                  <span className="mt-1 block text-lg font-bold tabular-nums">{day.getDate()}</span>
                </span>
                <Badge variant={isToday ? "default" : "secondary"}>{dayInterventions.length}</Badge>
              </button>

              <div className="min-h-48 space-y-2 p-2">
                {dayInterventions.length === 0 ? (
                  <p className="px-2 py-6 text-center text-xs text-muted-foreground">Libre</p>
                ) : (
                  dayInterventions.map((intervention) => (
                    <WeekEventCard key={intervention.id} intervention={intervention} />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>

      <div className="space-y-4 lg:hidden">
        {days.map((day, index) => {
          const dateString = toISO(day);
          const dayInterventions = byDate[dateString] ?? [];
          const isToday = dateString === todayString;
          return (
            <section key={dateString} className="space-y-3">
              <button
                type="button"
                onClick={() => onSelectDay(day)}
                className="flex w-full items-center justify-between gap-4 text-left"
              >
                <span className="flex items-center gap-3">
                  <span
                    className={cn(
                      "grid h-10 w-10 place-items-center rounded-xl text-sm font-bold tabular-nums",
                      isToday ? "bg-accent text-accent-foreground" : "bg-primary/10 text-primary",
                    )}
                  >
                    {day.getDate()}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">
                      {day.toLocaleDateString("fr-FR", { weekday: "long" })}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {day.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
                    </span>
                  </span>
                </span>
                <Badge variant="secondary">{dayInterventions.length}</Badge>
              </button>

              {dayInterventions.length === 0 ? (
                <Card className="hover:translate-y-0 hover:shadow-soft">
                  <CardContent className="py-4 text-center text-xs text-muted-foreground">
                    Aucune intervention
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3">
                  {dayInterventions.map((intervention) => (
                    <PlanningCard
                      key={intervention.id}
                      intervention={intervention}
                      technicianName={
                        intervention.technicien_id
                          ? technicianNames.get(intervention.technicien_id)
                          : undefined
                      }
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}

type TechnicienColumn = { id: string; label: string; items: Intervention[] };

// Regroupe une liste d'interventions (d'un seul jour) par technicien —
// factorisé pour être appelé une fois en vue Jour, ou une fois par jour de
// la semaine en vue Semaine.
function buildTechnicienColumns(
  items: Intervention[],
  assignableMembers: AssignableMember[],
): TechnicienColumn[] {
  const byTech = new Map<string, Intervention[]>();
  const unassigned: Intervention[] = [];
  for (const intervention of items) {
    if (intervention.technicien_id) {
      const arr = byTech.get(intervention.technicien_id) ?? [];
      arr.push(intervention);
      byTech.set(intervention.technicien_id, arr);
    } else {
      unassigned.push(intervention);
    }
  }
  const techCols = assignableMembers.map((member) => ({
    id: member.user_id,
    label: member.display_name,
    items: (byTech.get(member.user_id) ?? []).slice().sort(sortBySlot),
  }));
  return [
    ...techCols,
    { id: "none", label: "Non attribué", items: unassigned.slice().sort(sortBySlot) },
  ];
}

function TechnicienView({
  interventions,
  assignableMembers,
  isLoading,
  isError,
  period,
  onPeriodChange,
  weekStartDate,
}: {
  interventions: Intervention[];
  assignableMembers: AssignableMember[];
  isLoading: boolean;
  isError: boolean;
  period: "day" | "week";
  onPeriodChange: (period: "day" | "week") => void;
  weekStartDate: Date;
}) {
  const qc = useQueryClient();
  const [subView, setSubView] = useState<"liste" | "grille">("liste");

  async function updateHeurePrevue(id: string, value: string) {
    const { error } = await db
      .from("interventions")
      .update({ heure_prevue: value || null })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["interventions_range"] });
    qc.invalidateQueries({ queryKey: ["interventions"] });
  }

  if (isLoading) return <PlanningLoading count={4} />;
  if (isError) {
    return (
      <PlanningState
        icon={AlertCircle}
        title="Impossible de charger cette période"
        description="Une erreur est survenue pendant le chargement du planning."
      />
    );
  }

  const weekDays =
    period === "week" ? Array.from({ length: 7 }, (_, i) => addDays(weekStartDate, i)) : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div
          className="inline-flex gap-1 rounded-xl bg-muted p-1"
          role="tablist"
          aria-label="Affichage du planning technicien"
        >
          {(
            [
              { v: "liste" as const, label: "Liste" },
              { v: "grille" as const, label: "Grille horaire" },
            ] as const
          ).map(({ v, label }) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={subView === v}
              onClick={() => setSubView(v)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                subView === v
                  ? "bg-card text-foreground shadow-soft"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div
          className="inline-flex gap-1 rounded-xl bg-muted p-1"
          role="tablist"
          aria-label="Période du planning technicien"
        >
          {(
            [
              { v: "day" as const, label: "Jour" },
              { v: "week" as const, label: "Semaine" },
            ] as const
          ).map(({ v, label }) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={period === v}
              onClick={() => onPeriodChange(v)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                period === v
                  ? "bg-card text-foreground shadow-soft"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {weekDays ? (
        <div className="space-y-6">
          {weekDays.map((date) => {
            const iso = toISO(date);
            const dayItems = interventions.filter((i) => i.date === iso);
            return (
              <div key={iso}>
                <h3 className="mb-2 text-sm font-semibold">
                  {date.toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </h3>
                <DaySchedule
                  items={dayItems}
                  assignableMembers={assignableMembers}
                  subView={subView}
                  onUpdateHeure={updateHeurePrevue}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <DaySchedule
          items={interventions}
          assignableMembers={assignableMembers}
          subView={subView}
          onUpdateHeure={updateHeurePrevue}
        />
      )}
    </div>
  );
}

function DaySchedule({
  items,
  assignableMembers,
  subView,
  onUpdateHeure,
}: {
  items: Intervention[];
  assignableMembers: AssignableMember[];
  subView: "liste" | "grille";
  onUpdateHeure: (id: string, value: string) => void;
}) {
  const columns = useMemo(
    () => buildTechnicienColumns(items, assignableMembers),
    [items, assignableMembers],
  );
  const hourRange = useMemo(() => computeHourRange(items), [items]);

  if (items.length === 0) {
    return <p className="text-xs text-muted-foreground">Aucune intervention planifiée.</p>;
  }

  if (subView === "liste") {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {columns.map((col) => {
          const conflicts = findConflicts(col.items);
          return (
            <Card key={col.id}>
              <CardContent className="space-y-2 p-3">
                <h4 className="text-sm font-semibold">{col.label}</h4>
                {col.items.length === 0 && (
                  <p className="text-xs text-muted-foreground">Aucun créneau</p>
                )}
                {col.items.map((intervention) => {
                  const isConflict = conflicts.has(intervention.id);
                  const currentHeure = formatHeure(intervention.heure_prevue) ?? "";
                  return (
                    <div
                      key={intervention.id}
                      className={cn(
                        "space-y-1 rounded-lg border p-2",
                        isConflict ? "border-destructive/50 bg-destructive/5" : "border-border",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Input
                          type="time"
                          defaultValue={currentHeure}
                          onBlur={(e) => {
                            if (e.target.value !== currentHeure) {
                              onUpdateHeure(intervention.id, e.target.value);
                            }
                          }}
                          className="h-8 w-24 text-xs"
                          aria-label="Heure prévue"
                        />
                        {isConflict && (
                          <TriangleAlert
                            className="h-4 w-4 shrink-0 text-destructive"
                            aria-label="Chevauche un autre créneau"
                          />
                        )}
                      </div>
                      <Link
                        to="/interventions/$id"
                        params={{ id: intervention.id }}
                        className="block truncate text-xs font-medium hover:underline"
                      >
                        {intervention.client?.raison_sociale ?? "Client supprimé"}
                      </Link>
                      {intervention.adresse_site && (
                        <p className="truncate text-xs text-muted-foreground">
                          {intervention.adresse_site}
                        </p>
                      )}
                      <StatusBadge status={intervention.statut} compact />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  return <TechnicienGrid columns={columns} hourRange={hourRange} onUpdateHeure={onUpdateHeure} />;
}

function TechnicienGrid({
  columns,
  hourRange,
  onUpdateHeure,
}: {
  columns: { id: string; label: string; items: Intervention[] }[];
  hourRange: { start: number; end: number };
  onUpdateHeure: (id: string, value: string) => void;
}) {
  const gridHeight = (hourRange.end - hourRange.start) * GRID_HOUR_HEIGHT_PX;
  const hours = Array.from(
    { length: hourRange.end - hourRange.start + 1 },
    (_, i) => hourRange.start + i,
  );

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      <div className="sticky left-0 z-10 w-10 shrink-0 bg-background">
        <div className="h-7" />
        <div className="relative" style={{ height: gridHeight }}>
          {hours.map((h) => (
            <div
              key={h}
              className="absolute right-1 -translate-y-1/2 text-[10px] tabular-nums text-muted-foreground"
              style={{ top: (h - hourRange.start) * GRID_HOUR_HEIGHT_PX }}
            >
              {String(h).padStart(2, "0")}h
            </div>
          ))}
        </div>
      </div>

      {columns.map((col) => {
        const laid = layoutTimelineItems(col.items);
        const unplanned = col.items.filter((i) => !i.heure_prevue);
        const conflicts = findConflicts(col.items);
        return (
          <div key={col.id} className="w-44 shrink-0">
            <h3 className="h-7 truncate text-xs font-semibold">{col.label}</h3>
            <div
              className="relative rounded-lg border border-border bg-muted/10"
              style={{ height: gridHeight }}
            >
              {hours.slice(0, -1).map((h) => (
                <div
                  key={h}
                  className="absolute inset-x-0 border-t border-border/40"
                  style={{ top: (h - hourRange.start) * GRID_HOUR_HEIGHT_PX }}
                />
              ))}
              {laid.map(({ intervention, start, slot, slotCount }) => {
                const top = ((start - hourRange.start * 60) / 60) * GRID_HOUR_HEIGHT_PX;
                const height = Math.max((SLOT_DURATION_MIN / 60) * GRID_HOUR_HEIGHT_PX, 20);
                const widthPct = 100 / slotCount;
                const leftPct = slot * widthPct;
                const isConflict = conflicts.has(intervention.id);
                return (
                  <Link
                    key={intervention.id}
                    to="/interventions/$id"
                    params={{ id: intervention.id }}
                    title={`${formatHeure(intervention.heure_prevue) ?? ""} · ${intervention.client?.raison_sociale ?? "Client supprimé"}${intervention.adresse_site ? ` · ${intervention.adresse_site}` : ""}`}
                    className={cn(
                      "absolute overflow-hidden rounded-md border p-1 text-[10px] leading-tight shadow-sm transition-all hover:z-10 hover:shadow-elevated",
                      STATUT_INTERVENTION_COLORS[intervention.statut] ??
                        "bg-muted text-muted-foreground",
                      isConflict ? "border-destructive" : "border-transparent",
                    )}
                    style={{
                      top,
                      height,
                      left: `calc(${leftPct}% + 2px)`,
                      width: `calc(${widthPct}% - 4px)`,
                    }}
                  >
                    <div className="flex items-center gap-1 font-mono font-semibold">
                      {formatHeure(intervention.heure_prevue)}
                      {isConflict && (
                        <TriangleAlert
                          className="h-2.5 w-2.5 shrink-0 text-destructive"
                          aria-label="Chevauche un autre créneau"
                        />
                      )}
                    </div>
                    <div className="truncate font-medium">
                      {intervention.client?.raison_sociale ?? "Client supprimé"}
                    </div>
                    {intervention.adresse_site && (
                      <div className="truncate opacity-80">{intervention.adresse_site}</div>
                    )}
                  </Link>
                );
              })}
            </div>

            {unplanned.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-[10px] font-medium text-muted-foreground">Non planifiés</p>
                {unplanned.map((intervention) => (
                  <div
                    key={intervention.id}
                    className="flex items-center gap-1.5 rounded border border-border p-1"
                  >
                    <Input
                      type="time"
                      defaultValue=""
                      onBlur={(e) => {
                        if (e.target.value) onUpdateHeure(intervention.id, e.target.value);
                      }}
                      className="h-6 w-16 px-1 text-[10px]"
                      aria-label="Heure prévue"
                    />
                    <Link
                      to="/interventions/$id"
                      params={{ id: intervention.id }}
                      className="truncate text-[10px] hover:underline"
                    >
                      {intervention.client?.raison_sociale ?? "Client supprimé"}
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function WeekEventCard({ intervention }: { intervention: Intervention }) {
  return (
    <Link
      to="/interventions/$id"
      params={{ id: intervention.id }}
      className={cn(
        "block rounded-xl border border-border/50 p-2 transition-colors hover:border-primary/30 hover:bg-muted/40",
        intervention.statut === "annulee" && "opacity-60",
      )}
    >
      {formatHeure(intervention.heure_prevue) && (
        <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold tabular-nums text-primary">
          <Clock3 className="h-3 w-3" />
          {formatHeure(intervention.heure_prevue)}
        </div>
      )}
      <div className="line-clamp-2 text-xs font-semibold leading-4">
        {intervention.client?.raison_sociale ?? "Client supprimé"}
      </div>
      <div className="mt-1 truncate text-[10px] text-muted-foreground">
        {intervention.type_intervention}
      </div>
      <div className="mt-2">
        <StatusBadge status={intervention.statut} compact />
      </div>
    </Link>
  );
}

function PlanningCard({
  intervention,
  technicianName,
}: {
  intervention: Intervention;
  technicianName?: string;
}) {
  const phone = intervention.client?.telephone;
  return (
    <Card className="hover:border-primary/30">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-12 shrink-0 text-center">
            <div className="text-base font-bold tabular-nums">
              {formatHeure(intervention.heure_prevue) ?? "—"}
            </div>
            {formatHeure(intervention.heure_fin) && (
              <div className="mt-1 text-[10px] tabular-nums text-muted-foreground">
                {formatHeure(intervention.heure_fin)}
              </div>
            )}
          </div>

          <Link to="/interventions/$id" params={{ id: intervention.id }} className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="min-w-0 truncate text-sm font-semibold">
                {intervention.client?.raison_sociale ?? "Client supprimé"}
              </h3>
              <StatusBadge status={intervention.statut} />
            </div>
            <p className="mt-2 truncate text-xs text-muted-foreground">
              {intervention.type_intervention}
              {intervention.type_nuisible ? ` · ${intervention.type_nuisible}` : ""}
            </p>
            {technicianName && (
              <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <UserRound className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{technicianName}</span>
              </p>
            )}
            {intervention.adresse_site && (
              <p className="mt-2 flex items-start gap-2 text-xs text-muted-foreground">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="line-clamp-2">{intervention.adresse_site}</span>
              </p>
            )}
          </Link>

          {phone ? (
            <Button asChild variant="outline" size="icon" className="shrink-0">
              <a href={`tel:${phone}`} aria-label="Appeler le client">
                <Phone className="h-4 w-4" />
              </a>
            </Button>
          ) : (
            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status, compact = false }: { status: string; compact?: boolean }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full font-medium uppercase",
        compact ? "px-2 py-0.5 text-[9px]" : "px-2 py-1 text-[10px]",
        STATUT_INTERVENTION_COLORS[status] ?? "bg-muted text-muted-foreground",
        status === "annulee" && "line-through",
      )}
    >
      {statutInterventionLabel(status)}
    </span>
  );
}

function PlanningLoading({ count = 5 }: { count?: number }) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="hover:translate-y-0 hover:shadow-soft">
          <CardContent className="flex items-center gap-4 p-4">
            <Skeleton className="h-10 w-12 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-3/4" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function PlanningState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof CalendarDays;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="hover:translate-y-0 hover:shadow-soft">
      <CardContent className="flex flex-col items-center px-6 py-12 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <h2 className="mt-4 font-semibold">{title}</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
        {action && <div className="mt-6">{action}</div>}
      </CardContent>
    </Card>
  );
}
