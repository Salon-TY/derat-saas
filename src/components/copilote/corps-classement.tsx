// Forme "Classement" — ordre entre entités comparables (techniciens). Reprend
// le motif de barre de proportion déjà présent dans _app.stats.tsx:235-239.
// Prête, non alimentée par aucun outil actuel (Lot 2).
import type { CopiloteClassementItem } from "@/lib/ai-assistant/contracts";
import { cn } from "@/lib/utils";

export function CorpsClassement({ items }: { items: CopiloteClassementItem[] }) {
  return (
    <div className="flex flex-col gap-4">
      {items.map((item) => (
        <div key={item.rank} className="copilote-item-in flex items-center gap-3">
          <span
            className={cn(
              "grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold",
              item.rank === 1
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            {item.rank}
          </span>
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <span className={cn("truncate", item.rank === 1 ? "font-bold" : "font-medium")}>
                {item.label}
              </span>
              <span className="shrink-0 font-semibold tabular-nums">{item.value}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.min(100, Math.max(0, item.percent))}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
