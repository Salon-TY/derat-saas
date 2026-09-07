// L'état "rien à signaler" — le seul emplacement d'une illustration (budget
// d'expression, brief §4.4). "Mieux vaut une interface calme qu'une fausse
// impression d'intelligence" (§11 de la règle Copilote) : reste l'état par
// défaut réel de la fiche du jour tant qu'aucun moteur de détection
// (insights.server.ts, Lot 3) n'existe — jamais un constat fabriqué.
export function CopiloteEtatCalme() {
  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      <svg viewBox="0 0 96 96" className="h-20 w-20" aria-hidden="true">
        <rect
          x="14"
          y="24"
          width="68"
          height="52"
          rx="8"
          fill="none"
          stroke="var(--border)"
          strokeWidth="2"
        />
        <path
          d="M26 40h30M26 50h44M26 60h24"
          stroke="var(--border)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="70" cy="34" r="10" fill="none" stroke="var(--success)" strokeWidth="2" />
        <path
          d="M65.5 34.5l3.5 3.5 6-7"
          fill="none"
          stroke="var(--success)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="font-semibold">Rien à signaler aujourd’hui.</div>
      <p className="max-w-[44ch] text-sm text-muted-foreground">
        Aucun écart significatif détecté sur votre activité. Vous pouvez tout de même poser une
        question ci-dessous.
      </p>
    </div>
  );
}
