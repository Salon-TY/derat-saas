import {
  BarChart2,
  CalendarClock,
  ClipboardList,
  FileCheck,
  FileSignature,
  FileText,
  LayoutDashboard,
  Package,
  PackagePlus,
  Settings,
  TrendingUp,
  Truck,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { PermissionKey } from "@/lib/permissions";

export type AppNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  perm?: PermissionKey;
};

export const APP_PRIMARY_NAV_ITEMS: AppNavItem[] = [
  { to: "/app", label: "Accueil", icon: LayoutDashboard, exact: true, perm: "accueil" },
  { to: "/clients", label: "Clients", icon: Users, perm: "clients" },
  { to: "/interventions", label: "Terrain", icon: ClipboardList },
  { to: "/factures", label: "Factures", icon: FileText, perm: "factures" },
  { to: "/stock", label: "Stock", icon: Package, perm: "stock" },
];

export const APP_SECONDARY_NAV_ITEMS: AppNavItem[] = [
  { to: "/devis", label: "Devis", icon: FileCheck, perm: "devis" },
  { to: "/tresorerie", label: "Trésorerie", icon: TrendingUp, perm: "tresorerie" },
  { to: "/contrats", label: "Contrats", icon: FileSignature, perm: "contrats" },
  { to: "/reappro", label: "Réappro", icon: PackagePlus, perm: "reappro" },
  {
    to: "/programmation",
    label: "À programmer",
    icon: CalendarClock,
    perm: "programmation",
  },
  { to: "/stats", label: "Statistiques", icon: BarChart2, perm: "stats" },
  { to: "/parametres", label: "Paramètres", icon: Settings, perm: "parametres" },
];

export const APP_TEAM_NAV_ITEM: AppNavItem = {
  to: "/equipe",
  label: "Équipe",
  icon: UserCog,
  perm: "equipe",
};

export const TECH_NAV_ITEMS: AppNavItem[] = [
  { to: "/tech", label: "Ma journée", icon: LayoutDashboard, exact: true },
  { to: "/tech/chantiers", label: "Mes chantiers", icon: ClipboardList },
  { to: "/tech/camion", label: "Mon camion", icon: Truck },
];
