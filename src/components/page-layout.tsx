// Primitives de mise en page partagées — prêtes à être adoptées écran par
// écran dans les phases suivantes (Phase C, D, …). Aucune route n'utilise
// encore ces composants à l'issue de la Phase B : elle ne modifie que
// l'infrastructure (AppShell/Sidebar/Header), pas les pages métier.
//
// L'intention, une fois adoptées :
// - PageContainer fixe la largeur maximale une seule fois, au lieu des
//   max-w-4xl / max-w-6xl / max-w-screen-xl dispersés page par page.
// - PageHeader/PageActions/SectionTitle remplacent des blocs déjà dupliqués
//   presque à l'identique sur la plupart des pages actuelles (ex. le motif
//   "text-sm font-semibold uppercase tracking-wide text-muted-foreground"
//   utilisé comme titre de section sur le dashboard, le stock, etc.).
import { cn } from "@/lib/utils";

export function PageContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-6xl space-y-6", className)}>{children}</div>;
}

export function PageHeader({ title, subtitle, actions, className }: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <PageActions>{actions}</PageActions>}
    </div>
  );
}

export function PageActions({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex flex-wrap items-center gap-2", className)}>{children}</div>;
}

export function PageSection({ title, actions, children, className }: {
  title?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-4", className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-4">
          {title && <SectionTitle>{title}</SectionTitle>}
          {actions && <PageActions>{actions}</PageActions>}
        </div>
      )}
      {children}
    </section>
  );
}

export function SectionTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={cn("text-sm font-semibold uppercase tracking-wide text-muted-foreground", className)}>
      {children}
    </h2>
  );
}
