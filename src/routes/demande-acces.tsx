import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Bug, Check, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitAccessRequest } from "@/lib/api/platform.functions";
import { PUBLIC_BRAND_NAME } from "@/lib/brand";
import { accessRequestSchema, type AccessRequestInput } from "@/lib/platform/schemas";

export const Route = createFileRoute("/demande-acces")({
  head: () => ({ meta: [{ title: `Demander un accès — ${PUBLIC_BRAND_NAME}` }] }),
  component: AccessRequestPage,
});

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function AccessRequestPage() {
  const navigate = useNavigate();
  const form = useForm<AccessRequestInput>({
    resolver: zodResolver(accessRequestSchema),
    defaultValues: {
      companyName: "",
      managerFirstName: "",
      managerLastName: "",
      professionalEmail: "",
      phone: "",
      technicianCount: 0,
      cityOrRegion: "",
      message: "",
      termsAccepted: undefined,
      website: "",
    },
  });

  async function onSubmit(values: AccessRequestInput) {
    try {
      await submitAccessRequest({ data: values });
      navigate({ to: "/demande-en-attente", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "La demande n’a pas pu être envoyée.");
    }
  }

  const submitting = form.formState.isSubmitting;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-primary text-primary-foreground">
        <div className="mx-auto flex min-h-[72px] max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="inline-flex items-center gap-3 font-black tracking-[0.16em]">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/10">
              <Bug className="h-5 w-5" />
            </span>
            {PUBLIC_BRAND_NAME}
          </Link>
          <Link
            to="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm text-white/75 hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[0.75fr_1.25fr] lg:py-20">
        <aside className="lg:sticky lg:top-10 lg:self-start">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-accent">
            Accès professionnel
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            Présentez-nous votre entreprise.
          </h1>
          <p className="mt-4 leading-7 text-muted-foreground">
            Chaque demande est vérifiée avant la création d’un compte. Vous ne choisissez ni rôle ni
            entreprise depuis ce formulaire.
          </p>
          <ul className="mt-8 space-y-4">
            {[
              "Aucun accès automatique après l’envoi",
              "Un seul système d’authentification sécurisé",
              "Invitation de l’équipe après validation",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                  <Check className="h-3.5 w-3.5" />
                </span>
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-8 rounded-2xl bg-primary p-5 text-primary-foreground">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
              <p className="text-sm leading-6 text-white/70">
                Les informations servent uniquement à étudier votre demande et à sécuriser
                l’ouverture de l’espace.
              </p>
            </div>
          </div>
        </aside>

        <section className="rounded-[28px] border bg-card p-5 shadow-soft sm:p-8">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
            <div>
              <h2 className="text-xl font-bold">Informations de l’entreprise</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Les champs marqués d’un astérisque sont obligatoires.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                id="companyName"
                label="Nom de l’entreprise *"
                error={form.formState.errors.companyName?.message}
              >
                <Input
                  id="companyName"
                  className="h-11"
                  autoComplete="organization"
                  aria-invalid={Boolean(form.formState.errors.companyName)}
                  aria-describedby={
                    form.formState.errors.companyName ? "companyName-error" : undefined
                  }
                  {...form.register("companyName")}
                />
              </Field>
              <Field
                id="cityOrRegion"
                label="Ville ou région *"
                error={form.formState.errors.cityOrRegion?.message}
              >
                <Input
                  id="cityOrRegion"
                  className="h-11"
                  autoComplete="address-level2"
                  aria-invalid={Boolean(form.formState.errors.cityOrRegion)}
                  aria-describedby={
                    form.formState.errors.cityOrRegion ? "cityOrRegion-error" : undefined
                  }
                  {...form.register("cityOrRegion")}
                />
              </Field>
              <Field
                id="managerFirstName"
                label="Prénom du responsable *"
                error={form.formState.errors.managerFirstName?.message}
              >
                <Input
                  id="managerFirstName"
                  className="h-11"
                  autoComplete="given-name"
                  aria-invalid={Boolean(form.formState.errors.managerFirstName)}
                  aria-describedby={
                    form.formState.errors.managerFirstName ? "managerFirstName-error" : undefined
                  }
                  {...form.register("managerFirstName")}
                />
              </Field>
              <Field
                id="managerLastName"
                label="Nom du responsable *"
                error={form.formState.errors.managerLastName?.message}
              >
                <Input
                  id="managerLastName"
                  className="h-11"
                  autoComplete="family-name"
                  aria-invalid={Boolean(form.formState.errors.managerLastName)}
                  aria-describedby={
                    form.formState.errors.managerLastName ? "managerLastName-error" : undefined
                  }
                  {...form.register("managerLastName")}
                />
              </Field>
              <Field
                id="professionalEmail"
                label="Email professionnel *"
                error={form.formState.errors.professionalEmail?.message}
              >
                <Input
                  id="professionalEmail"
                  type="email"
                  className="h-11"
                  autoComplete="email"
                  aria-invalid={Boolean(form.formState.errors.professionalEmail)}
                  aria-describedby={
                    form.formState.errors.professionalEmail ? "professionalEmail-error" : undefined
                  }
                  {...form.register("professionalEmail")}
                />
              </Field>
              <Field id="phone" label="Téléphone *" error={form.formState.errors.phone?.message}>
                <Input
                  id="phone"
                  type="tel"
                  className="h-11"
                  autoComplete="tel"
                  aria-invalid={Boolean(form.formState.errors.phone)}
                  aria-describedby={form.formState.errors.phone ? "phone-error" : undefined}
                  {...form.register("phone")}
                />
              </Field>
              <Field
                id="technicianCount"
                label="Nombre de techniciens *"
                error={form.formState.errors.technicianCount?.message}
              >
                <Input
                  id="technicianCount"
                  type="number"
                  min={0}
                  max={10000}
                  step={1}
                  inputMode="numeric"
                  className="h-11"
                  aria-invalid={Boolean(form.formState.errors.technicianCount)}
                  aria-describedby={
                    form.formState.errors.technicianCount ? "technicianCount-error" : undefined
                  }
                  {...form.register("technicianCount", { valueAsNumber: true })}
                />
              </Field>
            </div>

            <Field
              id="message"
              label="Message facultatif"
              error={form.formState.errors.message?.message}
            >
              <Textarea
                id="message"
                rows={5}
                maxLength={2000}
                placeholder="Précisez votre organisation ou vos besoins si nécessaire."
                aria-invalid={Boolean(form.formState.errors.message)}
                aria-describedby={form.formState.errors.message ? "message-error" : undefined}
                {...form.register("message")}
              />
            </Field>

            <div
              className={`rounded-2xl border p-4 ${
                form.formState.errors.termsAccepted
                  ? "border-destructive/50 bg-destructive/5"
                  : "bg-muted/50"
              }`}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  id="termsAccepted"
                  className="mt-0.5 h-5 w-5"
                  checked={form.watch("termsAccepted") === true}
                  onCheckedChange={(checked) =>
                    form.setValue("termsAccepted", checked === true, {
                      shouldValidate: true,
                    })
                  }
                  aria-invalid={Boolean(form.formState.errors.termsAccepted)}
                  aria-describedby={
                    form.formState.errors.termsAccepted ? "termsAccepted-error" : undefined
                  }
                />
                <Label htmlFor="termsAccepted" className="text-sm font-normal leading-6">
                  J’accepte que ces informations soient utilisées pour étudier la demande et je
                  reconnais avoir consulté les{" "}
                  <Link to="/conditions" className="font-medium text-primary underline">
                    conditions
                  </Link>{" "}
                  et la{" "}
                  <Link to="/confidentialite" className="font-medium text-primary underline">
                    politique de confidentialité
                  </Link>
                  .
                </Label>
              </div>
              {form.formState.errors.termsAccepted && (
                <p
                  id="termsAccepted-error"
                  role="alert"
                  className="mt-2 text-xs font-medium text-destructive"
                >
                  {form.formState.errors.termsAccepted.message}
                </p>
              )}
            </div>

            <div className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
              <Label htmlFor="website">Site internet</Label>
              <Input id="website" tabIndex={-1} autoComplete="off" {...form.register("website")} />
            </div>

            <Button type="submit" size="lg" className="min-h-12 w-full" disabled={submitting}>
              {submitting ? "Envoi sécurisé…" : "Envoyer ma demande"}
              {!submitting && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </form>
        </section>
      </main>
    </div>
  );
}
