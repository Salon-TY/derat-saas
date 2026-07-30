// Tuile d'action rapide pour une grille — remplace les Button pleine largeur
// empilés. Ni StatCard (métrique avec valeur) ni Button (pas de tuile
// icône+libellé) ne couvrent ce rôle.
// Phase C.1 : ajout d'une description courte + flèche d'action en bas à droite.
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function QuickActionCard({
  icon: Icon,
  label,
  description,
  href,
  className,
}: {
  icon: LucideIcon;
  label: React.ReactNode;
  description?: React.ReactNode;
  href: string;
  className?: string;
}) {
  return (
    <Link to={href as any} className="block">
      <Card className={cn("relative h-full rounded-2xl hover:border-primary/40", className)}>
        <CardContent className="flex h-full min-h-28 flex-col gap-3 p-4 lg:min-h-32 lg:p-5">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary lg:h-12 lg:w-12">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1 pr-6">
            <div className="text-sm font-semibold">{label}</div>
            {description && (
              <div className="mt-1 hidden text-xs text-muted-foreground sm:block">
                {description}
              </div>
            )}
          </div>
          <ArrowRight className="absolute bottom-4 right-4 h-4 w-4 text-muted-foreground/50" />
        </CardContent>
      </Card>
    </Link>
  );
}
