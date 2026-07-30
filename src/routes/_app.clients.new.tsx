import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { APP_NAME } from "@/lib/brand";
import { ClientForm } from "@/components/client-form";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageContainer, PageHeader } from "@/components/page-layout";
import { db } from "@/lib/db";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ClientForm as ClientFormType } from "@/lib/schemas";
import { PermissionGate } from "@/components/permission-gate";

export const Route = createFileRoute("/_app/clients/new")({
  head: () => ({ meta: [{ title: `Nouveau client — ${APP_NAME}` }] }),
  component: () => (
    <PermissionGate perm="clients">
      <NewClient />
    </PermissionGate>
  ),
});

function NewClient() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function handleSubmit(values: ClientFormType) {
    const { data: userRes } = await supabase.auth.getUser();
    const { data, error } = await db
      .from("clients")
      .insert({ ...values, user_id: userRes.user?.id })
      .select()
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["clients"] });
    toast.success("Client créé");
    navigate({ to: "/clients/$id", params: { id: data.id } });
  }

  return (
    <PageContainer className="max-w-4xl">
      <Link
        to="/clients"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux clients
      </Link>
      <PageHeader
        title="Nouveau client"
        subtitle="Renseignez les informations utiles pour préparer les interventions et les documents."
      />
      <Card className="hover:translate-y-0 hover:shadow-soft">
        <CardContent className="p-4 sm:p-6">
          <ClientForm onSubmit={handleSubmit} />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
