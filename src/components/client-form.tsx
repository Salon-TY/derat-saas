import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { clientSchema, type ClientForm as ClientFormType, TYPES_NUISIBLES } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ClientForm({
  defaultValues,
  onSubmit,
  submitLabel = "Créer le client",
}: {
  defaultValues?: Partial<ClientFormType>;
  onSubmit: (v: ClientFormType) => Promise<void> | void;
  submitLabel?: string;
}) {
  const form = useForm<ClientFormType>({
    resolver: zodResolver(clientSchema) as Resolver<ClientFormType>,
    defaultValues: {
      raison_sociale: defaultValues?.raison_sociale ?? "",
      adresse_site: defaultValues?.adresse_site ?? "",
      telephone: defaultValues?.telephone ?? "",
      email: defaultValues?.email ?? "",
      siret: defaultValues?.siret ?? "",
      siren: defaultValues?.siren ?? "",
      rcs: defaultValues?.rcs ?? "",
      forme_juridique: defaultValues?.forme_juridique ?? "",
      type_nuisible: defaultValues?.type_nuisible ?? "",
      notes: defaultValues?.notes ?? "",
    },
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <FormSection title="Informations principales">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field
              label="Raison sociale / Nom *"
              error={form.formState.errors.raison_sociale?.message}
            >
              <Input {...form.register("raison_sociale")} autoComplete="organization" />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Adresse du site">
              <Textarea rows={3} {...form.register("adresse_site")} autoComplete="street-address" />
            </Field>
          </div>
          <Field label="Téléphone">
            <Input type="tel" {...form.register("telephone")} autoComplete="tel" />
          </Field>
          <Field
            label="Email (requis pour les rapports)"
            error={form.formState.errors.email?.message}
          >
            <Input
              type="email"
              {...form.register("email")}
              placeholder="contact@client.fr"
              autoComplete="email"
            />
          </Field>
          <Field label="Type de nuisible">
            <Select
              value={form.watch("type_nuisible") ?? ""}
              onValueChange={(value) => form.setValue("type_nuisible", value)}
            >
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
          </Field>
        </div>
      </FormSection>

      <FormSection title="Informations légales">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="SIRET">
            <Input {...form.register("siret")} />
          </Field>
          <Field label="SIREN">
            <Input {...form.register("siren")} />
          </Field>
          <Field label="RCS">
            <Input {...form.register("rcs")} placeholder="Paris B 123 456 789" />
          </Field>
          <Field label="Forme juridique">
            <Input
              {...form.register("forme_juridique")}
              placeholder="Société par actions simplifiée"
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Notes">
        <Field label="Informations complémentaires">
          <Textarea rows={4} {...form.register("notes")} />
        </Field>
      </FormSection>

      <div className="flex justify-end border-t border-border/50 pt-6">
        <Button
          type="submit"
          className="w-full sm:w-auto sm:min-w-48"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? "Enregistrement…" : submitLabel}
        </Button>
      </div>
    </form>
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
    <div className="space-y-2">
      <Label className="text-xs font-semibold text-foreground">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      {children}
    </section>
  );
}
