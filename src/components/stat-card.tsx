// StatCard générique — absent des composants partagés avant cette phase (seul
// un TechnicianStatCard spécifique aux stats techniciens existe, défini
// localement dans src/routes/_app.stats.tsx : fichier métier, non touché).
// Prêt à être adopté par les écrans (dashboard, stats…) dans une phase
// suivante ; non câblé dans une route cette phase-ci.
import type { LucideIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({ icon: Icon, label, value, trend, href, search, className }: {
  icon?: LucideIcon;
  label: React.ReactNode;
  value: React.ReactNode;
  trend?: { direction: "up" | "down" | "flat"; label: React.ReactNode };
  /** Rend la carte cliquable (ex. vers /interventions, /factures…). */
  href?: string;
  /** Search params optionnels transmis au Link (ex. { statut: "retard" }). */
  search?: Record<string, unknown>;
  className?: string;
}) {
  const card = (
    <Card className={cn(href && "transition-all duration-200 hover:border-primary/40", className)}>
      <CardContent className="flex items-center gap-4 p-4 md:p-6">
        {Icon && (
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="mt-2 text-2xl font-bold tabular-nums">{value}</div>
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
      </CardContent>
    </Card>
  );
  return href ? <Link to={href as any} search={search as any} className="block">{card}</Link> : card;
}
