// Menu du Copilote (⌘K) — complément du pied à trois zones, jamais son
// remplacement (brief §6.8 bis). 3 groupes, tous en lecture seule : aucune
// entrée ne produit autre chose qu'une question posée au Copilote. Les
// entrées sont dérivées des capacités réellement disponibles pour le rôle
// (brief §6.12, "Évolution" — en périmètre de ce lot, contrairement aux
// pistes de découverte qui restent constantes pour l'instant) : un bureau
// sans tresorerie ni stats ne voit pas "Où en suis-je ?".
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { useMyAccess } from "@/lib/queries";

type MenuPerm = "financial" | "stats";

type MenuEntry = {
  label: string;
  question: string;
  perm?: MenuPerm;
};

const GROUPS: Array<{ label: string; items: MenuEntry[] }> = [
  {
    label: "Analyser",
    items: [
      { label: "Où en suis-je ?", question: "Où en suis-je ce mois-ci ?", perm: "financial" },
      {
        label: "Qu’est-ce qui mérite mon attention ?",
        question: "Qu’est-ce qui mérite mon attention aujourd’hui ?",
      },
      { label: "Comprendre mon activité", question: "Aide-moi à comprendre mon activité récente." },
    ],
  },
  {
    label: "Comparer",
    items: [
      {
        label: "Comparer deux périodes",
        question: "Compare le chiffre d’affaires de ce mois au mois précédent.",
        perm: "financial",
      },
      {
        label: "Comparer mes techniciens",
        question: "Compare l’activité de mes techniciens sur la semaine.",
        perm: "stats",
      },
    ],
  },
  {
    label: "Explorer",
    items: [
      { label: "Explorer mes données", question: "Que puis-je consulter dans mes données ?" },
      {
        label: "Surprenez-moi",
        question: "Surprenez-moi : montrez-moi quelque chose d’utile dans mon activité.",
      },
    ],
  },
];

export function CopiloteMenu({ onSelect }: { onSelect: (question: string) => void }) {
  const { can, loading } = useMyAccess();

  function allowed(perm?: MenuPerm): boolean {
    if (!perm) return true;
    if (loading) return false;
    if (perm === "financial") return can("tresorerie") || can("stats");
    return can(perm);
  }

  return (
    <Command role="dialog" aria-label="Menu du Copilote" className="bg-card">
      <CommandList className="max-h-[min(45vh,420px)] p-2">
        {GROUPS.map((group) => {
          const items = group.items.filter((item) => allowed(item.perm));
          if (!items.length) return null;
          return (
            <CommandGroup
              key={group.label}
              heading={group.label}
              className="[&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.14em]"
            >
              {items.map((item) => (
                <CommandItem
                  key={item.label}
                  value={item.label}
                  onSelect={() => onSelect(item.question)}
                  className="min-h-11 rounded-xl text-[13px]"
                >
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          );
        })}
      </CommandList>
      <div className="hidden items-center justify-between gap-2 border-t border-border/50 px-3 py-2 text-xs text-muted-foreground lg:flex">
        <span>Raccourci</span>
        <kbd className="rounded-xl border border-border bg-muted px-1.5 py-0.5 text-[11px]">⌘K</kbd>
      </div>
    </Command>
  );
}
