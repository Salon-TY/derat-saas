// Page principale du Copilote — Piste C « La consultation »
// (design/briefs/copilote-assistant.md). Chaque réponse est une fiche
// composée en trois bandes (en-tête / corps / pied), empilées dans un fil ;
// la fiche du jour reste à l'état calme tant qu'aucun moteur de détection
// (Lot 3) n'existe (voir CopiloteEtatCalme).
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

import { APP_NAME } from "@/lib/brand";
import { PageContainer, PageHeader } from "@/components/page-layout";
import { PermissionGate } from "@/components/permission-gate";
import { Card } from "@/components/ui/card";
import { CopiloteCorpsRender } from "@/components/copilote/copilote-corps";
import { CopiloteEtatCalme } from "@/components/copilote/copilote-etat-calme";
import { CopiloteFiche } from "@/components/copilote/copilote-fiche";
import { CopilotePistes } from "@/components/copilote/copilote-pistes";
import { CopiloteSaisie } from "@/components/copilote/copilote-saisie";
import type { CopiloteSuite } from "@/components/copilote/copilote-suites";
import { useCopiloteFil } from "@/lib/ai-assistant/use-copilote-fil";

export const Route = createFileRoute("/_app/assistant")({
  head: () => ({ meta: [{ title: `Copilote — ${APP_NAME}` }] }),
  component: () => (
    <PermissionGate perm="assistant_ia">
      <AssistantPage />
    </PermissionGate>
  ),
});

function useTodayLabel() {
  const [now] = useState(() => new Date());
  const dateLabel = now.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeLabel = formatTime(now);
  return { dateLabel, timeLabel };
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function AssistantPage() {
  const { dateLabel, timeLabel } = useTodayLabel();
  const { entries, submit, toggleExpanded, isExpanded } = useCopiloteFil();
  const [menuOpen, setMenuOpen] = useState(false);
  const loading = entries.some((entry) => entry.status === "loading");

  return (
    <PageContainer className="max-w-5xl">
      <PageHeader title="Copilote" subtitle="Consultation sécurisée en lecture seule" />

      {/* ⌘K borné à la surface du Copilote — jamais un écouteur global sur
          window (brief §6.8 bis), pour rester disponible à une future
          palette de recherche globale. */}
      <div
        className="space-y-4 lg:space-y-6"
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
            event.preventDefault();
            setMenuOpen((open) => !open);
          }
        }}
      >
        <CopiloteFiche
          title={`Relevé du ${dateLabel}`}
          time={timeLabel}
          sources={{ summary: `Vérifié le ${dateLabel} à ${timeLabel}.` }}
          suites={[]}
        >
          <CopiloteEtatCalme />
        </CopiloteFiche>

        {entries.map((entry, index) => {
          const last = index === entries.length - 1;
          const expanded = isExpanded(entry.id, last);

          if (!expanded) {
            return (
              <Card
                key={entry.id}
                className="overflow-hidden p-0 hover:shadow-soft hover:translate-y-0"
              >
                <button
                  type="button"
                  onClick={() => toggleExpanded(entry.id)}
                  aria-expanded={false}
                  className="flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left lg:px-6"
                >
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                    {entry.question}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {entry.time}
                  </span>
                </button>
              </Card>
            );
          }

          const reply = entry.reply;
          const suites: CopiloteSuite[] = (reply?.links ?? []).slice(0, 3).map((link) => ({
            label: link.label,
            nature: "navigation",
            href: link.href,
          }));

          return (
            <CopiloteFiche
              key={entry.id}
              title={entry.question}
              time={entry.time}
              loading={entry.status === "loading"}
              sources={entry.status === "loading" ? undefined : reply?.sources}
              suites={entry.status === "loading" ? undefined : suites}
              showPied={entry.status !== "loading"}
            >
              {entry.status === "loading" ? (
                <p className="text-xs text-muted-foreground">Consultation…</p>
              ) : (
                <CopiloteCorpsRender corps={reply?.body} fallbackText={reply?.answer ?? ""} />
              )}
            </CopiloteFiche>
          );
        })}

        {entries.length === 0 && <CopilotePistes onSelect={submit} />}

        <CopiloteSaisie
          onSubmit={submit}
          disabled={loading}
          menuOpen={menuOpen}
          onMenuOpenChange={setMenuOpen}
        />
      </div>
    </PageContainer>
  );
}
