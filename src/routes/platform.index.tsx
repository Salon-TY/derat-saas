import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardList,
  History,
} from "lucide-react";

import { PlatformStatusBadge, formatPlatformDate } from "@/components/platform-ui";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PUBLIC_BRAND_NAME } from "@/lib/brand";
import { usePlatformOverview } from "@/lib/platform/queries";

export const Route = createFileRoute("/platform/")({
  head: () => ({
    meta: [{ title: `Administration SaaS — ${PUBLIC_BRAND_NAME}` }],
  }),
  component: PlatformDashboard,
});

function PlatformDashboard() {
  const overview = usePlatformOverview();

  if (overview.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-full max-w-md" />
        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} className="h-32 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  if (overview.isError || !overview.data) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="py-12 text-center text-sm text-destructive">
          Impossible de charger l’administration de la plateforme.
        </CardContent>
      </Card>
    );
  }

  const { counts, requests, events } = overview.data;
  const cards = [
    {
      label: "Demandes en attente",
      value: counts.pendingRequests,
      icon: ClipboardList,
      tone: "bg-warning/15 text-warning-foreground",
      to: "/platform/demandes" as const,
    },
    {
      label: "Entreprises actives",
      value: counts.activeAccounts,
      icon: CheckCircle2,
      tone: "bg-success/15 text-success",
      to: "/platform/entreprises" as const,
    },
    {
      label: "Entreprises suspendues",
      value: counts.suspendedAccounts,
      icon: AlertTriangle,
      tone: "bg-destructive/10 text-destructive",
      to: "/platform/entreprises" as const,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-accent">Vue d’ensemble</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Administration de la plateforme</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Demandes d’accès, entreprises clientes et historique des décisions.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.label} to={card.to}>
              <Card className="h-full transition-colors hover:border-primary/30">
                <CardContent className="flex min-h-32 items-center gap-4 p-5">
                  <span className={`grid h-12 w-12 place-items-center rounded-2xl ${card.tone}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-3xl font-black tabular-nums">{card.value}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {card.label}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Demandes récentes</h2>
            <Link
              to="/platform/demandes"
              className="inline-flex min-h-11 items-center gap-1 rounded-xl px-3 text-xs font-bold text-primary hover:bg-primary/5"
            >
              Tout voir <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="space-y-2">
            {requests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                  Aucune demande d’accès.
                </CardContent>
              </Card>
            ) : (
              requests.slice(0, 6).map((request) => (
                <Link key={request.id} to="/platform/demandes">
                  <Card className="transition-colors hover:border-primary/30">
                    <CardContent className="flex items-center gap-3 p-4">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                        <Building2 className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{request.companyName}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {request.managerFirstName} {request.managerLastName} ·{" "}
                          {formatPlatformDate(request.createdAt)}
                        </p>
                      </div>
                      <PlatformStatusBadge status={request.status} />
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
          </div>
        </section>

        <section>
          <div className="mb-3 flex min-h-11 items-center gap-2">
            <History className="h-4 w-4 text-accent" />
            <h2 className="text-lg font-bold">Dernières décisions</h2>
          </div>
          <Card>
            <CardContent className="p-4">
              {events.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  Aucun événement enregistré.
                </div>
              ) : (
                <ol className="space-y-4">
                  {events.slice(0, 8).map((event) => (
                    <li key={event.id} className="relative border-l pl-4">
                      <span className="absolute -left-1.5 top-1 h-3 w-3 rounded-full border-2 border-card bg-accent" />
                      <p className="text-sm font-semibold">
                        {event.oldValue ? `${event.oldValue} → ` : ""}
                        {event.newValue}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatPlatformDate(event.createdAt)}
                      </p>
                      {event.reason && (
                        <p className="mt-1 break-words text-xs text-muted-foreground">
                          {event.reason}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
