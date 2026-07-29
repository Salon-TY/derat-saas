// Header partagé — barre supérieure de l'application, présente à l'identique
// sur AppShell (desktop + mobile) et TechShell. Avant cette extraction, les
// deux shells dupliquaient un bloc JSX quasiment identique (logo, nom de
// société, tagline, actions) ; ce composant élimine cette duplication.
// Purement présentationnel : aucune donnée n'est chargée ici, tout vient des
// props (fournies par le shell appelant, qui garde ses hooks existants).
import { Link } from "@tanstack/react-router";
import { Bug, LogOut, Search, Settings, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Settings as CompanySettings } from "@/lib/queries";
import { APP_NAME } from "@/lib/brand";

export function Header({
  settings,
  tagline,
  brandHref,
  onSearchClick,
  showSettingsLink = false,
  onSignOut,
  actions,
  className,
}: {
  settings: CompanySettings | null | undefined;
  tagline: string;
  brandHref?: string;
  onSearchClick?: () => void;
  showSettingsLink?: boolean;
  onSignOut: () => void;
  /** Zone d'action optionnelle (ex. bouton "Nouveau" sur desktop). */
  actions?: React.ReactNode;
  className?: string;
}) {
  const brand = (
    <div className="flex min-w-0 items-center gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-2xl bg-accent shadow-lg shadow-accent/30">
        {settings?.logo_url
          ? <img src={settings.logo_url} alt="Logo" className="h-full w-full object-contain" />
          : <Bug className="h-5 w-5 text-white" />}
      </div>
      <div className="min-w-0">
        <div className="truncate text-base font-bold leading-none tracking-tight">{settings?.nom || APP_NAME}</div>
        <div className="mt-2 truncate text-[10px] uppercase tracking-widest text-primary-foreground/60">
          {tagline}
        </div>
      </div>
    </div>
  );

  return (
    <header
      className={`sticky top-0 z-30 header-gradient text-primary-foreground ${className ?? ""}`}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto flex items-center justify-between gap-4 px-4 py-3 lg:px-8">
        {brandHref ? <Link to={brandHref as any} className="min-w-0">{brand}</Link> : brand}

        <div className="flex shrink-0 items-center gap-2">
          {actions}
          {onSearchClick && (
            <button
              onClick={onSearchClick}
              className="grid h-11 w-11 place-items-center rounded-xl transition-all duration-200 hover:bg-white/10"
              aria-label="Recherche"
            >
              <Search className="h-5 w-5" />
            </button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="ml-2 rounded-full transition-all duration-200 hover:opacity-90" aria-label="Compte">
                <Avatar className="h-9 w-9 ring-2 ring-white/20">
                  <AvatarImage src={settings?.logo_url ?? undefined} alt="" />
                  <AvatarFallback className="bg-white/10 text-primary-foreground">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {showSettingsLink && (
                <DropdownMenuItem asChild>
                  <Link to="/parametres" className="cursor-pointer">
                    <Settings className="h-4 w-4" /> Paramètres
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onSignOut} className="cursor-pointer text-destructive focus:text-destructive">
                <LogOut className="h-4 w-4" /> Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
