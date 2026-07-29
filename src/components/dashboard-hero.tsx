// Carte "hero" du dashboard — dominante visuellement, seule à afficher un
// indicateur avec tendance + barre de progression d'objectif. Rien dans les
// Phases A/B ne joue ce rôle (StatCard est pour une métrique simple).
// Purement présentationnel : ne reçoit que des valeurs déjà calculées par la
// page (aucun calcul ici).
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
    <Card className={cn(href && "transition-all duration-200 hover:border-accent/50", className)}>
      <CardContent className="p-6 md:p-8">
        <div className="flex items-center gap-4 md:gap-6">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-accent text-accent-foreground md:h-16 md:w-16">
            <Euro className="h-7 w-7 md:h-8 md:w-8" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
            <div className="mt-2 text-4xl font-bold tracking-tight tabular-nums md:text-5xl">{value}</div>
            {trend && (
              <div
                className={cn(
                  "mt-2 flex items-center gap-2 text-sm font-medium",
                  trend.direction === "up" && "text-success",
                  trend.direction === "down" && "text-destructive",
                  trend.direction === "flat" && "text-muted-foreground",
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
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>Objectif mensuel</span>
              {objectiveLabel}
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
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
      </CardContent>
    </Card>
  );

  return href ? <Link to={href as any} className="block">{content}</Link> : content;
}
