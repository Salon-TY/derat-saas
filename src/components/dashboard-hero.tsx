// Carte "hero" du dashboard — dominante visuellement, seule à afficher un
// indicateur avec tendance + barre de progression d'objectif. Rien dans les
// Phases A/B ne joue ce rôle (StatCard est pour une métrique simple).
// Purement présentationnel : ne reçoit que des valeurs déjà calculées par la
// page (aucun calcul ici).
// Phase C.1 : dégradé de marque + décor SVG en colonne droite (aucun contenu
// métier dans cette colonne — tout le contenu reste en colonne gauche).
import { Link } from "@tanstack/react-router";
import { Euro, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function DashboardHero({
  label,
  value,
  href,
  trend,
  objectiveLabel,
  objectiveProgress,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  href?: string;
  trend?: { direction: "up" | "down" | "flat"; label: React.ReactNode };
  objectiveLabel?: React.ReactNode;
  /** 0-100 */
  objectiveProgress?: number;
  className?: string;
}) {
  const TrendIcon = trend?.direction === "up" ? TrendingUp : trend?.direction === "down" ? TrendingDown : Minus;

  const content = (
    <Card
      className={cn(
        "relative overflow-hidden border-none bg-gradient-to-br from-primary to-primary/85 text-primary-foreground",
        className,
      )}
    >
      {/* Décor — colonne droite uniquement, aucun contenu métier */}
      <svg
        aria-hidden="true"
        viewBox="0 0 200 200"
        className="pointer-events-none absolute -right-12 -top-12 hidden h-72 w-72 md:block"
      >
        <circle cx="100" cy="100" r="90" fill="currentColor" className="text-primary-foreground/10" />
        <circle cx="30" cy="170" r="46" fill="currentColor" className="text-primary-foreground/10" />
      </svg>

      <CardContent className="relative z-10 grid gap-6 p-6 md:grid-cols-[1fr_6rem] md:items-center md:p-8">
        <div className="min-w-0">
          <div className="flex items-center gap-4 md:gap-6">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-accent text-accent-foreground md:h-16 md:w-16">
              <Euro className="h-7 w-7 md:h-8 md:w-8" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium uppercase tracking-wide text-primary-foreground/70">{label}</div>
              <div className="mt-2 text-4xl font-bold tracking-tight tabular-nums md:text-5xl">{value}</div>
              {trend && (
                <div
                  className={cn(
                    "mt-2 flex items-center gap-2 text-sm font-medium",
                    trend.direction === "up" && "text-success",
                    trend.direction === "down" && "text-destructive",
                    trend.direction === "flat" && "text-primary-foreground/70",
                  )}
                >
                  <TrendIcon className="h-4 w-4 shrink-0" />
                  <span>{trend.label}</span>
                </div>
              )}
            </div>
          </div>

          {objectiveProgress !== undefined && (
            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between text-xs text-primary-foreground/70">
                <span>Objectif mensuel</span>
                {objectiveLabel}
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-primary-foreground/20">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    objectiveProgress >= 100 ? "bg-success" : objectiveProgress >= 50 ? "bg-accent" : "bg-warning",
                  )}
                  style={{ width: `${objectiveProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Colonne droite — réservée au décor SVG ci-dessus, aucun contenu ici */}
        <div aria-hidden="true" className="hidden md:block" />
      </CardContent>
    </Card>
  );

  return href ? <Link to={href as any} className="block">{content}</Link> : content;
}
