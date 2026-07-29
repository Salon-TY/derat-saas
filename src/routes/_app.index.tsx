import { createFileRoute, Link } from "@tanstack/react-router";
import { APP_NAME } from "@/lib/brand";
import {
  useDashboardStats, useSettings, useRelances, useCurrentRole, useMyPoste, useMyAccess,
  useMyTodoCount, usePendingStockRequestsCount, usePassagesAProgrammer, useQuotes,
} from "@/lib/queries";
import { formatEUR, formatDateFR } from "@/lib/schemas";
import {
  ClipboardList, AlertCircle, Plus, UserPlus, FileText,
  AlertTriangle, Package, FileCheck, Bell, ClipboardCheck, PackagePlus, CalendarClock,
} from "lucide-react";
import { useMemo } from "react";
import { PermissionGate } from "@/components/permission-gate";
import { PageContainer, PageHeader, PageSection } from "@/components/page-layout";
import { DashboardHero } from "@/components/dashboard-hero";
import { StatCard } from "@/components/stat-card";
import { AlertCard } from "@/components/alert-card";
import { TaskCard } from "@/components/task-card";
import { QuickActionCard } from "@/components/quick-action-card";

export const Route = createFileRoute("/_app/")({
  head: () => ({ meta: [{ title: `Tableau de bord — ${APP_NAME}` }] }),
  component: () => (
    <PermissionGate perm="accueil">
      <Dashboard />
    </PermissionGate>
  ),
});

function Dashboard() {
  const { data: stats, isLoading } = useDashboardStats();
  const { data: settings } = useSettings();
  const { data: devis = [] } = useQuotes();
  const { data: relances = [] } = useRelances();
  const { data: role } = useCurrentRole();
  const { data: myPoste } = useMyPoste();
  const { can, loading: accessLoading } = useMyAccess();
  const isTechnician = role !== undefined && role !== "owner" && myPoste === "technicien";
  const { data: myTodoCount = 0 } = useMyTodoCount();
  const { data: pendingReapproCount = 0 } = usePendingStockRequestsCount();
  const { data: contratsAProgrammer = [] } = usePassagesAProgrammer();
  const passagesAProgrammerCount = contratsAProgrammer.reduce((s, c) => s + c.restant, 0);
  const devisEnAttente = devis.filter((d) => d.statut === "brouillon" || d.statut === "envoye").length;

  const delaiN3 = settings?.relance_delai_n3 ?? 31;
  // Factures overdue >= N3 days without a niveau 3 relance sent
  const relancesN3Set = useMemo(() => {
    const s = new Set<string>();
    for (const r of relances) if (r.niveau === 3) s.add(r.facture_id);
    return s;
  }, [relances]);
  const miseEnDemeure = useMemo(() => {
    return (stats?.overdueInvoices ?? []).filter(
      (inv: any) => inv.daysLate >= delaiN3 && !relancesN3Set.has(inv.id)
    );
  }, [stats, delaiN3, relancesN3Set]);

  const objectif = settings?.objectif_ca_mensuel ?? 3000;
  const caMonth = stats?.caMonth ?? 0;
  const caProgress = objectif > 0 ? Math.min(100, (caMonth / objectif) * 100) : 0;

  const caDiff = caMonth - (stats?.caPrevMonth ?? 0);
  const caTrend: "up" | "down" | "flat" = caDiff > 0 ? "up" : caDiff < 0 ? "down" : "flat";

  const urgentContracts = (stats?.expiringContracts ?? []).filter((c: any) => c.urgent);
  const soonContracts = (stats?.expiringContracts ?? []).filter((c: any) => !c.urgent);

  return (
    <PageContainer>
      <PageHeader title="Tableau de bord" subtitle="Aperçu de votre activité." />

      {/* Chantiers à faire — technicien uniquement. En pratique, un technicien
          n'atteint jamais cette page (_app.tsx le redirige vers /tech avant de
          monter quoi que ce soit ici) : condition conservée telle quelle. */}
      {isTechnician && myTodoCount > 0 && (
        <AlertCard icon={ClipboardList} tone="primary" href="/interventions">
          <span className="font-semibold text-primary">
            {myTodoCount} chantier{myTodoCount > 1 ? "s" : ""} à faire
          </span>
        </AlertCard>
      )}

      {/* 1. Comment va mon entreprise ? */}
      {!accessLoading && can("tresorerie") && (
        <DashboardHero
          label="CA du mois"
          value={isLoading ? "…" : formatEUR(caMonth)}
          href="/tresorerie"
          trend={
            !isLoading && stats?.caPrevMonth !== undefined
              ? { direction: caTrend, label: `vs mois dernier : ${formatEUR(stats.caPrevMonth)}` }
              : undefined
          }
          objectiveLabel={!isLoading && objectif > 0 ? `${Math.round(caProgress)}% — ${formatEUR(objectif)}` : undefined}
          objectiveProgress={!isLoading && objectif > 0 ? caProgress : undefined}
        />
      )}

      {/* 2. Que dois-je faire aujourd'hui ? */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={ClipboardList}
          label="Interventions du jour"
          value={isLoading ? "…" : stats?.interventionsToday ?? 0}
          href="/interventions"
        />
        {!isLoading && !isTechnician && (
          <StatCard
            icon={ClipboardCheck}
            label="Rapports à vérifier"
            value={stats?.toVerifyCount ?? 0}
            href="/interventions"
          />
        )}
        {!accessLoading && can("factures") && (
          <StatCard
            icon={AlertCircle}
            label={`Impayées (${stats?.unpaidCount ?? 0})`}
            value={isLoading ? "…" : formatEUR(stats?.unpaidTotal)}
            href="/factures"
            search={{ statut: "retard" }}
          />
        )}
      </div>

      {!isLoading && (stats?.todayInterventions?.length ?? 0) > 0 && (
        <PageSection title="Mes interventions aujourd'hui">
          <div className="space-y-3">
            {stats!.todayInterventions.map((inv: any) => (
              <TaskCard
                key={inv.id}
                href={`/interventions/${inv.id}`}
                title={inv.client?.raison_sociale ?? "—"}
                subtitle={inv.type_intervention}
                address={inv.adresse_site}
                phone={inv.client?.telephone}
              />
            ))}
          </div>
        </PageSection>
      )}

      {/* 3. Y a-t-il un problème ? */}
      <div className="space-y-3">
        {!isLoading && !accessLoading && can("factures") && miseEnDemeure.length > 0 && (
          <AlertCard icon={Bell} tone="destructive">
            <span className="font-semibold text-destructive">
              {miseEnDemeure.length} facture{miseEnDemeure.length > 1 ? "s" : ""} nécessite{miseEnDemeure.length > 1 ? "nt" : ""} une mise en demeure
            </span>
            <p className="mt-2 text-xs text-destructive/80">Plus de {delaiN3} jours de retard sans relance niveau 3.</p>
            <ul className="mt-2 space-y-2">
              {miseEnDemeure.map((inv: any) => (
                <li key={inv.id} className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs text-destructive/80">
                    {(inv.client as any)?.raison_sociale ?? "—"} — {formatEUR(inv.total_ttc)} ({inv.daysLate}j)
                  </span>
                  <Link to="/factures/$id" params={{ id: inv.id }} className="shrink-0 text-[10px] font-semibold text-destructive underline">
                    Envoyer maintenant
                  </Link>
                </li>
              ))}
            </ul>
          </AlertCard>
        )}

        {!isLoading && !accessLoading && can("factures") && (stats?.overdueInvoices?.length ?? 0) > 0 && (
          <AlertCard icon={AlertTriangle} tone="destructive">
            <span className="font-semibold text-destructive">
              {stats!.overdueInvoices.length} facture{stats!.overdueInvoices.length > 1 ? "s" : ""} en retard depuis plus de 7 jours
            </span>
            <p className="mt-2 text-xs text-destructive/80">
              {stats!.overdueInvoices.length} affichée{stats!.overdueInvoices.length > 1 ? "s" : ""} sur {stats?.unpaidCount ?? 0} facture{(stats?.unpaidCount ?? 0) > 1 ? "s" : ""} impayée{(stats?.unpaidCount ?? 0) > 1 ? "s" : ""} au total
            </p>
            <ul className="mt-2 space-y-2">
              {stats!.overdueInvoices.map((inv: any) => (
                <li key={inv.id} className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs text-destructive/80">
                    {(inv.client as any)?.raison_sociale ?? "—"} — {formatEUR(inv.total_ttc)} ({inv.daysLate}j de retard)
                  </span>
                  <Link to="/factures/$id" params={{ id: inv.id }} className="shrink-0 text-[10px] font-medium text-destructive underline">
                    Voir
                  </Link>
                </li>
              ))}
            </ul>
          </AlertCard>
        )}

        {/* Devis en attente — relocalisé ici (déjà conditionné à > 0 dans
            l'original, comme les autres alertes, plutôt qu'un vrai KPI permanent). */}
        {!accessLoading && can("devis") && devisEnAttente > 0 && (
          <AlertCard icon={FileCheck} tone="warning" href="/devis">
            <span className="font-semibold">
              {devisEnAttente} devis en attente
            </span>
          </AlertCard>
        )}

        {!isLoading && !accessLoading && can("contrats") && urgentContracts.length > 0 && (
          <AlertCard icon={AlertTriangle} tone="destructive" href="/contrats">
            <span className="font-semibold text-destructive">
              {urgentContracts.length} contrat{urgentContracts.length > 1 ? "s" : ""} expirent dans moins de 7 jours !
            </span>
            <ul className="mt-2 space-y-1">
              {urgentContracts.map((c: any) => (
                <li key={c.id} className="text-xs text-destructive/80">
                  {c.client?.raison_sociale ?? "—"} — expire le {formatDateFR(c.date_fin)}
                </li>
              ))}
            </ul>
          </AlertCard>
        )}

        {!isLoading && !accessLoading && can("contrats") && soonContracts.length > 0 && (
          <AlertCard icon={AlertTriangle} tone="warning" href="/contrats">
            <span className="font-semibold">
              {soonContracts.length} contrat{soonContracts.length > 1 ? "s" : ""} expirant bientôt
            </span>
            <ul className="mt-2 space-y-1">
              {soonContracts.map((c: any) => (
                <li key={c.id} className="text-xs text-muted-foreground">
                  {c.client?.raison_sociale ?? "—"} — expire le {formatDateFR(c.date_fin)}
                </li>
              ))}
            </ul>
          </AlertCard>
        )}

        {!isLoading && !accessLoading && can("stock") && (stats?.stockAlerts?.length ?? 0) > 0 && (
          <AlertCard icon={Package} tone="destructive" href="/stock">
            <span className="font-semibold text-destructive">
              {stats!.stockAlerts.length} emplacement{stats!.stockAlerts.length > 1 ? "s" : ""} en stock bas
            </span>
            <ul className="mt-2 space-y-1">
              {stats!.stockAlerts.map((a: any) => (
                <li key={`${a.product_id}-${a.technicien_id ?? "garage"}`} className="text-xs text-destructive/80">
                  {a.label}
                </li>
              ))}
            </ul>
          </AlertCard>
        )}

        {!isLoading && !accessLoading && can("reappro") && pendingReapproCount > 0 && (
          <AlertCard icon={PackagePlus} tone="warning" href="/reappro">
            <span className="font-semibold">
              {pendingReapproCount} demande{pendingReapproCount > 1 ? "s" : ""} de réappro en attente
            </span>
          </AlertCard>
        )}

        {!isLoading && !accessLoading && can("programmation") && passagesAProgrammerCount > 0 && (
          <AlertCard icon={CalendarClock} tone="warning" href="/programmation">
            <span className="font-semibold">
              {passagesAProgrammerCount} passage{passagesAProgrammerCount > 1 ? "s" : ""} de contrat à programmer
            </span>
          </AlertCard>
        )}
      </div>

      {/* 4. Quels raccourcis utiliser ? */}
      <PageSection title="Actions rapides">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <QuickActionCard icon={Plus} label="Nouvelle intervention rapide" href="/interventions/new" />
          {!accessLoading && can("clients") && (
            <QuickActionCard icon={UserPlus} label="Nouveau client" href="/clients/new" />
          )}
          {!accessLoading && can("factures") && (
            <QuickActionCard icon={FileText} label="Nouvelle facture" href="/factures/new" />
          )}
        </div>
      </PageSection>
    </PageContainer>
  );
}
