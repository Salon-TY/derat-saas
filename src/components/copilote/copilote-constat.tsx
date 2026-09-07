// Le constat actionnable + la liaison constat → fiche (brief §6.2,
// comportement 4 de la maquette de référence). Construit sur AlertCard en
// variante "flat" (§6.11). PRÊT MAIS MUET pour l'instant : aucun appelant ne
// l'invoque encore, faute de moteur de détection (insights.server.ts, Lot 3)
// — même statut que les formes Comparaison/Tableau/Classement. Ne jamais le
// câbler sur un constat fabriqué.
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";

import { AlertCard } from "@/components/alert-card";

export function CopiloteConstat({
  icon,
  tone = "warning",
  title,
  detail,
  onApprofondir,
  approfondiAt,
  onRevoir,
}: {
  icon: LucideIcon;
  tone?: "primary" | "warning" | "destructive";
  title: string;
  detail?: string;
  /** Absent si déjà approfondi (voir approfondiAt). */
  onApprofondir?: () => void;
  /** Présent une fois le constat approfondi : "HH:mm". */
  approfondiAt?: string;
  onRevoir?: () => void;
}) {
  return (
    <AlertCard icon={icon} tone={tone} variant="flat">
      <div className="font-semibold">{title}</div>
      {detail && <div className="mt-1 text-xs text-muted-foreground">{detail}</div>}
      {approfondiAt ? (
        <button
          type="button"
          onClick={onRevoir}
          className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          → approfondi à{" "}
          <span className="tabular-nums underline underline-offset-2">{approfondiAt}</span>
        </button>
      ) : onApprofondir ? (
        <button
          type="button"
          onClick={onApprofondir}
          className="-ml-2 mt-1 inline-flex min-h-11 items-center gap-1 rounded-xl px-2 text-[13px] font-semibold text-accent hover:bg-accent/8"
        >
          Approfondir <ChevronRight className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </AlertCard>
  );
}
