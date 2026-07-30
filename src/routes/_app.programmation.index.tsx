// Passages de contrat à programmer — l'app ne devine jamais de date, elle
// se contente de surfacer ce qu'il reste à programmer (voir
// usePassagesAProgrammer dans queries.ts) et de préremplir la création
// d'intervention pour que seule la date (et éventuellement le technicien)
// reste à saisir.
import { createFileRoute, Link } from "@tanstack/react-router";
import { APP_NAME } from "@/lib/brand";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  CalendarClock,
  CalendarPlus,
  ChevronRight,
  ClipboardList,
  MapPin,
} from "lucide-react";
import { usePassagesAProgrammer, type PassageAProgrammer } from "@/lib/queries";
import { TechnicianSelect } from "@/components/technician-select";
import { TYPES_NUISIBLES, TYPES_INTERVENTION } from "@/lib/schemas";
import { PermissionGate } from "@/components/permission-gate";
import { PageContainer, PageHeader } from "@/components/page-layout";

export const Route = createFileRoute("/_app/programmation/")({
  head: () => ({ meta: [{ title: `Passages à programmer — ${APP_NAME}` }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    contract_id: typeof search.contract_id === "string" ? search.contract_id : undefined,
  }),
  component: () => (
    <PermissionGate perm="programmation">
      <ProgrammationPage />
    </PermissionGate>
  ),
});

// Best-effort : le type de nuisible n'est pas structuré sur le contrat
// (type_prestation est du texte libre) — on tente une correspondance simple,
// sinon on laisse l'utilisateur choisir.
function deriveTypeNuisible(typePrestation: string | null | undefined): string {
  const type = (typePrestation ?? "").toLowerCase();
  if (type.includes("rat")) return "Rats";
  if (type.includes("souris") || type.includes("rong")) return "Souris";
  if (type.includes("cafard") || type.includes("blatte")) return "Cafards";
  if (type.includes("punaise")) return "Punaises de lit";
  if (type.includes("pigeon")) return "Pigeons";
  if (type.includes("frelon")) return "Frelons";
  return "";
}

function deriveTypeIntervention(
  typePrestation: string | null | undefined,
): (typeof TYPES_INTERVENTION)[number] {
  const type = (typePrestation ?? "").toLowerCase();
  const isDeratisation = type.includes("dérat") || type.includes("derat");
  const isDesinsectisation =
    type.includes("désin") || type.includes("desin") || type.includes("insect");
  if (isDeratisation && isDesinsectisation) return "Les deux";
  if (isDesinsectisation && !isDeratisation) return "Désinsectisation";
  return "Dératisation";
}

function ProgrammationPage() {
  const search = Route.useSearch();
  const { data: contracts = [], isLoading, isError } = usePassagesAProgrammer();
  const [dialogContract, setDialogContract] = useState<PassageAProgrammer | null>(null);

  // Lien depuis la fiche contrat ("Programmer") : ouvre directement le
  // dialogue pour ce contrat une fois la file chargée.
  const [autoOpened, setAutoOpened] = useState(false);
  useEffect(() => {
    if (autoOpened || !search.contract_id || contracts.length === 0) return;
    const match = contracts.find((contract) => contract.id === search.contract_id);
    if (match) setDialogContract(match);
    setAutoOpened(true);
  }, [search.contract_id, contracts, autoOpened]);

  return (
    <PageContainer>
      <PageHeader
        title="À programmer"
        subtitle="Contrats actifs auxquels il reste des passages à planifier. La date reste toujours à votre choix."
      />

      {isLoading ? (
        <ProgrammationLoading />
      ) : isError ? (
        <ProgrammationState
          icon={AlertCircle}
          title="Impossible de charger les passages"
          description="Une erreur est survenue pendant le chargement. Réessayez dans quelques instants."
        />
      ) : contracts.length === 0 ? (
        <ProgrammationState
          icon={CalendarClock}
          title="Tout est programmé"
          description="Aucun passage de contrat n’attend actuellement une date."
        />
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold tabular-nums text-foreground">{contracts.length}</span>{" "}
            contrat{contracts.length > 1 ? "s" : ""} à traiter
          </p>
          <div className="grid items-start gap-4 lg:grid-cols-2">
            {contracts.map((contract) => (
              <ProgrammationCard
                key={contract.id}
                contract={contract}
                onProgram={() => setDialogContract(contract)}
              />
            ))}
          </div>
        </div>
      )}

      <ProgrammerDialog contract={dialogContract} onClose={() => setDialogContract(null)} />
    </PageContainer>
  );
}

function ProgrammationCard({
  contract,
  onProgram,
}: {
  contract: PassageAProgrammer;
  onProgram: () => void;
}) {
  const progress = Math.min(100, (contract.passages_realises / contract.nb_passages_inclus) * 100);
  const address = contract.adresse_etablissement || contract.client?.adresse_site || "";

  return (
    <Card className="hover:border-primary/30">
      <CardContent className="space-y-4 p-4 lg:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-warning/15 text-warning-foreground">
            <CalendarClock className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                {contract.numero && (
                  <div className="truncate font-mono text-[10px] text-muted-foreground">
                    {contract.numero}
                  </div>
                )}
                <Link
                  to="/contrats/$id"
                  params={{ id: contract.id }}
                  className="mt-1 flex min-w-0 items-center gap-2 font-semibold hover:text-primary"
                >
                  <span className="truncate">{contract.client?.raison_sociale ?? "—"}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
                {contract.nom_etablissement && (
                  <div className="mt-1 truncate text-xs text-muted-foreground">
                    {contract.nom_etablissement}
                  </div>
                )}
              </div>
              <Badge variant="warning" className="shrink-0">
                {contract.restant} à programmer
              </Badge>
            </div>
          </div>
        </div>

        {address && (
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span className="line-clamp-2">{address}</span>
          </div>
        )}

        {(contract.frequence || contract.type_prestation) && (
          <dl className="grid gap-3 rounded-xl bg-muted/40 p-3 text-xs sm:grid-cols-2">
            {contract.frequence && (
              <div className="min-w-0">
                <dt className="text-muted-foreground">Fréquence</dt>
                <dd className="mt-1 truncate font-medium">{contract.frequence}</dd>
              </div>
            )}
            {contract.type_prestation && (
              <div className="min-w-0">
                <dt className="text-muted-foreground">Prestation</dt>
                <dd className="mt-1 line-clamp-2 font-medium">{contract.type_prestation}</dd>
              </div>
            )}
          </dl>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4 text-xs">
            <span className="text-muted-foreground">Progression du contrat</span>
            <span className="shrink-0 font-medium tabular-nums">
              {contract.passages_realises}/{contract.nb_passages_inclus} réalisés
            </span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {contract.planifiees > 0 && (
          <p className="rounded-xl border border-border/50 p-3 text-xs leading-5 text-muted-foreground">
            {contract.planifiees} passage{contract.planifiees > 1 ? "s" : ""} déjà planifié
            {contract.planifiees > 1 ? "s" : ""}, non compté
            {contract.planifiees > 1 ? "s" : ""} dans le reste à programmer.
          </p>
        )}

        <Button className="w-full" onClick={onProgram}>
          <CalendarPlus className="h-4 w-4" />
          Programmer un passage
        </Button>
      </CardContent>
    </Card>
  );
}

function ProgrammerDialog({
  contract,
  onClose,
}: {
  contract: PassageAProgrammer | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [typeNuisible, setTypeNuisible] = useState("");
  const [technicienId, setTechnicienId] = useState("none");
  const [consignes, setConsignes] = useState("");
  const [saving, setSaving] = useState(false);

  // Réinitialise le formulaire à chaque ouverture sur un nouveau contrat.
  const [openedFor, setOpenedFor] = useState<string | null>(null);
  if (contract && contract.id !== openedFor) {
    setOpenedFor(contract.id);
    setDate(new Date().toISOString().slice(0, 10));
    setTypeNuisible(deriveTypeNuisible(contract.type_prestation));
    setTechnicienId("none");
    setConsignes(contract.notes || "");
  }

  async function handleConfirm() {
    if (!contract) return;
    if (!date) {
      toast.error("Choisissez une date");
      return;
    }
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Non connecté");
        return;
      }
      const address = contract.adresse_etablissement || contract.client?.adresse_site || "";
      const { error } = await db.from("interventions").insert({
        user_id: user.id,
        client_id: contract.client_id,
        contract_id: contract.id,
        technicien_id: technicienId === "none" ? null : technicienId,
        date,
        adresse_site: address,
        type_nuisible: typeNuisible,
        type_intervention: deriveTypeIntervention(contract.type_prestation),
        consignes: consignes || null,
        statut: "planifiee",
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["passages_a_programmer"] });
      queryClient.invalidateQueries({ queryKey: ["interventions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["my_todo_count"] });
      toast.success("Passage programmé");
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={!!contract}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
          setOpenedFor(null);
        }
      }}
    >
      <DialogContent className="max-h-[calc(100vh-2rem)] w-[calc(100%-1.5rem)] overflow-y-auto rounded-2xl p-4 sm:w-full sm:p-6">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle>Programmer un passage</DialogTitle>
        </DialogHeader>
        {contract && (
          <div className="space-y-4">
            <div className="flex gap-3 rounded-xl bg-muted/40 p-4 text-sm">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <ClipboardList className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">
                  {contract.client?.raison_sociale ?? "—"}
                </div>
                {(contract.adresse_etablissement || contract.client?.adresse_site) && (
                  <div className="mt-2 flex items-start gap-2 text-xs text-muted-foreground">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span className="line-clamp-2">
                      {contract.adresse_etablissement || contract.client?.adresse_site}
                    </span>
                  </div>
                )}
                {contract.numero && (
                  <div className="mt-2 font-mono text-xs text-muted-foreground">
                    {contract.numero}
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Date *</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Technicien (optionnel)</Label>
                <TechnicianSelect value={technicienId} onValueChange={setTechnicienId} />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Type de nuisible</Label>
              <Select value={typeNuisible} onValueChange={setTypeNuisible}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner…" />
                </SelectTrigger>
                <SelectContent>
                  {TYPES_NUISIBLES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">
                Consignes pour le technicien (optionnel)
              </Label>
              <Textarea
                rows={3}
                value={consignes}
                onChange={(event) => setConsignes(event.target.value)}
                placeholder="Ex. clés chez le gardien…"
              />
            </div>

            <Button className="w-full" disabled={saving} onClick={handleConfirm}>
              {saving ? "Enregistrement…" : "Créer l’intervention"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ProgrammationLoading() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="hover:translate-y-0 hover:shadow-soft">
          <CardContent className="space-y-4 p-4 lg:p-6">
            <div className="flex gap-3">
              <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-2 w-full rounded-full" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ProgrammationState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof CalendarClock;
  title: string;
  description: string;
}) {
  return (
    <Card className="hover:translate-y-0 hover:shadow-soft">
      <CardContent className="flex flex-col items-center px-6 py-12 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <h2 className="mt-4 font-semibold">{title}</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
