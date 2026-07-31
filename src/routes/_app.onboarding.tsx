/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { APP_NAME } from "@/lib/brand";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { onboardingSchema, type OnboardingForm } from "@/lib/schemas";
import { useSettings } from "@/lib/queries";
import { db } from "@/lib/db";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2 } from "lucide-react";

export const Route = createFileRoute("/_app/onboarding")({
  head: () => ({ meta: [{ title: `Bienvenue — ${APP_NAME}` }] }),
  component: OnboardingPage,
});

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

function OnboardingPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: settings } = useSettings();

  const form = useForm<OnboardingForm>({
    resolver: zodResolver(onboardingSchema) as any,
    defaultValues: { nom: "", siret: "", tva_number: "", telephone: "", adresse: "", email: "" },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        nom: settings.nom ?? "",
        siret: settings.siret ?? "",
        tva_number: settings.tva_number ?? "",
        telephone: settings.telephone ?? "",
        adresse: settings.adresse ?? "",
        email: settings.email ?? "",
      });
    }
  }, [settings, form]);

  async function onSubmit(values: OnboardingForm) {
    if (!settings?.user_id) return;
    const { error } = await db
      .from("company_settings")
      .update(values)
      .eq("user_id", settings.user_id);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["settings"] });
    toast.success("Société configurée");
    navigate({ to: "/app", replace: true });
  }

  return (
    <div className="fixed inset-0 z-50 flex min-h-screen items-center justify-center overflow-y-auto bg-background px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <Building2 className="h-7 w-7" />
          </div>
          <CardTitle className="mt-2 text-2xl tracking-tight">Bienvenue !</CardTitle>
          <CardDescription>Configurons votre société</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <Field label="Nom de la société *" error={form.formState.errors.nom?.message}>
              <Input {...form.register("nom")} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="SIRET">
                <Input {...form.register("siret")} />
              </Field>
              <Field label="N° TVA">
                <Input {...form.register("tva_number")} />
              </Field>
            </div>
            <Field label="Téléphone">
              <Input {...form.register("telephone")} />
            </Field>
            <Field label="Adresse">
              <Textarea rows={2} {...form.register("adresse")} />
            </Field>
            <Field label="Email de contact" error={form.formState.errors.email?.message}>
              <Input type="email" {...form.register("email")} />
            </Field>
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Patientez..." : "Enregistrer et continuer"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
