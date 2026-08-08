import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { APP_NAME } from "@/lib/brand";
import {
  useClient,
  useInterventions,
  useContracts,
  useQuotes,
  useInvoices,
  type Invoice,
} from "@/lib/queries";
import { ClientForm } from "@/components/client-form";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  FileSignature,
  Hash,
  Mail,
  MapPin,
  Phone,
  Pencil,
  X,
  Trash2,
} from "lucide-react";
import { db } from "@/lib/db";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  formatDateFR,
  STATUTS_CONTRAT,
  STATUT_INTERVENTION_COLORS,
  statutInterventionLabel,
} from "@/lib/schemas";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PermissionGate } from "@/components/permission-gate";
import { PageActions, PageContainer, PageHeader, PageSection } from "@/components/page-layout";
import { cn } from "@/lib/utils";
import type { ClientForm as ClientFormType } from "@/lib/schemas";

export const Route = createFileRoute("/_app/clients/$id")({
  head: () => ({ meta: [{ title: `Fiche client — ${APP_NAME}` }] }),
  component: () => (
    <PermissionGate perm="clients">
      <ClientDetail />
    </PermissionGate>
  ),
});

function statutLabel(list: readonly { value: string; label: string }[], value: string) {
  return list.find((status) => status.value === value)?.label ?? value;
}

function ClientDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: client, isLoading, isError } = useClient(id);
  const { data: interventions = [] } = useInterventions({ client_id: id });
  const { data: contracts = [] } = useContracts();
  const { data: quotes = [] } = useQuotes();
  const { data: invoiceData = [] } = useInvoices({ client_id: id });
  const clientContracts = contracts.filter((contract) => contract.client_id === id);
  const clientQuotes = quotes.filter((quote) => quote.client_id === id);
  const clientInvoices = (Array.isArray(invoiceData) ? invoiceData : invoiceData.rows) as Invoice[];
  const [isEditing, setIsEditing] = useState(false);

  async function handleUpdate(values: ClientFormType) {
    const { error } = await db.from("clients").update(values).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["clients"] });
    qc.invalidateQueries({ queryKey: ["client", id] });
    toast.success("Client mis à jour");
    setIsEditing(false);
  }

  async function handleDelete() {
    const { error } = await db.from("clients").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["clients"] });
    toast.success("Client supprimé");
    navigate({ to: "/clients" });
  }

  if (isLoading) return <ClientDetailLoading />;

  if (isError || !client) {
    return (
      <PageContainer>
        <Link
          to="/clients"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux clients
        </Link>
        <Card className="hover:translate-y-0 hover:shadow-soft">
          <CardContent className="flex flex-col items-center px-6 py-12 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </span>
            <h1 className="mt-4 font-semibold">
              {isError ? "Impossible de charger ce client" : "Client introuvable"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {isError
                ? "Une erreur est survenue pendant le chargement."
                : "Cette fiche n’existe pas ou n’est plus disponible."}
            </p>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Link
        to="/clients"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux clients
      </Link>

      <PageHeader
        title={client.raison_sociale}
        subtitle={
          client.type_nuisible ? (
            <Badge variant="secondary">{client.type_nuisible}</Badge>
          ) : (
            "Fiche client"
          )
        }
        actions={
          <PageActions className="w-full sm:w-auto">
            {client.telephone && (
              <Button asChild variant="outline" className="flex-1 sm:flex-none">
                <a href={`tel:${client.telephone}`}>
                  <Phone className="h-4 w-4" />
                  Appeler
                </a>
              </Button>
            )}
            {client.email && (
              <Button asChild variant="outline" className="flex-1 sm:flex-none">
                <a href={`mailto:${client.email}`}>
                  <Mail className="h-4 w-4" />
                  Écrire
                </a>
              </Button>
            )}
          </PageActions>
        }
      />

      {!client.email && (
        <div className="flex flex-col gap-3 rounded-2xl border border-warning/50 bg-warning/10 p-4 text-sm sm:flex-row sm:items-center">
          <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />
          <span className="flex-1 text-foreground">
            Email manquant — requis pour l’envoi des rapports.
          </span>
          <a
            href="#modifier"
            onClick={() => setIsEditing(true)}
            className="shrink-0 text-xs font-semibold text-primary hover:underline"
          >
            Corriger
          </a>
        </div>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-6">
          <PageSection title="Activité">
            <div className="grid gap-3 sm:grid-cols-2">
              <SummaryCard
                icon={ClipboardList}
                value={interventions.length}
                label={`intervention${interventions.length > 1 ? "s" : ""}`}
              />
              <SummaryCard
                icon={FileSignature}
                value={clientContracts.length}
                label={`contrat${clientContracts.length > 1 ? "s" : ""}`}
              />
            </div>
          </PageSection>

          {clientContracts.length > 0 && (
            <PageSection title="Contrats">
              <div className="grid gap-3">
                {clientContracts.map((contract) => (
                  <Link
                    key={contract.id}
                    to="/contrats/$id"
                    params={{ id: contract.id }}
                    className="group"
                  >
                    <Card className="hover:border-primary/30">
                      <CardContent className="flex items-center gap-4 p-4">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                          <FileSignature className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium">
                            {formatDateFR(contract.date_debut)} → {formatDateFR(contract.date_fin)}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {contract.passages_realises}/{contract.nb_passages_inclus} passages
                          </div>
                        </div>
                        <Badge variant="secondary">
                          {statutLabel(STATUTS_CONTRAT, contract.statut)}
                        </Badge>
                        <ChevronRight className="hidden h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 sm:block" />
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </PageSection>
          )}

          <PageSection title="Devis et factures">
            {clientQuotes.length === 0 && clientInvoices.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-sm text-muted-foreground">
                  Aucun devis ni facture pour ce client.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {clientQuotes.map((quote) => (
                  <Link key={quote.id} to="/devis/$id" params={{ id: quote.id }}>
                    <Card className="hover:border-primary/30">
                      <CardContent className="flex items-center justify-between gap-3 p-4">
                        <div>
                          <div className="font-semibold">Devis {quote.numero}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {formatDateFR(quote.date_devis)}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  </Link>
                ))}
                {clientInvoices.map((invoice) => (
                  <Link key={invoice.id} to="/factures/$id" params={{ id: invoice.id }}>
                    <Card className="hover:border-primary/30">
                      <CardContent className="flex items-center justify-between gap-3 p-4">
                        <div>
                          <div className="font-semibold">Facture n°{invoice.numero}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {formatDateFR(invoice.date_facture)}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </PageSection>

          <PageSection title="Historique des interventions">
            {interventions.length === 0 ? (
              <Card className="hover:translate-y-0 hover:shadow-soft">
                <CardContent className="flex flex-col items-center px-6 py-10 text-center">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                    <CalendarDays className="h-4 w-4" />
                  </span>
                  <p className="mt-4 text-sm font-medium">Aucune intervention</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Les interventions de ce client apparaîtront ici.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {interventions.map((intervention) => (
                  <Link
                    key={intervention.id}
                    to="/interventions/$id"
                    params={{ id: intervention.id }}
                    className="group"
                  >
                    <Card className="hover:border-primary/30">
                      <CardContent className="flex items-center gap-4 p-4">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                          <CalendarDays className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium">{formatDateFR(intervention.date)}</div>
                          <div className="mt-1 truncate text-xs text-muted-foreground">
                            {intervention.type_intervention}
                            {intervention.type_nuisible ? ` · ${intervention.type_nuisible}` : ""}
                          </div>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2 py-1 text-[10px] font-medium uppercase",
                            STATUT_INTERVENTION_COLORS[intervention.statut] ??
                              "bg-muted text-muted-foreground",
                          )}
                        >
                          {statutInterventionLabel(intervention.statut)}
                        </span>
                        <ChevronRight className="hidden h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 sm:block" />
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </PageSection>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-24">
          <PageSection title="Informations client" className="scroll-mt-24">
            <Card id="modifier" className="hover:translate-y-0 hover:shadow-soft">
              <CardContent className={cn(isEditing ? "p-4 sm:p-6" : "p-0")}>
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold">Modifier la fiche</p>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsEditing(false)}
                      >
                        <X className="h-4 w-4" /> Annuler
                      </Button>
                    </div>
                    <ClientForm
                      key={client.updated_at ?? client.id}
                      defaultValues={client}
                      onSubmit={handleUpdate}
                      submitLabel="Enregistrer les modifications"
                    />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-3 border-b border-border/50 p-4">
                      <p className="text-xs text-muted-foreground">
                        Identité, contact et informations légales
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setIsEditing(true)}
                      >
                        <Pencil className="h-4 w-4" /> Modifier
                      </Button>
                    </div>
                    <div className="divide-y divide-border/50">
                      <ContactRow icon={Building2} label="Raison sociale / Nom">
                        <span className="break-words">{client.raison_sociale}</span>
                      </ContactRow>
                      <ContactRow icon={MapPin} label="Adresse du site">
                        {client.adresse_site ? (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(client.adresse_site)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="break-words text-primary hover:underline"
                          >
                            {client.adresse_site}
                          </a>
                        ) : (
                          <EmptyValue />
                        )}
                      </ContactRow>
                      <ContactRow icon={Phone} label="Téléphone">
                        {client.telephone ? (
                          <a
                            href={`tel:${client.telephone}`}
                            className="text-primary hover:underline"
                          >
                            {client.telephone}
                          </a>
                        ) : (
                          <EmptyValue />
                        )}
                      </ContactRow>
                      <ContactRow icon={Mail} label="Email">
                        {client.email ? (
                          <a
                            href={`mailto:${client.email}`}
                            className="break-all text-primary hover:underline"
                          >
                            {client.email}
                          </a>
                        ) : (
                          <EmptyValue />
                        )}
                      </ContactRow>
                      <ContactRow icon={Hash} label="SIRET">
                        <span>{client.siret || <EmptyValue />}</span>
                      </ContactRow>
                      <ContactRow icon={Hash} label="SIREN">
                        <span>{client.siren || <EmptyValue />}</span>
                      </ContactRow>
                      <ContactRow icon={Hash} label="RCS">
                        <span>{client.rcs || <EmptyValue />}</span>
                      </ContactRow>
                      <ContactRow icon={Building2} label="Forme juridique">
                        <span>{client.forme_juridique || <EmptyValue />}</span>
                      </ContactRow>
                      <ContactRow icon={ClipboardList} label="Type de nuisible">
                        <span>{client.type_nuisible || <EmptyValue />}</span>
                      </ContactRow>
                      <ContactRow icon={ClipboardList} label="Notes">
                        <span className="whitespace-pre-wrap break-words">
                          {client.notes || <EmptyValue />}
                        </span>
                      </ContactRow>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </PageSection>
        </aside>
      </div>

      <PageSection title="Zone sensible">
        <Card className="border-destructive/30 hover:translate-y-0 hover:shadow-soft">
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <p className="text-sm font-semibold">Supprimer ce client</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Cette action supprimera aussi les interventions et contrats liés.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="border-destructive/40 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Supprimer
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer ce client ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Toutes les interventions et contrats liés seront supprimés.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive">
                    Supprimer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </PageSection>
    </PageContainer>
  );
}

function SummaryCard({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof ClipboardList;
  value: number;
  label: string;
}) {
  return (
    <Card className="hover:translate-y-0 hover:shadow-soft">
      <CardContent className="flex items-center gap-4 p-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <div className="text-2xl font-bold tabular-nums">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function ContactRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof MapPin;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 p-4">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className="mt-1 text-sm">{children}</div>
      </div>
    </div>
  );
}

function EmptyValue() {
  return <span className="text-muted-foreground">Non renseigné</span>;
}

function ClientDetailLoading() {
  return (
    <PageContainer>
      <Skeleton className="h-5 w-32" />
      <div className="space-y-3">
        <Skeleton className="h-8 w-72 max-w-full" />
        <Skeleton className="h-5 w-24" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
          <Skeleton className="h-64 rounded-2xl" />
        </div>
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </PageContainer>
  );
}
