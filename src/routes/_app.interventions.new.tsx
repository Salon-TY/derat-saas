import { createFileRoute, useNavigate, Link, useSearch } from "@tanstack/react-router";
import { APP_NAME } from "@/lib/brand";
import { ArrowLeft, TriangleAlert } from "lucide-react";
import { InterventionForm, type StockUsageItem } from "@/components/intervention-form";
import { logStockMovement, useQuote, useClients } from "@/lib/queries";
import { db } from "@/lib/db";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { InterventionForm as IFType } from "@/lib/schemas";
import { PageContainer, PageHeader, PageSection } from "@/components/page-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCard } from "@/components/alert-card";
import { findNearDuplicateClient } from "@/lib/similarity";

export const Route = createFileRoute("/_app/interventions/new")({
  head: () => ({ meta: [{ title: `Nouvelle intervention — ${APP_NAME}` }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    client_id: typeof s.client_id === "string" ? s.client_id : undefined,
    date: typeof s.date === "string" ? s.date : undefined,
    from_devis: typeof s.from_devis === "string" ? s.from_devis : undefined,
  }),
  component: NewIntervention,
});

// Texte de consignes généré depuis les lignes du devis d'origine — jamais de
// valeur inventée : si le devis n'a aucune ligne, on ne préremplit rien.
function buildConsignesFromDevis(numero: string, lines: { description: string; quantite: number }[]) {
  if (lines.length === 0) return "";
  const items = lines
    .map((l) => `- ${l.description}${l.quantite ? ` ×${l.quantite}` : ""}`)
    .join("\n");
  return `Prestations prévues (devis ${numero}) :\n${items}`;
}

// Récupère le niveau de stock d'un produit à l'emplacement voulu (camion du
// technicien si assigné, sinon garage). Retourne null si aucune ligne n'existe.
async function fetchStockLevel(productId: string, technicienId: string | null) {
  let q = db.from("stock_levels").select("id, quantite").eq("product_id", productId);
  q = technicienId ? q.eq("technicien_id", technicienId) : q.is("technicien_id", null);
  const { data } = await q.maybeSingle();
  return data as { id: string; quantite: number } | null;
}

function NewIntervention() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const search = useSearch({ from: "/_app/interventions/new" });
  const { data: quote, isLoading: quoteLoading } = useQuote(search.from_devis);
  const { data: clients = [] } = useClients();

  // Création = planification uniquement : aucun produit/stock n'est saisi ici,
  // le compte-rendu (produits, observations, photos, signature) se remplit
  // depuis la page détail une fois l'intervention démarrée par l'assigné.
  async function handleSubmit(values: IFType, stockItems: StockUsageItem[]) {
    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes.user?.id ?? "";
    const technicienId = values.technicien_id || null;

    const payload = {
      ...values,
      contract_id: values.contract_id || null,
      technicien_id: values.technicien_id || null,
      date_prochain_passage: values.date_prochain_passage || null,
      heure_prevue: values.heure_prevue || null,
      devis_id: search.from_devis ?? null,
      user_id: userId,
    };
    const { data: newIntervention, error } = await db
      .from("interventions")
      .insert(payload)
      .select()
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }

    // Devis marqué "converti" seulement une fois l'intervention réellement
    // créée (l'utilisateur a validé le formulaire, pas de bascule automatique
    // au clic sur "Créer l'intervention" sur la fiche devis).
    if (search.from_devis) {
      await db.from("devis").update({ statut: "converti" }).eq("id", search.from_devis);
      qc.invalidateQueries({ queryKey: ["devis"] });
      qc.invalidateQueries({ queryKey: ["devis", search.from_devis] });
    }

    // Filet de sécurité : si des produits ont malgré tout été fournis (compat.
    // futur), on applique la même déduction qu'avant plutôt que de la perdre.
    for (const item of stockItems) {
      const level = await fetchStockLevel(item.product_id, technicienId);
      const current = Number(level?.quantite ?? 0);
      const next = Math.max(0, current - item.quantite);
      if (level) {
        await db.from("stock_levels").update({ quantite: next }).eq("id", level.id);
      } else {
        await db.from("stock_levels").insert({
          product_id: item.product_id,
          technicien_id: technicienId,
          quantite: next,
          user_id: userId,
        });
      }
      await logStockMovement({
        product_id: item.product_id,
        type: "consommation",
        technicien_id: technicienId,
        intervention_id: newIntervention?.id ?? null,
        quantite: item.quantite,
      });
    }
    if (stockItems.length > 0) {
      qc.invalidateQueries({ queryKey: ["stock_levels"] });
      qc.invalidateQueries({ queryKey: ["my_van_stock"] });
      qc.invalidateQueries({ queryKey: ["product_stats"] });
    }

    qc.invalidateQueries({ queryKey: ["interventions"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    qc.invalidateQueries({ queryKey: ["my_todo_count"] });
    toast.success("Intervention planifiée");
    navigate({ to: "/interventions" });
  }

  // Le formulaire ne doit monter qu'une fois le devis chargé : InterventionForm
  // capture ses defaultValues dans useForm() au montage (react-hook-form), un
  // rendu prématuré rendrait le préremplissage silencieusement inopérant.
  const waitingForDevis = !!search.from_devis && quoteLoading;

  const formDefaults =
    search.from_devis && quote
      ? {
          client_id: quote.client_id,
          adresse_site: quote.client?.adresse_site ?? "",
          consignes: buildConsignesFromDevis(quote.numero, quote.lines ?? []),
        }
      : { client_id: search.client_id, date: search.date };

  const nearDuplicate =
    quote?.client && !waitingForDevis
      ? findNearDuplicateClient(quote.client.raison_sociale, quote.client_id, clients)
      : null;

  return (
    <PageContainer>
      <Link
        to="/interventions"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-1 h-4 w-4" /> Retour
      </Link>
      <PageHeader
        title="Nouvelle intervention"
        subtitle="Planifiez la mission et assignez-la à un technicien."
      />
      <PageSection title="Informations de planification" className="max-w-4xl">
        {waitingForDevis ? (
          <div className="space-y-3">
            <Skeleton className="h-11 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        ) : (
          <>
            {nearDuplicate && (
              <AlertCard
                icon={TriangleAlert}
                tone="warning"
                href={`/clients/${nearDuplicate.id}`}
                className="mb-4"
              >
                Le client de ce devis (« {quote?.client?.raison_sociale} ») a un nom proche de{" "}
                <strong>{nearDuplicate.raison_sociale}</strong>, déjà présent dans vos clients.
                Vérifiez qu'il ne s'agit pas d'un doublon avant de continuer.
              </AlertCard>
            )}
            <Card>
              <CardContent className="p-4 sm:p-6">
                <InterventionForm
                  mode="planification"
                  defaultValues={formDefaults}
                  onSubmit={handleSubmit}
                  submitLabel="Planifier l'intervention"
                />
              </CardContent>
            </Card>
          </>
        )}
      </PageSection>
    </PageContainer>
  );
}
