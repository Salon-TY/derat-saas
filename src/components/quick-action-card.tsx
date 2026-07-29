// Tuile d'action rapide pour une grille — remplace les Button pleine largeur
// empilés. Ni StatCard (métrique avec valeur) ni Button (pas de tuile
// icône+libellé) ne couvrent ce rôle.
import type { LucideIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function QuickActionCard({ icon: Icon, label, href, className }: {
  icon: LucideIcon;
  label: React.ReactNode;
  href: string;
  className?: string;
}) {
  return (
    <Link to={href as any} className="block">
      <Card className={cn("h-full transition-all duration-200 hover:border-primary/40 hover:shadow-elevated hover:-translate-y-0.5", className)}>
        <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <span className="text-sm font-semibold">{label}</span>
        </CardContent>
      </Card>
    </Link>
  );
}
