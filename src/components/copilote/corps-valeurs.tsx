// Forme "Valeurs" — agrégat de 2 à 4 chiffres. Réutilise StatCard en variante
// "dense" (brief §6.11) : même échelle typographique que le reste de la
// fiche, sans tuile d'icône, sans carte imbriquée.
import { StatCard } from "@/components/stat-card";
import type { CopiloteValeur } from "@/lib/ai-assistant/contracts";

export function CorpsValeurs({ items }: { items: CopiloteValeur[] }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:gap-8">
      {items.slice(0, 4).map((item, index) => (
        <StatCard
          key={`${item.label}-${index}`}
          variant="dense"
          label={item.label}
          value={item.value}
          tone={item.tone}
          service={item.service}
        />
      ))}
    </div>
  );
}
