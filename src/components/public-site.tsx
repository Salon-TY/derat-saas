import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  Bug,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  FileText,
  Menu,
  Package,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { PUBLIC_BRAND_NAME } from "@/lib/brand";
import {
  APP_PRIMARY_NAV_ITEMS,
  APP_SECONDARY_NAV_ITEMS,
  APP_TEAM_NAV_ITEM,
  TECH_NAV_ITEMS,
} from "@/lib/navigation";

const publicNavigation = [
  { label: "Produit", href: "#produit" },
  { label: "Fonctionnalités", href: "#fonctionnalites" },
  { label: "Pour qui ?", href: "#pour-qui" },
  { label: "Tarifs", href: "#tarifs" },
  { label: "Contact", href: "#contact" },
];

const benefits = [
  {
    icon: Zap,
    title: "Gagnez du temps",
    text: "Retrouvez les tâches quotidiennes, les documents et les interventions sans multiplier les outils.",
  },
  {
    icon: ShieldCheck,
    title: "Centralisez vos données",
    text: "Clients, sites, rapports, factures et stock restent regroupés dans un espace professionnel.",
  },
  {
    icon: BarChart3,
    title: "Pilotez votre équipe",
    text: "Le bureau et les techniciens disposent chacun d’une interface adaptée à leur travail.",
  },
];

const features = [
  {
    icon: Users,
    title: "Clients",
    text: "Fiches, coordonnées, sites et historique d’intervention.",
  },
  {
    icon: CalendarDays,
    title: "Planning",
    text: "Organisation des passages, dates et techniciens assignés.",
  },
  {
    icon: ClipboardCheck,
    title: "Interventions",
    text: "Suivi terrain, statuts, observations, produits, photos et signatures.",
  },
  {
    icon: FileText,
    title: "Rapports",
    text: "Rapports d’intervention et documents associés accessibles au même endroit.",
  },
  {
    icon: ReceiptText,
    title: "Facturation",
    text: "Devis, factures, paiements, relances et suivi de trésorerie.",
  },
  {
    icon: Clock3,
    title: "Contrats",
    text: "Fréquences, périodes et passages restant à programmer.",
  },
  {
    icon: Package,
    title: "Stock",
    text: "Produits, niveaux, alertes, mouvements et demandes de réapprovisionnement.",
  },
  {
    icon: Users,
    title: "Techniciens",
    text: "Journée, chantiers et camion dans une interface mobile dédiée.",
  },
];

const workflow = [
  {
    number: "01",
    title: "Demandez un accès",
    text: "Présentez votre entreprise et vos besoins via un formulaire sécurisé.",
  },
  {
    number: "02",
    title: "Votre entreprise est validée",
    text: "La demande est vérifiée manuellement avant l’ouverture de l’espace.",
  },
  {
    number: "03",
    title: "Invitez votre équipe",
    text: "Le responsable configure ensuite les accès de ses employés et techniciens.",
  },
  {
    number: "04",
    title: "Pilotez votre activité",
    text: "Le bureau et le terrain travaillent depuis la même plateforme.",
  },
];

function BrandMark({ inverse = false }: { inverse?: boolean }) {
  return (
    <span className="inline-flex items-center gap-3">
      <span
        className={`grid h-10 w-10 place-items-center rounded-2xl ${
          inverse ? "bg-white/10 text-white" : "bg-primary text-primary-foreground"
        }`}
      >
        <Bug className="h-5 w-5" />
      </span>
      <span className="text-base font-black tracking-[0.16em]">{PUBLIC_BRAND_NAME}</span>
    </span>
  );
}

function DesktopProductPreview() {
  const menuItems = [...APP_PRIMARY_NAV_ITEMS, ...APP_SECONDARY_NAV_ITEMS, APP_TEAM_NAV_ITEM];

  return (
    <div className="relative mx-auto w-full max-w-[740px] lg:mx-0">
      <div className="rounded-[28px] border border-white/15 bg-white/10 p-2 shadow-2xl shadow-black/25 backdrop-blur">
        <div className="overflow-hidden rounded-[22px] bg-background text-foreground">
          <div className="grid min-h-[430px] grid-cols-[130px_1fr] sm:grid-cols-[160px_1fr]">
            <aside className="hidden border-r border-border bg-card p-3 sm:block">
              <div className="mb-4 flex items-center gap-2 px-1 py-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-white">
                  <Bug className="h-3.5 w-3.5" />
                </span>
                <div>
                  <p className="text-[9px] font-bold">Entreprise</p>
                  <p className="text-[6px] uppercase tracking-widest text-accent">
                    Espace professionnel
                  </p>
                </div>
              </div>
              <nav className="space-y-0.5" aria-label="Aperçu des menus réels">
                {menuItems.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-[7px] font-semibold ${
                        index === 0 ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-2.5 w-2.5 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </div>
                  );
                })}
              </nav>
            </aside>
            <div className="min-w-0">
              <div className="flex h-12 items-center justify-between border-b bg-card px-4">
                <div>
                  <p className="text-[10px] font-bold">Tableau de bord</p>
                  <p className="text-[7px] text-muted-foreground">
                    Aperçu — données de démonstration
                  </p>
                </div>
                <span className="h-6 w-6 rounded-full bg-primary/10" />
              </div>
              <div className="space-y-3 p-3 sm:p-4">
                <div className="rounded-2xl bg-primary p-4 text-primary-foreground">
                  <p className="text-[7px] uppercase tracking-wider text-white/60">CA du mois</p>
                  <p className="mt-1 text-2xl font-bold">12 480 €</p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/20">
                    <div className="h-full w-2/3 rounded-full bg-accent" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    ["Interventions", "4"],
                    ["Rapports", "2"],
                    ["Impayées", "1 240 €"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border bg-card p-2.5">
                      <p className="text-[6px] font-semibold uppercase text-muted-foreground">
                        {label}
                      </p>
                      <p className="mt-1 text-sm font-bold">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
                  <div>
                    <p className="mb-2 text-[8px] font-bold">Prochaines interventions</p>
                    <div className="space-y-1.5">
                      {["08:30", "11:00", "14:30"].map((time) => (
                        <div
                          key={time}
                          className="flex items-center gap-2 rounded-xl border-l-4 border-l-primary bg-card p-2"
                        >
                          <span className="text-[8px] font-bold">{time}</span>
                          <span className="min-w-0 flex-1 truncate text-[7px] text-muted-foreground">
                            Intervention planifiée · Secteur d’intervention
                          </span>
                          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[5px] font-bold text-primary">
                            PLANIFIÉE
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-[8px] font-bold">Actions rapides</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {["Intervention", "Client", "Facture", "Devis"].map((label) => (
                        <div key={label} className="rounded-xl border bg-card p-2">
                          <span className="mb-2 grid h-5 w-5 place-items-center rounded-lg bg-primary/10 text-primary">
                            <ChevronRight className="h-2.5 w-2.5" />
                          </span>
                          <p className="text-[6px] font-semibold">{label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-[10px] text-white/55">
        Représentation décorative fidèle à la structure de l’application.
      </p>
    </div>
  );
}

function TechnicianProductPreview() {
  return (
    <div className="mx-auto w-[230px] rounded-[38px] border-[7px] border-[#10271d] bg-background p-2 text-foreground shadow-2xl shadow-black/30">
      <div className="overflow-hidden rounded-[27px]">
        <div className="header-gradient px-3 pb-3 pt-4 text-primary-foreground">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-xl bg-accent">
              <Bug className="h-3.5 w-3.5" />
            </span>
            <div>
              <p className="text-[8px] font-bold">Entreprise</p>
              <p className="text-[5px] uppercase tracking-widest text-white/60">
                Espace technicien
              </p>
            </div>
          </div>
        </div>
        <div className="min-h-[330px] space-y-2 bg-background p-3">
          <div>
            <p className="text-[6px] font-bold uppercase tracking-widest text-primary">
              Aujourd’hui
            </p>
            <h3 className="mt-1 text-base font-bold">Ma journée</h3>
          </div>
          <div className="rounded-2xl bg-primary p-3 text-primary-foreground">
            <p className="text-[6px] uppercase text-white/60">Prochain chantier</p>
            <p className="mt-1 text-xl font-black">08:30</p>
            <p className="mt-1 text-[8px] font-semibold">Intervention planifiée</p>
            <p className="mt-1 truncate text-[6px] text-white/65">Secteur d’intervention</p>
            <button className="mt-3 min-h-8 w-full rounded-xl bg-accent text-[7px] font-bold text-white">
              Ouvrir l’intervention
            </button>
          </div>
          <p className="pt-1 text-[7px] font-bold">Interventions suivantes</p>
          {["11:00", "14:30"].map((time) => (
            <div key={time} className="flex items-center gap-2 rounded-xl border bg-card p-2">
              <span className="text-[8px] font-bold">{time}</span>
              <span className="min-w-0 flex-1 truncate text-[6px] text-muted-foreground">
                Chantier planifié
              </span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 border-t bg-card px-1 py-2">
          {TECH_NAV_ITEMS.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className={`flex flex-col items-center gap-1 text-[5px] ${
                  index === 0 ? "font-bold text-accent" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PublicHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-primary/95 text-primary-foreground backdrop-blur-xl">
      <div className="mx-auto flex min-h-[72px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <a href="#top" aria-label={`${PUBLIC_BRAND_NAME} — Accueil`}>
          <BrandMark inverse />
        </a>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Navigation principale">
          {publicNavigation.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="rounded-xl px-3 py-2 text-sm font-medium text-white/72 transition-colors hover:bg-white/10 hover:text-white"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <Button asChild variant="ghost" className="text-white hover:bg-white/10 hover:text-white">
            <Link to="/connexion">Se connecter</Link>
          </Button>
          <Button asChild className="bg-accent text-white hover:bg-accent/90">
            <Link to="/demande-acces">Demander un accès</Link>
          </Button>
        </div>
        <button
          type="button"
          className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 lg:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-white/10 px-4 pb-5 pt-3 lg:hidden">
          <nav className="mx-auto grid max-w-7xl gap-1" aria-label="Navigation mobile">
            {publicNavigation.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center rounded-xl px-3 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white"
              >
                {item.label}
              </a>
            ))}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button
                asChild
                variant="outline"
                className="border-white/20 bg-transparent text-white"
              >
                <Link to="/connexion">Se connecter</Link>
              </Button>
              <Button asChild className="bg-accent text-white">
                <Link to="/demande-acces">Demander un accès</Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

export function PublicSite() {
  return (
    <div id="top" className="min-h-screen bg-background text-foreground">
      <PublicHeader />

      <main>
        <section className="relative overflow-hidden bg-primary text-primary-foreground">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(232,128,10,0.2),transparent_25%),radial-gradient(circle_at_90%_20%,rgba(255,255,255,0.1),transparent_30%)]"
          />
          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[0.82fr_1.18fr] lg:px-8 lg:py-24">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-xs font-semibold text-white/75">
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                Conçu pour les professionnels de la lutte antiparasitaire
              </div>
              <h1 className="mt-6 text-4xl font-black leading-[1.08] tracking-[-0.04em] sm:text-5xl lg:text-6xl">
                Pilotez votre entreprise de dératisation depuis une seule application.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-white/70 sm:text-lg">
                Gérez vos clients, interventions, techniciens, rapports et facturation depuis une
                plateforme simple conçue pour les professionnels de la lutte antiparasitaire.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button
                  asChild
                  size="lg"
                  className="min-h-12 bg-accent px-6 text-white hover:bg-accent/90"
                >
                  <Link to="/demande-acces">
                    Demander un accès
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="min-h-12 border-white/20 bg-white/5 px-6 text-white hover:bg-white/10 hover:text-white"
                >
                  <a href="#produit">Découvrir le produit</a>
                </Button>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-white/60">
                {["Accès contrôlé", "Données isolées", "Interface terrain dédiée"].map((item) => (
                  <span key={item} className="inline-flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-accent" />
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div id="produit" className="grid items-end gap-6 xl:grid-cols-[1fr_230px]">
              <DesktopProductPreview />
              <div className="hidden xl:block">
                <TechnicianProductPreview />
              </div>
            </div>
            <div className="lg:col-span-2 xl:hidden">
              <TechnicianProductPreview />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="grid gap-4 md:grid-cols-3">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <article
                  key={benefit.title}
                  className="rounded-[24px] border bg-card p-6 shadow-soft"
                >
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h2 className="mt-5 text-xl font-bold">{benefit.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{benefit.text}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section id="fonctionnalites" className="bg-card py-16 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
                Fonctionnalités réelles
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                Le bureau et le terrain, enfin réunis.
              </h2>
              <p className="mt-4 text-muted-foreground">
                Chaque module présenté existe dans l’application et s’intègre au même suivi
                quotidien.
              </p>
            </div>
            <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <article
                    key={feature.title}
                    className="group rounded-[22px] border bg-background p-5 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-soft"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    <h3 className="mt-4 font-bold">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.text}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="rounded-[32px] bg-primary p-6 text-primary-foreground sm:p-10 lg:p-14">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
                Mise en route
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                Un accès simple, validé avec soin.
              </h2>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {workflow.map((step) => (
                <article key={step.number} className="rounded-2xl bg-white/8 p-5">
                  <span className="text-xs font-black tracking-widest text-accent">
                    {step.number}
                  </span>
                  <h3 className="mt-5 font-bold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/65">{step.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="pour-qui" className="bg-card py-16 lg:py-24">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Pour qui ?</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                Pensé pour les équipes de lutte antiparasitaire.
              </h2>
              <p className="mt-4 max-w-xl leading-7 text-muted-foreground">
                Une interface structurée pour les responsables, le personnel de bureau et les
                techniciens qui interviennent chez les clients.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                "Entreprises de dératisation",
                "Entreprises de désinsectisation",
                "Professionnels de la lutte antiparasitaire",
                "Équipes de bureau et techniciens",
              ].map((audience) => (
                <div
                  key={audience}
                  className="flex min-h-24 items-center gap-3 rounded-2xl border bg-background p-4"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent/12 text-accent">
                    <Check className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-semibold">{audience}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="tarifs" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="grid overflow-hidden rounded-[32px] border bg-card shadow-soft lg:grid-cols-[1.1fr_0.9fr]">
            <div className="p-7 sm:p-10 lg:p-14">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
                Offre sur demande
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight">
                Une configuration adaptée à votre entreprise.
              </h2>
              <p className="mt-4 max-w-xl leading-7 text-muted-foreground">
                Présentez votre organisation et le nombre de techniciens. L’accès et
                l’accompagnement sont proposés après étude de votre demande.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="min-h-12">
                  <Link to="/demande-acces">Demander un accès</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="min-h-12">
                  <a href="#contact">Nous contacter</a>
                </Button>
              </div>
            </div>
            <div className="flex items-center bg-primary p-7 text-primary-foreground sm:p-10 lg:p-14">
              <ul className="space-y-4">
                {[
                  "Validation manuelle de l’entreprise",
                  "Espace responsable et équipe",
                  "Interface technicien mobile",
                  "Modules métier centralisés",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent text-white">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section id="contact" className="px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24">
          <div className="mx-auto max-w-7xl rounded-[32px] bg-accent px-6 py-12 text-center text-white sm:px-10 lg:py-16">
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
              Prêt à centraliser votre activité ?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-white/80">
              Envoyez votre demande d’accès. Elle sera étudiée avant l’ouverture de votre espace
              entreprise.
            </p>
            <Button
              asChild
              size="lg"
              className="mt-7 min-h-12 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Link to="/demande-acces">
                Demander un accès
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="bg-[#10271d] text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1fr_auto] lg:px-8">
          <div>
            <BrandMark inverse />
            <p className="mt-4 max-w-md text-sm leading-6 text-white/55">
              Plateforme de gestion pour les professionnels de la dératisation, de la
              désinsectisation et de la lutte antiparasitaire.
            </p>
          </div>
          <nav
            className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm text-white/65 sm:grid-cols-3"
            aria-label="Liens de pied de page"
          >
            <Link to="/mentions-legales" className="hover:text-white">
              Mentions légales
            </Link>
            <Link to="/confidentialite" className="hover:text-white">
              Confidentialité
            </Link>
            <Link to="/conditions" className="hover:text-white">
              Conditions
            </Link>
            <a href="#contact" className="hover:text-white">
              Contact
            </a>
            <Link to="/connexion" className="hover:text-white">
              Connexion
            </Link>
          </nav>
        </div>
        <div className="border-t border-white/10 px-4 py-4 text-center text-xs text-white/40">
          © {new Date().getFullYear()} {PUBLIC_BRAND_NAME}. Tous droits réservés.
        </div>
      </footer>
    </div>
  );
}
