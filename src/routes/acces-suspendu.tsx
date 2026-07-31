import { createFileRoute } from "@tanstack/react-router";

import { AccessStatusPage } from "@/components/access-status-page";
import { PUBLIC_BRAND_NAME } from "@/lib/brand";

export const Route = createFileRoute("/acces-suspendu")({
  head: () => ({ meta: [{ title: `Accès suspendu — ${PUBLIC_BRAND_NAME}` }] }),
  component: () => (
    <AccessStatusPage
      tone="suspended"
      title="L’accès de l’entreprise est suspendu"
      description="Les données sont conservées, mais le responsable et son équipe ne peuvent plus utiliser l’application."
      details="La réactivation doit être effectuée par l’administration de la plateforme. Contactez le support depuis le site public pour obtenir des précisions."
    />
  ),
});
