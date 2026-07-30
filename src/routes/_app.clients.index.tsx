import { createFileRoute, Link } from "@tanstack/react-router";
import { APP_NAME } from "@/lib/brand";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useClients, useClientNuisibleTypes, type Client } from "@/lib/queries";
import {
  Building2,
  ChevronRight,
  Filter,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  Users,
  X,
} from "lucide-react";
import { cn, useDebouncedValue } from "@/lib/utils";
import { PermissionGate } from "@/components/permission-gate";
import { Pager } from "@/components/pager";
import { PageContainer, PageHeader } from "@/components/page-layout";

const PAGE_SIZE = 50;

export const Route = createFileRoute("/_app/clients/")({
  head: () => ({ meta: [{ title: `Clients — ${APP_NAME}` }] }),
  component: () => (
    <PermissionGate perm="clients">
      <ClientsList />
    </PermissionGate>
  ),
});

function clientInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function ClientsList() {
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 300);
  const [nuisibleFilter, setNuisibleFilter] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [debouncedQ, nuisibleFilter]);

  const { data, isLoading, isError } = useClients({
    search: debouncedQ.trim() || undefined,
    type_nuisible: nuisibleFilter !== "all" ? nuisibleFilter : undefined,
    page,
    pageSize: PAGE_SIZE,
  });
  const result = data as { rows: Client[]; total: number } | undefined;
  const clients = result?.rows ?? [];
  const total = result?.total ?? 0;

  const { data: nuisibleTypes = [] } = useClientNuisibleTypes();
  const hasSearch = Boolean(debouncedQ.trim());
  const hasFilter = nuisibleFilter !== "all";
  const hasActiveSearch = hasSearch || hasFilter;

  function resetFilters() {
    setQ("");
    setNuisibleFilter("all");
  }

  return (
    <PageContainer>
      <PageHeader
        title="Clients"
        subtitle="Retrouvez vos contacts, leurs sites et leurs besoins en un coup d’œil."
        actions={
          <Button asChild className="w-full sm:w-auto">
            <Link to="/clients/new">
              <Plus className="h-4 w-4" />
              Ajouter un client
            </Link>
          </Button>
        }
      />

      <Card className="hover:translate-y-0 hover:shadow-soft">
        <CardContent className="space-y-4 p-4 lg:p-6">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Rechercher par nom, adresse, téléphone ou email…"
                className="h-11 pl-10 pr-10"
                aria-label="Rechercher un client"
              />
              {q && (
                <button
                  type="button"
                  onClick={() => setQ("")}
                  className="absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Effacer la recherche"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {nuisibleTypes.length > 0 && (
              <Button
                type="button"
                variant={filtersOpen || hasFilter ? "secondary" : "outline"}
                className="h-11 justify-between sm:w-auto"
                onClick={() => setFiltersOpen((open) => !open)}
                aria-expanded={filtersOpen}
              >
                <span className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filtrer
                </span>
                {hasFilter && (
                  <Badge variant="secondary" className="ml-2 h-5 min-w-5 justify-center px-1.5">
                    1
                  </Badge>
                )}
              </Button>
            )}
          </div>

          {filtersOpen && nuisibleTypes.length > 0 && (
            <div className="space-y-3 border-t border-border/50 pt-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Type de nuisible
                </span>
                {hasFilter && (
                  <button
                    type="button"
                    onClick={() => setNuisibleFilter("all")}
                    className="text-xs font-medium text-primary transition-colors hover:text-primary/80"
                  >
                    Réinitialiser
                  </button>
                )}
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap">
                <FilterChip
                  active={nuisibleFilter === "all"}
                  onClick={() => setNuisibleFilter("all")}
                >
                  Tous
                </FilterChip>
                {nuisibleTypes.map((type) => (
                  <FilterChip
                    key={type}
                    active={nuisibleFilter === type}
                    onClick={() => setNuisibleFilter(type)}
                  >
                    {type}
                  </FilterChip>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {isLoading ? (
        <ClientsLoading />
      ) : isError ? (
        <StateCard
          icon={Users}
          title="Impossible de charger les clients"
          description="Une erreur est survenue pendant le chargement. Réessayez dans quelques instants."
        />
      ) : clients.length === 0 ? (
        <StateCard
          icon={hasActiveSearch ? Search : Building2}
          title={hasActiveSearch ? "Aucun résultat" : "Aucun client pour le moment"}
          description={
            hasActiveSearch
              ? "Aucun client ne correspond à votre recherche ou aux filtres sélectionnés."
              : "Ajoutez votre premier client pour commencer à organiser vos interventions."
          }
          action={
            hasActiveSearch ? (
              <Button type="button" variant="outline" onClick={resetFilters}>
                Réinitialiser la recherche
              </Button>
            ) : (
              <Button asChild>
                <Link to="/clients/new">
                  <Plus className="h-4 w-4" />
                  Ajouter un client
                </Link>
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold tabular-nums text-foreground">{total}</span> client
              {total > 1 ? "s" : ""}
            </p>
            {hasActiveSearch && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs font-medium text-primary transition-colors hover:text-primary/80"
              >
                Tout effacer
              </button>
            )}
          </div>

          <div className="hidden lg:block">
            <ClientsTable clients={clients} />
          </div>

          <div className="grid gap-3 lg:hidden">
            {clients.map((client) => (
              <ClientMobileCard key={client.id} client={client} />
            ))}
          </div>

          <Pager page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        </div>
      )}
    </PageContainer>
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
      className={cn(
        "shrink-0 rounded-full border px-3 py-2 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function ClientsTable({ clients }: { clients: Client[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Client</TableHead>
          <TableHead>Coordonnées</TableHead>
          <TableHead>Site</TableHead>
          <TableHead>Nuisible</TableHead>
          <TableHead className="w-12">
            <span className="sr-only">Ouvrir</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {clients.map((client) => (
          <TableRow key={client.id} className="group">
            <TableCell className="max-w-64">
              <Link
                to="/clients/$id"
                params={{ id: client.id }}
                className="flex min-w-0 items-center gap-3"
              >
                <ClientAvatar name={client.raison_sociale} />
                <span className="truncate font-semibold group-hover:text-primary">
                  {client.raison_sociale}
                </span>
              </Link>
            </TableCell>
            <TableCell className="max-w-64">
              <div className="space-y-1">
                {client.telephone && (
                  <a
                    href={`tel:${client.telephone}`}
                    className="flex items-center gap-2 truncate text-sm hover:text-primary"
                  >
                    <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{client.telephone}</span>
                  </a>
                )}
                {client.email && (
                  <a
                    href={`mailto:${client.email}`}
                    className="flex items-center gap-2 truncate text-xs text-muted-foreground hover:text-primary"
                  >
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{client.email}</span>
                  </a>
                )}
                {!client.telephone && !client.email && (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </div>
            </TableCell>
            <TableCell className="max-w-72">
              {client.adresse_site ? (
                <span className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span className="line-clamp-2">{client.adresse_site}</span>
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              )}
            </TableCell>
            <TableCell>
              {client.type_nuisible ? (
                <Badge variant="secondary">{client.type_nuisible}</Badge>
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              )}
            </TableCell>
            <TableCell>
              <Button
                asChild
                variant="ghost"
                size="icon"
                aria-label={`Ouvrir ${client.raison_sociale}`}
              >
                <Link to="/clients/$id" params={{ id: client.id }}>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ClientMobileCard({ client }: { client: Client }) {
  return (
    <Card className="hover:translate-y-0">
      <CardContent className="p-4">
        <Link
          to="/clients/$id"
          params={{ id: client.id }}
          className="flex min-w-0 items-start gap-3"
        >
          <ClientAvatar name={client.raison_sociale} />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <h2 className="line-clamp-2 font-semibold leading-5">{client.raison_sociale}</h2>
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            </div>
            {client.adresse_site && (
              <p className="mt-2 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="line-clamp-2">{client.adresse_site}</span>
              </p>
            )}
            {client.type_nuisible && (
              <Badge variant="secondary" className="mt-3">
                {client.type_nuisible}
              </Badge>
            )}
          </div>
        </Link>

        {(client.telephone || client.email) && (
          <div className="mt-4 flex gap-2 border-t border-border/50 pt-3">
            {client.telephone && (
              <Button asChild variant="outline" size="sm" className="min-w-0 flex-1">
                <a href={`tel:${client.telephone}`}>
                  <Phone className="h-4 w-4" />
                  Appeler
                </a>
              </Button>
            )}
            {client.email && (
              <Button asChild variant="outline" size="sm" className="min-w-0 flex-1">
                <a href={`mailto:${client.email}`}>
                  <Mail className="h-4 w-4" />
                  Email
                </a>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ClientAvatar({ name }: { name: string }) {
  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-xs font-bold text-primary">
      {clientInitials(name)}
    </span>
  );
}

function ClientsLoading() {
  return (
    <>
      <div className="hidden lg:block">
        <Card className="hover:translate-y-0 hover:shadow-soft">
          <CardContent className="space-y-4 p-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="ml-auto h-4 w-40" />
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-3 lg:hidden">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="hover:translate-y-0 hover:shadow-soft">
            <CardContent className="flex gap-3 p-4">
              <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

function StateCard({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof Users;
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
