// Ligne "intervention du jour" — client, type, adresse (lien carte), appel
// direct. Rien d'équivalent en Phase A/B (StatCard est pour une métrique, pas
// une ligne de rendez-vous avec action d'appel).
// Phase C.1 : badge de statut réel (réutilise le mapping partagé de
// schemas.ts, déjà utilisé par la page Interventions — aucune couleur
// inventée) + avatar-initiales dérivé du titre déjà chargé (zéro donnée
// supplémentaire).
import { Link } from "@tanstack/react-router";
import { MapPin, Phone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { STATUT_INTERVENTION_COLORS, statutInterventionLabel } from "@/lib/schemas";
import { cn } from "@/lib/utils";

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function TaskCard({ href, title, subtitle, address, phone, status }: {
  href: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  address?: string | null;
  phone?: string | null;
  /** Valeur brute de `interventions.statut` — optionnel, badge masqué si absent. */
  status?: string | null;
}) {
  return (
    <Link to={href as any} className="block">
      <Card className="transition-all duration-200 hover:border-primary/40">
        <CardContent className="flex items-center justify-between gap-4 p-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                {getInitials(typeof title === "string" ? title : "?")}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div className="truncate text-sm font-medium">{title}</div>
                {status && (
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase",
                      STATUT_INTERVENTION_COLORS[status] ?? "bg-muted text-muted-foreground",
                    )}
                  >
                    {statutInterventionLabel(status)}
                  </span>
                )}
              </div>
              {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
              {address && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex items-center gap-2 text-xs text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{address}</span>
                </a>
              )}
            </div>
          </div>
          {phone && (
            <a
              href={`tel:${phone}`}
              className="flex shrink-0 items-center gap-2 rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-all duration-200 hover:bg-primary/20"
              onClick={(e) => e.stopPropagation()}
            >
              <Phone className="h-4 w-4" />
              Appeler
            </a>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
