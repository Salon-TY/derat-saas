import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Building2, Eye, Mail, PauseCircle, Phone, PlayCircle, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PlatformStatusBadge, formatPlatformDate } from "@/components/platform-ui";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { setPlatformAccountStatus, type PlatformAccount } from "@/lib/api/platform.functions";
import { PUBLIC_BRAND_NAME } from "@/lib/brand";
import { PLATFORM_OVERVIEW_QUERY_KEY, usePlatformOverview } from "@/lib/platform/queries";

export const Route = createFileRoute("/platform/entreprises")({
  head: () => ({
    meta: [{ title: `Entreprises — ${PUBLIC_BRAND_NAME}` }],
  }),
  component: PlatformCompaniesPage,
});

function PlatformCompaniesPage() {
  const overview = usePlatformOverview();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | PlatformAccount["status"]>("all");
  const [selected, setSelected] = useState<PlatformAccount | null>(null);
  const [decision, setDecision] = useState<PlatformAccount | null>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const accounts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return (overview.data?.accounts ?? []).filter((account) => {
      const matchesStatus = status === "all" || account.status === status;
      const matchesSearch =
        !normalizedSearch ||
        [account.companyName, account.managerEmail, account.phone ?? ""].some((value) =>
          value.toLowerCase().includes(normalizedSearch),
        );
      return matchesStatus && matchesSearch;
    });
  }, [overview.data?.accounts, search, status]);

  async function confirmDecision() {
    if (!decision) return;
    if (reason.trim().length < 3) {
      toast.error("Indiquez une raison pour cette décision.");
      return;
    }

    const nextStatus = decision.status === "active" ? "suspended" : "active";
    setSaving(true);
    try {
      await setPlatformAccountStatus({
        data: {
          ownerId: decision.ownerId,
          status: nextStatus,
          reason: reason.trim(),
        },
      });
      toast.success(
        nextStatus === "active" ? "L’entreprise a été réactivée." : "L’entreprise a été suspendue.",
      );
      setDecision(null);
      setSelected(null);
      setReason("");
      await queryClient.invalidateQueries({
        queryKey: PLATFORM_OVERVIEW_QUERY_KEY,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action impossible.");
    } finally {
      setSaving(false);
    }
  }

  if (overview.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 max-w-xl" />
        <Skeleton className="h-12" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  if (overview.isError || !overview.data) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="py-12 text-center text-sm text-destructive">
          Impossible de charger les entreprises.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-accent">
          Comptes clients
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Entreprises</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Consultez le statut d’accès de chaque entreprise cliente.
        </p>
      </div>

      <div className="grid gap-3 rounded-2xl border bg-card p-3 sm:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher…"
            className="h-11 pl-9"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-muted p-1">
          {[
            ["all", "Toutes"],
            ["active", "Actives"],
            ["suspended", "Suspendues"],
            ["cancelled", "Annulées"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatus(value as typeof status)}
              className={`min-h-9 shrink-0 rounded-lg px-3 text-xs font-bold ${
                status === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center text-sm text-muted-foreground">
            {overview.data.accounts.length === 0
              ? "Aucune entreprise cliente."
              : "Aucune entreprise ne correspond à ces critères."}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border bg-card lg:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/70 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Entreprise</th>
                  <th className="px-4 py-3">Responsable</th>
                  <th className="px-4 py-3">Activation</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {accounts.map((account) => (
                  <tr key={account.ownerId}>
                    <td className="max-w-64 px-4 py-3">
                      <p className="truncate font-bold">{account.companyName}</p>
                      {account.phone && (
                        <p className="truncate text-xs text-muted-foreground">{account.phone}</p>
                      )}
                    </td>
                    <td className="max-w-64 px-4 py-3">
                      <p className="truncate">{account.managerEmail || "—"}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                      {formatPlatformDate(account.activatedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <PlatformStatusBadge status={account.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setSelected(account)}>
                          <Eye className="mr-1.5 h-4 w-4" /> Voir
                        </Button>
                        {account.status !== "cancelled" && (
                          <Button
                            variant={account.status === "active" ? "outline" : "default"}
                            size="sm"
                            onClick={() => setDecision(account)}
                          >
                            {account.status === "active" ? (
                              <PauseCircle className="mr-1.5 h-4 w-4" />
                            ) : (
                              <PlayCircle className="mr-1.5 h-4 w-4" />
                            )}
                            {account.status === "active" ? "Suspendre" : "Réactiver"}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 lg:hidden">
            {accounts.map((account) => (
              <Card key={account.ownerId}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="break-words font-bold">{account.companyName}</h2>
                      <p className="mt-1 break-all text-sm text-muted-foreground">
                        {account.managerEmail || "Email non renseigné"}
                      </p>
                    </div>
                    <PlatformStatusBadge status={account.status} />
                  </div>
                  <div className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                    {account.phone && (
                      <span className="flex min-w-0 items-center gap-2">
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{account.phone}</span>
                      </span>
                    )}
                    <span>Activée le {formatPlatformDate(account.activatedAt)}</span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="min-h-11"
                      onClick={() => setSelected(account)}
                    >
                      <Eye className="mr-2 h-4 w-4" /> Détails
                    </Button>
                    {account.status !== "cancelled" && (
                      <Button
                        variant={account.status === "active" ? "outline" : "default"}
                        className="min-h-11"
                        onClick={() => setDecision(account)}
                      >
                        {account.status === "active" ? "Suspendre" : "Réactiver"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="break-words">{selected.companyName}</DialogTitle>
                <DialogDescription>
                  Compte créé le {formatPlatformDate(selected.createdAt)}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <PlatformStatusBadge status={selected.status} />
                <div className="grid gap-3 rounded-2xl bg-muted/60 p-4 text-sm">
                  <span className="flex min-w-0 items-start gap-2">
                    <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="break-words">{selected.companyName}</span>
                  </span>
                  <span className="flex min-w-0 items-start gap-2">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="break-all">{selected.managerEmail || "—"}</span>
                  </span>
                  {selected.phone && (
                    <span className="flex min-w-0 items-start gap-2">
                      <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="break-words">{selected.phone}</span>
                    </span>
                  )}
                </div>
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-bold uppercase text-muted-foreground">
                      Activation
                    </dt>
                    <dd className="mt-1">{formatPlatformDate(selected.activatedAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase text-muted-foreground">
                      Suspension
                    </dt>
                    <dd className="mt-1">{formatPlatformDate(selected.suspendedAt)}</dd>
                  </div>
                </dl>
                {selected.currentReason && (
                  <div>
                    <p className="text-xs font-bold uppercase text-muted-foreground">
                      Dernière raison
                    </p>
                    <p className="mt-1 whitespace-pre-wrap break-words rounded-xl border p-3 text-sm">
                      {selected.currentReason}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(decision)}
        onOpenChange={(open) => {
          if (!open && !saving) {
            setDecision(null);
            setReason("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {decision?.status === "active"
                ? "Suspendre cette entreprise ?"
                : "Réactiver cette entreprise ?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {decision?.status === "active"
                ? "Le propriétaire et son équipe perdront immédiatement l’accès aux données métier."
                : "Le propriétaire et son équipe retrouveront l’accès à leur espace."}{" "}
              La décision sera enregistrée dans l’historique.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={
              decision?.status === "active"
                ? "Raison de la suspension *"
                : "Raison de la réactivation *"
            }
            maxLength={1000}
            rows={4}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              disabled={saving}
              onClick={(event) => {
                event.preventDefault();
                void confirmDecision();
              }}
              className={
                decision?.status === "active"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : ""
              }
            >
              {saving
                ? "Enregistrement…"
                : decision?.status === "active"
                  ? "Confirmer la suspension"
                  : "Confirmer la réactivation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
