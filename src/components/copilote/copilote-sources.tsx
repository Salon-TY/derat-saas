// Zone "Sources" du pied de fiche — dépliant fermé par défaut, expose
// uniquement ce que le serveur calcule déjà (summary/volume/période, voir
// reply-format.server.ts). Jamais de nouvelle donnée ici.
import { ChevronRight } from "lucide-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { AssistantSources } from "@/lib/ai-assistant/contracts";
import { cn } from "@/lib/utils";

export function CopiloteSources({
  sources,
  compact,
}: {
  sources?: AssistantSources;
  compact?: boolean;
}) {
  if (!sources) return <div className={cn("order-2", !compact && "lg:order-1")} />;

  const rows: Array<[string, string]> = [["Résumé", sources.summary]];
  if (sources.period) rows.push(["Période", sources.period]);
  if (sources.volumeShown !== undefined) {
    const total = sources.volumeTotal ?? sources.volumeShown;
    rows.push([
      "Volume",
      `${total} trouvé${total > 1 ? "s" : ""}, ${sources.volumeShown} affiché${sources.volumeShown > 1 ? "s" : ""}`,
    ]);
  }

  return (
    <Collapsible className={cn("order-2", !compact && "lg:order-1")}>
      <CollapsibleTrigger className="group inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground hover:bg-muted">
        <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=open]:rotate-90" />
        Sources
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3 space-y-1.5 rounded-xl bg-muted p-3 text-xs">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-4">
            <span className="shrink-0 text-muted-foreground">{label}</span>
            <span className="text-right tabular-nums">{value}</span>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
