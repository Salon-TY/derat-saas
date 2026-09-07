// Zone "Suites" du pied de fiche — 2 à 3 liens maximum, deux natures
// distinguées par un glyphe (jamais une couleur) : "approfondissement" reste
// dans le Copilote (émet une nouvelle fiche), "navigation" quitte vers un
// écran existant de l'app (brief §6.2).
import { ChevronRight, ExternalLink } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { cn } from "@/lib/utils";

export type CopiloteSuite = {
  label: string;
  nature: "approfondissement" | "navigation";
  /** Requis pour "navigation". */
  href?: string;
  /** Requis pour "approfondissement". */
  onSelect?: () => void;
};

export function CopiloteSuites({
  items = [],
  compact,
}: {
  items?: CopiloteSuite[];
  compact?: boolean;
}) {
  const visible = items.slice(0, 3);
  return (
    <div
      className={cn(
        "order-1 flex flex-wrap gap-2",
        !compact && "lg:order-2 lg:flex-1 lg:justify-end",
      )}
    >
      {visible.map((item) =>
        item.nature === "navigation" && item.href ? (
          <Link
            key={item.label}
            to={item.href as any}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-accent/35 px-3 text-[13px] font-semibold text-accent hover:bg-accent/8"
          >
            {item.label}
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <button
            key={item.label}
            type="button"
            onClick={item.onSelect}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-accent/35 px-3 text-[13px] font-semibold text-accent hover:bg-accent/8"
          >
            {item.label}
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        ),
      )}
    </div>
  );
}
