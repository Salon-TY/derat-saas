// Forme "Texte" — explication, réponse ambiguë, absence de résultat. Support
// optionnel de la projection (§6.2) : hypothèse visible, jamais rendue dans
// la graisse d'un fait. Rien n'alimente encore `projection` (Lot 2) — prête,
// muette, jamais peuplée par anticipation.
import type { CopiloteProjection } from "@/lib/ai-assistant/contracts";

export function CorpsTexte({
  text,
  projection,
}: {
  text: string;
  projection?: CopiloteProjection;
}) {
  return (
    <div className="space-y-4">
      <p className="whitespace-pre-wrap text-sm leading-relaxed">{text}</p>
      {projection && (
        <div>
          <span className="inline-block rounded-xl bg-muted px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Projection — hypothèse : {projection.hypothesis}
          </span>
          <div className="mt-2 text-xl font-medium tabular-nums">{projection.value}</div>
          <p className="mt-2 text-sm text-muted-foreground">{projection.note}</p>
        </div>
      )}
    </div>
  );
}
