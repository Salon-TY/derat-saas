// Bloc "Par où commencer ?" — phrase guidante + pistes du jour (≤ 3) + une
// entrée "Surprenez-moi" hors plafond (brief §6.4). Les pistes restent
// aujourd'hui 3 constantes (comportement actuel, ai-assistant-panel.tsx) :
// leur dérivation dynamique par rôle est une évolution listée hors de ce lot
// (brief §6.12, "Simulé" — pas une régression, une continuité assumée).
import { Sparkles } from "lucide-react";

const PISTES = [
  "Quelles interventions sont prévues aujourd’hui ?",
  "Quels rapports sont à vérifier ?",
  "Quelles factures sont en retard ?",
];

export function CopilotePistes({ onSelect }: { onSelect: (question: string) => void }) {
  return (
    <div className="mt-6">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Par où commencer ?
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Vous ne savez pas quoi demander ? Ces pistes portent sur ce que vous pouvez consulter
        aujourd’hui.
      </p>
      <div className="mt-4 flex flex-col gap-2">
        {PISTES.map((piste) => (
          <button
            key={piste}
            type="button"
            onClick={() => onSelect(piste)}
            className="block min-h-11 w-full rounded-xl border border-border/50 bg-card px-3 py-2 text-left text-[13px] font-medium hover:bg-muted"
          >
            {piste}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() =>
          onSelect("Surprenez-moi : montrez-moi quelque chose d’utile dans mon activité.")
        }
        className="-ml-2 mt-2 inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-[13px] font-semibold text-accent hover:bg-accent/8"
      >
        <Sparkles className="h-4 w-4" />
        Surprenez-moi
      </button>
    </div>
  );
}
