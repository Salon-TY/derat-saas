// Le gabarit de fiche — chaque réponse du Copilote est une consultation
// datée, composée comme une fiche (brief §4.1/§6.2). Trois bandes empilées :
// en-tête (filet + intitulé + heure) / corps (une des 6 formes) / pied (la
// signature à trois zones). Prop `compact` = variante du Sheet, même gabarit.
//
// Réutilise Card telle quelle comme surface (bg-card, rounded-[20px],
// shadow-soft déjà posés par ui/card.tsx) ; le survol est neutralisé par
// className sur l'instance, jamais en modifiant card.tsx (Phase A commitée).
import { Card } from "@/components/ui/card";
import { CopilotePied } from "./copilote-pied";
import type { CopiloteSuite } from "./copilote-suites";
import type { AssistantSources } from "@/lib/ai-assistant/contracts";
import { cn } from "@/lib/utils";

export function CopiloteFiche({
  title,
  time,
  loading,
  compact,
  animateIn = true,
  children,
  sources,
  suites,
  showPied = true,
  className,
}: {
  title: React.ReactNode;
  time?: string;
  loading?: boolean;
  compact?: boolean;
  animateIn?: boolean;
  children?: React.ReactNode;
  sources?: AssistantSources;
  suites?: CopiloteSuite[];
  showPied?: boolean;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden hover:shadow-soft hover:translate-y-0",
        animateIn && "copilote-fiche-in",
        className,
      )}
    >
      {/* Filet d'en-tête — signature secondaire, tracé de gauche à droite à
          l'émission (brief §4.3). */}
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-0.5 bg-[--copilot-rule]",
          animateIn && "copilote-rule-in",
        )}
        aria-hidden="true"
      />
      <div
        className={cn(
          "flex items-baseline justify-between gap-4 px-4 pt-3",
          !compact && "lg:px-6 lg:pt-4",
          loading && "copilote-attente",
        )}
        aria-live={loading ? "polite" : undefined}
      >
        <h2 className="min-w-0 truncate text-base font-semibold tracking-tight">{title}</h2>
        {time && (
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{time}</span>
        )}
      </div>
      {children && <div className={cn("px-4 py-4", !compact && "lg:px-6 lg:py-6")}>{children}</div>}
      {showPied && (
        <CopilotePied sources={sources} suites={suites} compact={compact} animateIn={animateIn} />
      )}
    </Card>
  );
}
