// StatCard générique — absent des composants partagés avant cette phase (seul
// un TechnicianStatCard spécifique aux stats techniciens existe, défini
// localement dans src/routes/_app.stats.tsx : fichier métier, non touché).
// Prêt à être adopté par les écrans (dashboard, stats…) dans une phase
// suivante ; non câblé dans une route cette phase-ci.
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  href,
  search,
  className,
  variant = "default",
  tone,
  service,
}: {
  icon?: LucideIcon;
  label: React.ReactNode;
  value: React.ReactNode;
  trend?: { direction: "up" | "down" | "flat"; label: React.ReactNode };
  /** Rend la carte cliquable (ex. vers /interventions, /factures…). */
  href?: string;
  /** Search params optionnels transmis au Link (ex. { statut: "retard" }). */
  search?: Record<string, unknown>;
  className?: string;
  /**
   * "dense" = sans tuile d'icône, sans enveloppe Card (déjà posée par la
   * surface qui l'accueille) — pour un usage dans une surface déjà cadrée,
   * ex. la forme "Valeurs" d'une fiche du Copilote
   * (design/briefs/copilote-assistant.md §6.11). Le rendu "default"
   * (Dashboard) reste strictement inchangé.
   */
  variant?: "default" | "dense";
  /** Teinte sémantique de la valeur, dense uniquement. */
  tone?: "default" | "success" | "warning" | "destructive";
  /** Ligne de service sous la valeur (ex. "Calcul : ..."), dense uniquement —
   * distingue un fait d'un calcul sans changer la graisse de la valeur. */
  service?: React.ReactNode;
}) {
  if (variant === "dense") {
    return (
      <div className={cn("min-w-0 flex-1", className)}>
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </div>
        <div
          className={cn(
            "mt-2 text-2xl font-bold tracking-tight tabular-nums lg:text-3xl",
            tone === "destructive" && "text-destructive",
            tone === "warning" && "text-warning",
            tone === "success" && "text-success",
          )}
        >
          {value}
        </div>
        {service && <div className="mt-2 text-xs text-muted-foreground">{service}</div>}
      </div>
    );
  }

  const card = (
    <Card
      className={cn(
        "relative",
        href && "transition-all duration-200 hover:border-primary/40",
        className,
      )}
    >
      <CardContent className="flex min-h-32 flex-col items-start gap-3 p-3 lg:min-h-0 lg:flex-row lg:items-center lg:gap-4 lg:p-6">
        {Icon && (
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary lg:h-12 lg:w-12">
            <Icon className="h-4 w-4 lg:h-5 lg:w-5" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold uppercase leading-tight tracking-wide text-muted-foreground lg:text-xs">
            {label}
          </div>
          <div className="mt-2 text-xl font-bold tabular-nums lg:text-2xl">{value}</div>
          {trend && (
            <div
              className={cn(
                "mt-2 flex items-center gap-2 text-xs font-medium",
                trend.direction === "up" && "text-success",
                trend.direction === "down" && "text-destructive",
                trend.direction === "flat" && "text-muted-foreground",
              )}
            >
              {trend.label}
            </div>
          )}
        </div>
        {href && (
          <ChevronRight className="absolute right-3 top-3 h-4 w-4 shrink-0 text-muted-foreground/60 lg:static" />
        )}
      </CardContent>
    </Card>
  );
  return href ? (
    <Link to={href as any} search={search as any} className="block">
      {card}
    </Link>
  ) : (
    card
  );
}
