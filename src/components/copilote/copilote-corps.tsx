// Dispatcheur du corps de fiche — catalogue FERMÉ à 6 formes (contracts.ts).
// Une réponse sans corps typé (ou dont le corps est "texte") retombe sur
// CorpsTexte avec le texte déjà produit par le serveur, jamais une
// improvisation.
import type { CopiloteCorps } from "@/lib/ai-assistant/contracts";
import { CorpsClassement } from "./corps-classement";
import { CorpsComparaison } from "./corps-comparaison";
import { CorpsListe } from "./corps-liste";
import { CorpsTableau } from "./corps-tableau";
import { CorpsTexte } from "./corps-texte";
import { CorpsValeurs } from "./corps-valeurs";

export function CopiloteCorpsRender({
  corps,
  fallbackText,
}: {
  corps?: CopiloteCorps;
  fallbackText: string;
}) {
  if (!corps || corps.kind === "texte") {
    return (
      <CorpsTexte
        text={fallbackText}
        projection={corps?.kind === "texte" ? corps.projection : undefined}
      />
    );
  }
  switch (corps.kind) {
    case "valeurs":
      return <CorpsValeurs items={corps.items} />;
    case "liste":
      return <CorpsListe items={corps.items} />;
    case "comparaison":
      return <CorpsComparaison left={corps.left} right={corps.right} ecart={corps.ecart} />;
    case "tableau":
      return <CorpsTableau columns={corps.columns} rows={corps.rows} />;
    case "classement":
      return <CorpsClassement items={corps.items} />;
    default:
      return <CorpsTexte text={fallbackText} />;
  }
}
