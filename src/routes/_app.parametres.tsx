import { createFileRoute, Link } from "@tanstack/react-router";
import { APP_NAME } from "@/lib/brand";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { settingsSchema, type SettingsForm } from "@/lib/schemas";
import { useSettings, useProduitsBiocides, useMyAccess, type ProduitBiocide } from "@/lib/queries";
import { db } from "@/lib/db";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  BarChart2,
  ChevronRight,
  Download,
  ImageIcon,
  Plus,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import * as XLSX from "xlsx";
import { uploadCompanyLogo, deleteCompanyLogo } from "@/lib/photos";
import { supabase } from "@/integrations/supabase/client";
import { PermissionGate } from "@/components/permission-gate";
import { PageContainer, PageHeader, PageSection } from "@/components/page-layout";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_app/parametres")({
  head: () => ({ meta: [{ title: `Paramètres — ${APP_NAME}` }] }),
  component: () => (
    <PermissionGate perm="parametres">
      <ParametresPage />
    </PermissionGate>
  ),
});

const TYPES_BIOCIDE = ["Rodenticide", "Insecticide", "Autre"] as const;

// ─── Produits biocides editor ─────────────────────────────────────────────────

function ProduitsEditor({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data: produits = [], isLoading, isError } = useProduitsBiocides();
  const [adding, setAdding] = useState(false);
  const [newProduit, setNewProduit] = useState({
    nom: "",
    numero_homologation: "",
    type: "Rodenticide",
    dose_habituelle: "",
  });

  async function handleAdd() {
    if (!newProduit.nom.trim()) {
      toast.error("Nom requis");
      return;
    }
    const ordre = produits.length;
    const { error } = await db.from("produits_biocides").insert({
      user_id: userId,
      nom: newProduit.nom.trim(),
      numero_homologation: newProduit.numero_homologation.trim(),
      type: newProduit.type,
      dose_habituelle: newProduit.dose_habituelle.trim(),
      ordre,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["produits_biocides"] });
    setNewProduit({ nom: "", numero_homologation: "", type: "Rodenticide", dose_habituelle: "" });
    setAdding(false);
    toast.success("Produit ajouté");
  }

  async function handleDelete(id: string) {
    await db.from("produits_biocides").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["produits_biocides"] });
    toast.success("Produit supprimé");
  }

  if (isLoading)
    return (
      <div className="space-y-2">
        {[0, 1].map((item) => (
          <Skeleton key={item} className="h-16 rounded-xl" />
        ))}
      </div>
    );
  if (isError)
    return <p className="text-sm text-destructive">Impossible de charger les produits biocides.</p>;

  return (
    <div className="space-y-2">
      {produits.length > 0 && (
        <div className="space-y-2">
          {produits.map((p) => (
            <div key={p.id} className="space-y-1 rounded-xl border border-border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="break-words text-sm font-medium">{p.nom}</div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                    {p.numero_homologation && (
                      <span className="text-xs text-muted-foreground">
                        N° hom. : {p.numero_homologation}
                      </span>
                    )}
                    <span className="text-xs text-accent font-medium">{p.type}</span>
                    {p.dose_habituelle && (
                      <span className="text-xs text-muted-foreground">
                        Dose : {p.dose_habituelle}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={`Supprimer ${p.nom}`}
                  onClick={() => handleDelete(p.id)}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-destructive/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {adding ? (
        <div className="rounded-xl border-2 border-dashed border-accent/40 p-3 space-y-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Nom commercial *
              </label>
              <Input
                placeholder="ex: Brodifacoum Pellets"
                value={newProduit.nom}
                onChange={(e) => setNewProduit((v) => ({ ...v, nom: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                N° homologation
              </label>
              <Input
                placeholder="ex: FR-2021-0001234"
                value={newProduit.numero_homologation}
                onChange={(e) =>
                  setNewProduit((v) => ({ ...v, numero_homologation: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Type
              </label>
              <Select
                value={newProduit.type}
                onValueChange={(value) => setNewProduit((v) => ({ ...v, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES_BIOCIDE.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Dose habituelle
              </label>
              <Input
                placeholder="ex: 150g par point d'appât"
                value={newProduit.dose_habituelle}
                onChange={(e) => setNewProduit((v) => ({ ...v, dose_habituelle: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => setAdding(false)}
            >
              Annuler
            </Button>
            <Button type="button" className="min-h-11" onClick={handleAdd}>
              Ajouter
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex min-h-11 w-full items-center gap-2 rounded-xl border border-dashed border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-accent/50 hover:text-accent"
        >
          <Plus className="h-4 w-4" /> Ajouter un produit biocide
        </button>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function ParametresPage() {
  const { data: settings, isLoading, isError } = useSettings();
  const { can } = useMyAccess();
  const qc = useQueryClient();
  const [exporting, setExporting] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [nomTechnicien, setNomTechnicien] = useState("");
  const [numeroCertibiocide, setNumeroCertibiocide] = useState("");
  const [savingPro, setSavingPro] = useState(false);
  const [relanceN1, setRelanceN1] = useState(7);
  const [relanceN2, setRelanceN2] = useState(1);
  const [relanceN3, setRelanceN3] = useState(31);
  const [relanceSignature, setRelanceSignature] = useState("");
  const [savingRelance, setSavingRelance] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (settings) {
      setNomTechnicien(settings.nom_technicien ?? "");
      setNumeroCertibiocide(settings.numero_certibiocide ?? "");
      setRelanceN1(settings.relance_delai_n1 ?? 7);
      setRelanceN2(settings.relance_delai_n2 ?? 1);
      setRelanceN3(settings.relance_delai_n3 ?? 31);
      setRelanceSignature(settings.relance_signature ?? "");
    }
  }, [settings]);

  async function handleSaveRelance() {
    if (!settings?.user_id) return;
    setSavingRelance(true);
    const { data, error } = await db
      .from("company_settings")
      .update({
        relance_delai_n1: relanceN1,
        relance_delai_n2: relanceN2,
        relance_delai_n3: relanceN3,
        relance_signature: relanceSignature.trim(),
      })
      .eq("user_id", settings.user_id)
      .select()
      .single();
    setSavingRelance(false);
    if (error || !data) {
      toast.error(
        error?.message ?? "Vous n'avez pas les droits pour enregistrer cette modification.",
      );
      return;
    }
    qc.invalidateQueries({ queryKey: ["settings"] });
    toast.success("Configuration relances enregistrée");
  }

  async function handleSavePro() {
    if (!settings?.user_id) return;
    setSavingPro(true);
    const { data, error } = await db
      .from("company_settings")
      .update({
        nom_technicien: nomTechnicien.trim() || null,
        numero_certibiocide: numeroCertibiocide.trim() || null,
      })
      .eq("user_id", settings.user_id)
      .select()
      .single();
    setSavingPro(false);
    if (error || !data) {
      toast.error(
        error?.message ?? "Vous n'avez pas les droits pour enregistrer cette modification.",
      );
      return;
    }
    qc.invalidateQueries({ queryKey: ["settings"] });
    toast.success("Informations professionnelles enregistrées");
  }

  async function handleLogoUpload(file: File) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setLogoUploading(true);
    try {
      const url = await uploadCompanyLogo(file, user.id);
      if (!url) return;
      const { data, error } = await db
        .from("company_settings")
        .update({ logo_url: url })
        .eq("user_id", user.id)
        .select()
        .single();
      if (error || !data) {
        toast.error(
          error?.message ?? "Vous n'avez pas les droits pour enregistrer cette modification.",
        );
        return;
      }
      qc.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Logo mis à jour");
    } finally {
      setLogoUploading(false);
    }
  }

  async function handleLogoDelete() {
    if (!settings?.logo_url) return;
    await deleteCompanyLogo(settings.logo_url);
    const { data, error } = await db
      .from("company_settings")
      .update({ logo_url: null })
      .eq("user_id", settings.user_id)
      .select()
      .single();
    if (error || !data) {
      toast.error(
        error?.message ?? "Vous n'avez pas les droits pour enregistrer cette modification.",
      );
      return;
    }
    qc.invalidateQueries({ queryKey: ["settings"] });
    toast.success("Logo supprimé");
  }

  /* eslint-disable @typescript-eslint/no-explicit-any -- export historique de tables hétérogènes, logique inchangée */
  async function handleExport() {
    setExporting(true);
    try {
      const [
        clients,
        interventions,
        invoices,
        invoiceLines,
        contracts,
        stock,
        stockLevels,
        teamMembers,
      ] = await Promise.all([
        db.from("clients").select("*").order("raison_sociale"),
        db
          .from("interventions")
          .select("*, client:clients(raison_sociale)")
          .order("date", { ascending: false }),
        db
          .from("invoices")
          .select("*, client:clients(raison_sociale)")
          .order("numero", { ascending: false }),
        db.from("invoice_lines").select("*").order("ordre"),
        db.from("contracts").select("*, client:clients(raison_sociale)").order("date_fin"),
        db.from("stock_products").select("*").order("nom"),
        db.from("stock_levels").select("*, product:stock_products(nom, unite)"),
        db.from("team_members").select("user_id, display_name, username"),
      ]);

      const wb = XLSX.utils.book_new();

      const sheetClients = XLSX.utils.json_to_sheet(
        (clients.data ?? []).map((c: any) => ({
          "Raison sociale": c.raison_sociale,
          Adresse: c.adresse_site ?? "",
          Téléphone: c.telephone ?? "",
          Email: c.email ?? "",
          SIRET: c.siret ?? "",
          "Type nuisible": c.type_nuisible ?? "",
          Notes: c.notes ?? "",
          "Créé le": c.created_at?.slice(0, 10) ?? "",
        })),
      );
      XLSX.utils.book_append_sheet(wb, sheetClients, "Clients");

      const sheetInterventions = XLSX.utils.json_to_sheet(
        (interventions.data ?? []).map((i: any) => ({
          Date: i.date,
          Client: (i.client as any)?.raison_sociale ?? "",
          Adresse: i.adresse_site ?? "",
          "Type nuisible": i.type_nuisible ?? "",
          "Type intervention": i.type_intervention ?? "",
          Produits: i.produits ?? "",
          Quantité: i.quantite ?? "",
          Statut: i.statut,
          Observations: i.observations ?? "",
          "Prochain passage": i.date_prochain_passage ?? "",
        })),
      );
      XLSX.utils.book_append_sheet(wb, sheetInterventions, "Interventions");

      const sheetFactures = XLSX.utils.json_to_sheet(
        (invoices.data ?? []).map((f: any) => ({
          "N°": f.numero,
          Date: f.date_facture,
          Échéance: f.echeance ?? "",
          Client: (f.client as any)?.raison_sociale ?? "",
          Statut: f.statut,
          "Total HT": f.total_ht,
          TVA: f.tva,
          "Total TTC": f.total_ttc,
          Notes: f.notes ?? "",
        })),
      );
      XLSX.utils.book_append_sheet(wb, sheetFactures, "Factures");

      const sheetLines = XLSX.utils.json_to_sheet(
        (invoiceLines.data ?? []).map((l: any) => ({
          "Facture ID": l.invoice_id,
          Description: l.description,
          Quantité: l.quantite,
          "Prix unitaire HT": l.prix_unitaire_ht,
          "Total HT": l.total_ht,
          Ordre: l.ordre,
        })),
      );
      XLSX.utils.book_append_sheet(wb, sheetLines, "Lignes factures");

      const sheetContrats = XLSX.utils.json_to_sheet(
        (contracts.data ?? []).map((c: any) => ({
          Client: (c.client as any)?.raison_sociale ?? "",
          "Date début": c.date_debut,
          "Date fin": c.date_fin,
          "Passages inclus": c.nb_passages_inclus,
          "Passages réalisés": c.passages_realises,
          Statut: c.statut,
          Notes: c.notes ?? "",
        })),
      );
      XLSX.utils.book_append_sheet(wb, sheetContrats, "Contrats");

      const sheetStock = XLSX.utils.json_to_sheet(
        (stock.data ?? []).map((p: any) => ({
          Produit: p.nom,
          Unité: p.unite,
          "Seuil alerte": p.seuil_alerte,
          "Prix achat HT": p.prix_achat_ht,
        })),
      );
      XLSX.utils.book_append_sheet(wb, sheetStock, "Stock (catalogue)");

      const memberNameById = new Map<string, string>();
      for (const m of teamMembers.data ?? []) {
        memberNameById.set(m.user_id, m.display_name || m.username || "Sans nom");
      }
      const sheetStockLevels = XLSX.utils.json_to_sheet(
        (stockLevels.data ?? []).map((l: any) => ({
          Produit: l.product?.nom ?? "",
          Emplacement: l.technicien_id
            ? (memberNameById.get(l.technicien_id) ?? "Camion")
            : "Garage",
          Quantité: l.quantite,
          Unité: l.product?.unite ?? "",
        })),
      );
      XLSX.utils.book_append_sheet(wb, sheetStockLevels, "Stock (niveaux)");

      const date = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `city-derat-sauvegarde-${date}.xlsx`);
      toast.success("Export téléchargé");
    } catch (e: any) {
      toast.error(e.message ?? "Erreur lors de l'export");
    } finally {
      setExporting(false);
    }
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const form = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema) as Resolver<SettingsForm>,
    defaultValues: {
      nom: "",
      adresse: "",
      siret: "",
      tva_number: "",
      telephone: "",
      email: "",
      iban: "",
      bic: "",
      objectif_ca_mensuel: 3000,
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        nom: settings.nom ?? "",
        adresse: settings.adresse ?? "",
        siret: settings.siret ?? "",
        tva_number: settings.tva_number ?? "",
        telephone: settings.telephone ?? "",
        email: settings.email ?? "",
        iban: settings.iban ?? "",
        bic: settings.bic ?? "",
        objectif_ca_mensuel: settings.objectif_ca_mensuel ?? 3000,
      });
    }
  }, [settings, form]);

  async function onSubmit(values: SettingsForm) {
    const { data, error } = await db
      .from("company_settings")
      .update(values)
      .eq("user_id", settings?.user_id)
      .select()
      .single();
    if (error || !data) {
      toast.error(
        error?.message ?? "Vous n'avez pas les droits pour enregistrer cette modification.",
      );
      return;
    }
    qc.invalidateQueries({ queryKey: ["settings"] });
    toast.success("Paramètres enregistrés");
  }

  if (isLoading) {
    return (
      <PageContainer>
        <Skeleton className="h-16 rounded-xl" />
        <div className="grid gap-4 lg:grid-cols-2">
          {[0, 1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-64 rounded-xl" />
          ))}
        </div>
      </PageContainer>
    );
  }

  if (isError) {
    return (
      <PageContainer>
        <Card className="border-destructive/30">
          <CardContent className="py-12 text-center text-sm text-destructive">
            Impossible de charger les paramètres.
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="flex flex-col">
      <PageHeader
        title="Paramètres"
        subtitle="Gérez l’identité de votre société, vos documents et vos préférences."
      />

      <PageSection title="Outils" className="order-4">
        <div className="grid gap-3 lg:grid-cols-2">
          <Link to="/stats">
            <Card className="h-full cursor-pointer transition-colors hover:border-primary/40">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
                    <BarChart2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">Statistiques mensuelles</div>
                    <div className="text-xs text-muted-foreground">
                      CA, interventions, top clients
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          </Link>

          {can("export") && (
            <Card className="h-full">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Download className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">Sauvegarde des données</div>
                    <div className="text-xs text-muted-foreground">
                      Clients, interventions, factures, contrats, stock
                    </div>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={handleExport} disabled={exporting}>
                  {exporting ? "Export…" : "Exporter Excel"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </PageSection>

      <PageSection title="Identité et automatisation" className="order-3">
        <div className="grid items-start gap-4 lg:grid-cols-2">
          {/* Logo société */}
          <Card className="h-full">
            <CardContent className="space-y-4 p-4 sm:p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Logo société
              </h2>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-border overflow-hidden bg-muted/30">
                  {settings?.logo_url ? (
                    <img
                      src={settings.logo_url}
                      alt="Logo"
                      className="h-full w-full object-contain p-1"
                    />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="space-y-2 flex-1">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleLogoUpload(f);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 w-full"
                    disabled={logoUploading}
                    onClick={() => logoInputRef.current?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {logoUploading
                      ? "Upload…"
                      : settings?.logo_url
                        ? "Changer le logo"
                        : "Importer un logo"}
                  </Button>
                  {settings?.logo_url && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="min-h-11 w-full text-destructive hover:text-destructive"
                      onClick={handleLogoDelete}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground">
                    PNG ou JPG — apparaît sur les factures et rapports
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Relances automatiques */}
          <Card className="h-full">
            <CardContent className="space-y-4 p-4 sm:p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Relances automatiques
              </h2>
              <p className="text-xs text-muted-foreground">
                Définissez les délais (en jours) pour chaque niveau de relance.
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Rappel avant (J-)">
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={relanceN1}
                    onChange={(e) => setRelanceN1(Number(e.target.value))}
                  />
                </Field>
                <Field label="Relance amiable (J+)">
                  <Input
                    type="number"
                    min={1}
                    max={60}
                    value={relanceN2}
                    onChange={(e) => setRelanceN2(Number(e.target.value))}
                  />
                </Field>
                <Field label="Mise en demeure (J+)">
                  <Input
                    type="number"
                    min={1}
                    max={90}
                    value={relanceN3}
                    onChange={(e) => setRelanceN3(Number(e.target.value))}
                  />
                </Field>
              </div>
              <Field label="Signature email">
                <Textarea
                  rows={3}
                  placeholder={"Cordialement,\nMon Entreprise\nTéléphone : 06 XX XX XX XX"}
                  value={relanceSignature}
                  onChange={(e) => setRelanceSignature(e.target.value)}
                />
              </Field>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 w-full sm:w-auto"
                disabled={savingRelance}
                onClick={handleSaveRelance}
              >
                {savingRelance ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageSection>

      {/* Informations professionnelles */}
      <PageSection title="Activité professionnelle" className="order-2">
        <Card>
          <CardContent className="space-y-6 p-4 sm:p-6">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-accent shrink-0" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Informations professionnelles{" "}
                <span className="normal-case font-normal text-muted-foreground/70">
                  (optionnel)
                </span>
              </h2>
            </div>

            <div className="space-y-3">
              <Field label="Nom du technicien">
                <Input
                  placeholder="ex: Jean Dupont"
                  value={nomTechnicien}
                  onChange={(e) => setNomTechnicien(e.target.value)}
                />
              </Field>
              <Field label="Numéro Certibiocide">
                <Input
                  placeholder="ex: CB-12345-2024"
                  value={numeroCertibiocide}
                  onChange={(e) => setNumeroCertibiocide(e.target.value)}
                />
              </Field>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 w-full sm:w-auto"
                disabled={savingPro}
                onClick={handleSavePro}
              >
                {savingPro ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </div>

            <div className="border-t pt-3 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Produits biocides habituels
              </div>
              <p className="text-xs text-muted-foreground">
                Ces produits apparaîtront sur le certificat de traitement biocide.
              </p>
              {settings?.user_id && <ProduitsEditor userId={settings.user_id} />}
            </div>
          </CardContent>
        </Card>
      </PageSection>

      {/* Infos société */}
      <PageSection title="Identité légale et coordonnées" className="order-1">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Société
              </h2>
              <Field label="Nom *" error={form.formState.errors.nom?.message}>
                <Input {...form.register("nom")} />
              </Field>
              <Field label="Adresse">
                <Textarea rows={2} {...form.register("adresse")} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="SIRET">
                  <Input {...form.register("siret")} />
                </Field>
                <Field label="N° TVA">
                  <Input {...form.register("tva_number")} />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Téléphone">
                  <Input {...form.register("telephone")} />
                </Field>
                <Field label="Email" error={form.formState.errors.email?.message}>
                  <Input type="email" {...form.register("email")} />
                </Field>
              </div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground pt-2">
                Objectifs
              </h2>
              <Field
                label="Objectif CA mensuel (€)"
                error={form.formState.errors.objectif_ca_mensuel?.message}
              >
                <Input type="number" min={0} step={100} {...form.register("objectif_ca_mensuel")} />
              </Field>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground pt-2">
                Coordonnées bancaires
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="IBAN">
                  <Input {...form.register("iban")} />
                </Field>
                <Field label="BIC">
                  <Input {...form.register("bic")} />
                </Field>
              </div>
              <Button
                type="submit"
                className="min-h-11 w-full sm:w-auto sm:min-w-48"
                disabled={form.formState.isSubmitting}
              >
                Enregistrer
              </Button>
            </form>
          </CardContent>
        </Card>
      </PageSection>
    </PageContainer>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
