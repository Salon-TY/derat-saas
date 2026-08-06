import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, Check, Eye, Mail, MapPin, Phone, Search, Users, X } from "lucide-react";
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
import {
  acceptPlatformRequest,
  rejectPlatformRequest,
  type PlatformAccessRequest,
} from "@/lib/api/platform.functions";
import { PUBLIC_BRAND_NAME } from "@/lib/brand";
import { PLATFORM_OVERVIEW_QUERY_KEY, usePlatformOverview } from "@/lib/platform/queries";

export const Route = createFileRoute("/platform/demandes")({
  head: () => ({
    meta: [{ title: `Demandes d’accès — ${PUBLIC_BRAND_NAME}` }],
  }),
  component: PlatformRequestsPage,
});

type Decision = {
  type: "accept" | "reject";
  request: PlatformAccessRequest;
};

function PlatformRequestsPage() {
  const overview = usePlatformOverview();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | PlatformAccessRequest["status"]>("pending");
  const [selected, setSelected] = useState<PlatformAccessRequest | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const requests = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return (overview.data?.requests ?? []).filter((request) => {
      const matchesStatus = status === "all" || request.status === status;
      const matchesSearch =
        !normalizedSearch ||
        [
          request.companyName,
          request.managerFirstName,
          request.managerLastName,
          request.professionalEmail,
          request.cityOrRegion,
        ].some((value) => value.toLowerCase().includes(normalizedSearch));
      return matchesStatus && matchesSearch;
    });
  }, [overview.data?.requests, search, status]);

  async function confirmDecision() {
    if (!decision) return;
    if (decision.type === "reject" && reason.trim().length < 3) {
      toast.error("Indiquez une raison de refus.");
      return;
    }
    setSaving(true);
    try {
      if (decision.type === "accept") {
        await acceptPlatformRequest({
          data: { id: decision.request.id, reason: "" },
        });
        toast.success("Entreprise acceptée et invitation envoyée.");
      } else {
        await rejectPlatformRequest({
          data: { id: decision.request.id, reason: reason.trim() },
        });
        toast.success("Demande refusée.");
      }
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
          Impossible de charger les demandes d’accès.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-accent">
          Validation manuelle
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Demandes d’accès</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Vérifiez l’entreprise et le responsable avant toute création de compte.
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
            ["pending", "En attente"],
            ["active", "Acceptées"],
            ["rejected", "Refusées"],
            ["all", "Toutes"],
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

      {requests.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center text-sm text-muted-foreground">
            {overview.data.requests.length === 0
              ? "Aucune demande d’accès."
              : "Aucune demande ne correspond à ces critères."}
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
                  <th className="px-4 py-3">Localisation</th>
                  <th className="px-4 py-3">Demande</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td className="max-w-56 px-4 py-3">
                      <p className="truncate font-bold">{request.companyName}</p>
                      <p className="text-xs text-muted-foreground">
                        {request.technicianCount} technicien
                        {request.technicianCount > 1 ? "s" : ""}
                      </p>
                    </td>
                    <td className="max-w-56 px-4 py-3">
                      <p className="truncate">
                        {request.managerFirstName} {request.managerLastName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {request.professionalEmail}
                      </p>
                    </td>
                    <td className="max-w-48 px-4 py-3">
                      <p className="truncate">{request.cityOrRegion}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                      {formatPlatformDate(request.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <PlatformStatusBadge status={request.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setSelected(request)}>
                          <Eye className="mr-1.5 h-4 w-4" /> Voir
                        </Button>
                        {request.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => setDecision({ type: "accept", request })}
                            >
                              <Check className="mr-1.5 h-4 w-4" /> Accepter
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDecision({ type: "reject", request })}
                            >
                              <X className="mr-1.5 h-4 w-4" /> Refuser
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 lg:hidden">
            {requests.map((request) => (
              <Card key={request.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="break-words font-bold">{request.companyName}</h2>
                      <p className="mt-1 break-words text-sm text-muted-foreground">
                        {request.managerFirstName} {request.managerLastName}
                      </p>
                    </div>
                    <PlatformStatusBadge status={request.status} />
                  </div>
                  <div className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                    <span className="flex min-w-0 items-center gap-2">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{request.professionalEmail}</span>
                    </span>
                    <span className="flex min-w-0 items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{request.cityOrRegion}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 shrink-0" />
                      {request.technicianCount} technicien
                      {request.technicianCount > 1 ? "s" : ""}
                    </span>
                    <span>{formatPlatformDate(request.createdAt)}</span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="min-h-11"
                      onClick={() => setSelected(request)}
                    >
                      <Eye className="mr-2 h-4 w-4" /> Détails
                    </Button>
                    {request.status === "pending" && (
                      <Button
                        className="min-h-11"
                        onClick={() => setDecision({ type: "accept", request })}
                      >
                        <Check className="mr-2 h-4 w-4" /> Accepter
                      </Button>
                    )}
                  </div>
                  {request.status === "pending" && (
                    <Button
                      variant="ghost"
                      className="mt-2 min-h-11 w-full text-destructive hover:text-destructive"
                      onClick={() => setDecision({ type: "reject", request })}
                    >
                      <X className="mr-2 h-4 w-4" /> Refuser la demande
                    </Button>
                  )}
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
                  Demande reçue le {formatPlatformDate(selected.createdAt)}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex justify-start">
                  <PlatformStatusBadge status={selected.status} />
                </div>
                <div className="grid gap-3 rounded-2xl bg-muted/60 p-4 text-sm sm:grid-cols-2">
                  <span className="flex min-w-0 items-start gap-2">
                    <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="break-words">{selected.companyName}</span>
                  </span>
                  <span className="flex min-w-0 items-start gap-2">
                    <Users className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {selected.technicianCount} technicien
                    {selected.technicianCount > 1 ? "s" : ""}
                  </span>
                  <span className="flex min-w-0 items-start gap-2">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="break-all">{selected.professionalEmail}</span>
                  </span>
                  <span className="flex min-w-0 items-start gap-2">
                    <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="break-words">{selected.phone}</span>
                  </span>
                  <span className="flex min-w-0 items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="break-words">{selected.cityOrRegion}</span>
                  </span>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Responsable
                  </p>
                  <p className="mt-1 text-sm">
                    {selected.managerFirstName} {selected.managerLastName}
                  </p>
                </div>
                {selected.message && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      Message
                    </p>
                    <p className="mt-1 whitespace-pre-wrap break-words rounded-xl border p-3 text-sm">
                      {selected.message}
                    </p>
                  </div>
                )}
                {selected.decisionReason && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      Motif de décision
                    </p>
                    <p className="mt-1 break-words text-sm">{selected.decisionReason}</p>
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
              {decision?.type === "accept"
                ? "Accepter cette entreprise ?"
                : "Refuser cette demande ?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {decision?.type === "accept"
                ? "Une invitation Supabase sera envoyée au responsable et la décision sera enregistrée dans l’historique."
                : "La demande ne pourra plus ouvrir de compte sans nouvelle intervention de la plateforme."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {decision?.type === "reject" && (
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Raison du refus *"
              maxLength={1000}
              rows={4}
            />
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              disabled={saving}
              onClick={(event) => {
                event.preventDefault();
                void confirmDecision();
              }}
              className={
                decision?.type === "reject"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : ""
              }
            >
              {saving
                ? "Enregistrement…"
                : decision?.type === "accept"
                  ? "Confirmer l’acceptation"
                  : "Confirmer le refus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
