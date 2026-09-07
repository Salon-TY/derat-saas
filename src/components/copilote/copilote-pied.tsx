// Le pied à trois zones — la signature de la Piste C (brief §4.3) : Sources ·
// Suites · Lecture seule, présent sur chaque fiche sans exception.
import { CopiloteSources } from "./copilote-sources";
import { CopiloteSuites, type CopiloteSuite } from "./copilote-suites";
import type { AssistantSources } from "@/lib/ai-assistant/contracts";
import { cn } from "@/lib/utils";

export function CopilotePied({
  sources,
  suites,
  compact,
  animateIn = true,
  className,
}: {
  sources?: AssistantSources;
  suites?: CopiloteSuite[];
  /** Sheet : le pied reste empilé quelle que soit la largeur (§6.1). */
  compact?: boolean;
  animateIn?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-t border-border/50 bg-[--copilot-footer] px-4 py-3",
        !compact && "lg:flex-row lg:items-center lg:justify-between lg:gap-4 lg:px-6 lg:py-4",
        animateIn && "copilote-pied-in",
        className,
      )}
    >
      <CopiloteSources sources={sources} compact={compact} />
      <CopiloteSuites items={suites} compact={compact} />
      <div className="order-3 shrink-0 text-xs text-muted-foreground">
        Lecture seule · aucune action automatique
      </div>
    </div>
  );
}
