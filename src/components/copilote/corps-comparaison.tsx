// Forme "Comparaison" — deux périodes ou deux entités, avec l'écart rendu
// explicite comme point focal (brief §6.3 état #8). Prête, non alimentée par
// aucun outil actuel (Lot 2) — aucun exemple fabriqué.
import type { CopiloteEcart, CopiloteValeur } from "@/lib/ai-assistant/contracts";
import { cn } from "@/lib/utils";

export function CorpsComparaison({
  left,
  right,
  ecart,
}: {
  left: CopiloteValeur;
  right: CopiloteValeur;
  ecart: CopiloteEcart;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch sm:gap-6">
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {left.label}
        </div>
        <div className="mt-2 text-xl font-semibold tabular-nums">{left.value}</div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {right.label}
        </div>
        <div className="mt-2 text-xl font-semibold tabular-nums">{right.value}</div>
      </div>
      <div className="min-w-0 flex-1 border-t border-border/50 pt-3 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Écart
        </div>
        <div
          className={cn(
            "mt-2 text-2xl font-bold tracking-tight tabular-nums lg:text-3xl",
            ecart.direction === "down" && "text-destructive",
            ecart.direction === "up" && "text-success",
          )}
        >
          {ecart.value}
        </div>
        {ecart.service && <div className="mt-2 text-xs text-muted-foreground">{ecart.service}</div>}
      </div>
    </div>
  );
}
