/* eslint-disable @typescript-eslint/no-explicit-any */
// Correspondance outil → corps structuré du Copilote (Lot 1, cf. cadrage
// technique 2026-09-03 et brief design/briefs/copilote-assistant.md §6.2).
//
// Règle stricte : cette correspondance ne fait qu'EXPOSER une donnée déjà
// calculée par tools.server.ts (items/summary/total/period existants) — elle
// n'invente rien, ne recalcule rien, n'appelle aucune requête. Le catalogue de
// formes est fermé à 6 entrées ; un outil sans correspondance honnête retombe
// sur "texte" côté appelant (assistant.server.ts), jamais une improvisation.
//
// Volontairement absent ici : toute correspondance vers "comparaison",
// "tableau" ou "classement" — aucun des 10 outils actuels ne fournit une
// donnée qui justifie honnêtement ces formes (elles dépendent du Lot 2 :
// stats techniciens, objectif CA…). Ne jamais les peupler par anticipation.

import { formatEUR } from "@/lib/schemas";
import type { AssistantSources, CopiloteCorps, CopiloteListeItem } from "./contracts";
import type { ToolExecutionResult } from "./tools.server";

const MAPPABLE_TOOLS = new Set([
  "get_revenue_overview",
  "list_interventions",
  "search_clients",
  "get_client_history",
  "list_reports_to_review",
  "search_invoices",
  "search_quotes",
  "search_contracts",
  "search_stock",
  "list_technician_interventions",
]);

export function isMappableTool(name: string): boolean {
  return MAPPABLE_TOOLS.has(name);
}

function listeOrTexte(items: CopiloteListeItem[]): CopiloteCorps {
  // Un résultat vide se lit comme une phrase d'absence (state "aucun
  // résultat" du brief), jamais comme une Liste vide — la forme suit ce qui
  // existe réellement.
  return items.length > 0 ? { kind: "liste", items } : { kind: "texte" };
}

function revenueOverviewBody(result: ToolExecutionResult): CopiloteCorps {
  const row = result.items[0] as
    | {
        revenue_current_month_ttc?: number;
        revenue_previous_month_ttc?: number;
        unpaid_total_ttc?: number;
        unpaid_count?: number;
      }
    | undefined;
  if (!row) return { kind: "texte" };
  const unpaid = Number(row.unpaid_total_ttc ?? 0);
  const unpaidCount = Number(row.unpaid_count ?? 0);
  return {
    kind: "valeurs",
    items: [
      {
        label: "CA du mois",
        value: formatEUR(row.revenue_current_month_ttc ?? 0),
        service: "Calcul : CA selon le tableau de bord.",
      },
      {
        label: "Mois précédent",
        value: formatEUR(row.revenue_previous_month_ttc ?? 0),
      },
      {
        label: "Impayés",
        value: formatEUR(unpaid),
        tone: unpaid > 0 ? "destructive" : "default",
        service: unpaidCount > 0 ? `${unpaidCount} facture(s).` : undefined,
      },
    ],
  };
}

function interventionListe(items: ToolExecutionResult["items"]): CopiloteListeItem[] {
  return (items as any[]).map((item) => ({
    title: item.client ?? "Intervention",
    qualifier: [item.date, item.address, item.status].filter(Boolean).join(" · "),
    href: item.id ? `/interventions/${item.id}` : undefined,
    linkLabel: "Voir",
  }));
}

function mapToolResultToBodyInner(name: string, result: ToolExecutionResult): CopiloteCorps {
  switch (name) {
    case "get_revenue_overview":
      return revenueOverviewBody(result);

    case "list_interventions":
      return listeOrTexte(interventionListe(result.items));

    case "search_clients":
      return listeOrTexte(
        (result.items as any[]).map((item) => ({
          title: item.raison_sociale,
          qualifier: item.adresse_site ?? item.telephone ?? undefined,
          href: item.id ? `/clients/${item.id}` : undefined,
          linkLabel: "Voir",
        })),
      );

    case "get_client_history": {
      const entry = result.items[0] as { interventions?: any[] } | undefined;
      return listeOrTexte(
        (entry?.interventions ?? []).map((item) => ({
          title: `Intervention du ${item.date}`,
          qualifier: [item.type, item.status].filter(Boolean).join(" · "),
          href: item.id ? `/interventions/${item.id}` : undefined,
          linkLabel: "Voir",
        })),
      );
    }

    case "list_reports_to_review":
      return listeOrTexte(
        (result.items as any[]).map((item) => ({
          title: item.client ?? "Rapport",
          qualifier: [item.date, item.technician].filter(Boolean).join(" · "),
          href: item.id ? `/interventions/${item.id}` : undefined,
          linkLabel: "Voir",
        })),
      );

    case "search_invoices":
      return listeOrTexte(
        (result.items as any[]).map((item) => ({
          title: `Facture N°${item.number}${item.client ? ` — ${item.client}` : ""}`,
          qualifier: [
            formatEUR(item.total_ttc ?? 0),
            item.status,
            item.due_date ? `échéance ${item.due_date}` : undefined,
          ]
            .filter(Boolean)
            .join(" · "),
          href: item.id ? `/factures/${item.id}` : undefined,
          linkLabel: "Voir",
        })),
      );

    case "search_quotes":
      return listeOrTexte(
        (result.items as any[]).map((item) => ({
          title: `Devis ${item.number}${item.client ? ` — ${item.client}` : ""}`,
          qualifier: [
            formatEUR(item.total_ttc ?? 0),
            item.status,
            item.valid_until ? `valide jusqu'au ${item.valid_until}` : undefined,
          ]
            .filter(Boolean)
            .join(" · "),
          href: item.id ? `/devis/${item.id}` : undefined,
          linkLabel: "Voir",
        })),
      );

    case "search_contracts":
      return listeOrTexte(
        (result.items as any[]).map((item) => ({
          title: `${item.number ?? "Contrat"}${item.client ? ` — ${item.client}` : ""}`,
          qualifier: [item.establishment, item.end_date ? `échéance ${item.end_date}` : undefined]
            .filter(Boolean)
            .join(" · "),
          href: item.id ? `/contrats/${item.id}` : undefined,
          linkLabel: "Voir",
        })),
      );

    case "search_stock":
      return listeOrTexte(
        (result.items as any[]).map((item) => ({
          title: item.product,
          qualifier: [
            item.location,
            `${item.quantity} ${item.unit ?? ""}`.trim(),
            item.low_stock ? "sous le seuil" : undefined,
          ]
            .filter(Boolean)
            .join(" · "),
        })),
      );

    case "list_technician_interventions":
      return listeOrTexte(
        (result.items as any[]).map((item) => ({
          title: [item.technician, item.date].filter(Boolean).join(" — "),
          qualifier: [item.client, item.status].filter(Boolean).join(" · "),
          href: item.id ? `/interventions/${item.id}` : undefined,
          linkLabel: "Voir",
        })),
      );

    default:
      return { kind: "texte" };
  }
}

/**
 * Construit le corps structuré à partir du résultat déjà obtenu d'un outil.
 * N'est appelé que lorsqu'un seul nom d'outil distinct a été utilisé sur tout
 * le tour de conversation (voir assistant.server.ts) — au-delà, la réponse
 * reste en forme Texte plutôt que de fusionner des résultats hétérogènes.
 */
export function mapToolResultToBody(name: string, result: ToolExecutionResult): CopiloteCorps {
  if (!isMappableTool(name)) return { kind: "texte" };
  return mapToolResultToBodyInner(name, result);
}

/**
 * Expose ce que le serveur a déjà calculé (summary, volume réel vs affiché,
 * période) pour la zone "Sources" du pied de fiche — jamais de nouvelle
 * donnée, uniquement ce qui existe déjà dans ToolExecutionResult.
 */
export function mapToolResultToSources(result: ToolExecutionResult): AssistantSources {
  return {
    summary: result.summary,
    volumeShown: result.items.length,
    volumeTotal: result.total,
    period: result.period,
  };
}
