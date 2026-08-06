import { createFileRoute } from "@tanstack/react-router";

import { PublicLegalPage } from "@/components/public-legal-page";
import { PUBLIC_BRAND_NAME } from "@/lib/brand";

export const Route = createFileRoute("/mentions-legales")({
  head: () => ({ meta: [{ title: `Mentions légales — ${PUBLIC_BRAND_NAME}` }] }),
  component: MentionsLegalesPage,
});

function MentionsLegalesPage() {
  return (
    <PublicLegalPage title="Mentions légales">
      <p>
        Les informations relatives à l’éditeur, au responsable de publication et à l’hébergeur
        seront complétées et validées avant la mise en ligne publique du service.
      </p>
      <p>Cette page locale ne constitue pas encore la version légale destinée à la production.</p>
    </PublicLegalPage>
  );
}
