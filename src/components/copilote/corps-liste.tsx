// Forme "Liste" — résultats énumérables (interventions, factures, clients,
// devis…). Lignes séparées par un filet, cible tactile ≥ 44px.
import { Link } from "@tanstack/react-router";

import type { CopiloteListeItem } from "@/lib/ai-assistant/contracts";
import { cn } from "@/lib/utils";

export function CorpsListe({ items }: { items: CopiloteListeItem[] }) {
  return (
    <div className="flex flex-col">
      {items.map((item, index) => (
        <div
          key={`${item.title}-${index}`}
          className={cn(
            "copilote-item-in flex min-h-11 items-center gap-3 py-3",
            index > 0 && "border-t border-border/50",
          )}
        >
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">{item.title}</div>
            {item.qualifier && (
              <div className="mt-1 truncate text-xs tabular-nums text-muted-foreground">
                {item.qualifier}
              </div>
            )}
          </div>
          {item.href && (
            <Link
              to={item.href as any}
              className="inline-flex min-h-11 shrink-0 items-center rounded-xl px-2 text-[13px] font-semibold text-accent hover:bg-accent/8"
            >
              {item.linkLabel ?? "Voir"}
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
