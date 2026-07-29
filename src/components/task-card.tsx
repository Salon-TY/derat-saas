// Ligne "intervention du jour" — client, type, adresse (lien carte), appel
// direct. Rien d'équivalent en Phase A/B (StatCard est pour une métrique, pas
// une ligne de rendez-vous avec action d'appel).
import { Link } from "@tanstack/react-router";
import { MapPin, Phone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function TaskCard({ href, title, subtitle, address, phone }: {
  href: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  address?: string | null;
  phone?: string | null;
}) {
  return (
    <Link to={href as any} className="block">
      <Card className="transition-all duration-200 hover:border-primary/40">
        <CardContent className="flex items-center justify-between gap-4 p-4">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{title}</div>
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
