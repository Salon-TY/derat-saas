// Consolide ~8 blocs Card quasi identiques répétés dans le dashboard (mise en
// demeure, retard de paiement, contrats expirants, stock bas, réappro,
// passages à programmer, devis en attente…), chacun avec sa propre couleur
// codée en dur (orange-300, red-50, etc.) au lieu des tokens sémantiques
// existants (--warning, --destructive). Ce composant route tout vers les
// tokens, sans changer aucune condition d'affichage ni aucun calcul.
import type { LucideIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const TONE_STYLES = {
  primary: {
    card: "border-primary/40 bg-primary/5 hover:border-primary/60",
    icon: "text-primary",
  },
  warning: {
    card: "border-warning/50 bg-warning/10 hover:border-warning/70",
    icon: "text-warning",
  },
  destructive: {
    card: "border-destructive/50 bg-destructive/5 hover:border-destructive/70",
    icon: "text-destructive",
  },
} as const;

export function AlertCard({ icon: Icon, tone = "warning", href, children, className }: {
  icon: LucideIcon;
  tone?: keyof typeof TONE_STYLES;
  href?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const styles = TONE_STYLES[tone];
  const content = (
    <Card className={cn("transition-all duration-200", styles.card, className)}>
      <CardContent className="flex items-start gap-3 p-4">
        <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", styles.icon)} />
        <div className="min-w-0 flex-1 text-sm">{children}</div>
      </CardContent>
    </Card>
  );
  return href ? <Link to={href as any} className="block">{content}</Link> : content;
}
