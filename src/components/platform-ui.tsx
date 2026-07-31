import { AlertTriangle, Building2, CheckCircle2, Clock3, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  pending: "bg-warning/15 text-warning-foreground",
  active: "bg-success/15 text-success",
  rejected: "bg-destructive/10 text-destructive",
  suspended: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};

const statusLabels: Record<string, string> = {
  pending: "En attente",
  active: "Active",
  rejected: "Refusée",
  suspended: "Suspendue",
  cancelled: "Annulée",
};

export function PlatformStatusBadge({ status }: { status: string }) {
  const Icon =
    status === "active"
      ? CheckCircle2
      : status === "pending"
        ? Clock3
        : status === "suspended"
          ? AlertTriangle
          : status === "rejected"
            ? XCircle
            : Building2;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
        statusStyles[status] ?? statusStyles.cancelled,
      )}
    >
      <Icon className="h-3 w-3" />
      {statusLabels[status] ?? status}
    </span>
  );
}

// Utilitaire de présentation partagé uniquement par les écrans platform.
// eslint-disable-next-line react-refresh/only-export-components
export function formatPlatformDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
