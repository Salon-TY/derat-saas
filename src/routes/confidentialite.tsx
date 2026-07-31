import { createFileRoute } from "@tanstack/react-router";

import { PublicLegalPage } from "@/components/public-legal-page";
import { PUBLIC_BRAND_NAME } from "@/lib/brand";

export const Route = createFileRoute("/confidentialite")({
  head: () => ({ meta: [{ title: `Confidentialité — ${PUBLIC_BRAND_NAME}` }] }),
  component: ConfidentialitePage,
});

function ConfidentialitePage() {
  return (
    <PublicLegalPage title="Confidentialité">
      <p>
        Les informations envoyées dans une demande d’accès servent uniquement à étudier la demande,
        contacter le responsable et sécuriser l’ouverture de son espace.
      </p>
      <p>
        La durée de conservation, les coordonnées du responsable de traitement et les modalités
        d’exercice des droits devront être validées avant la mise en production.
      </p>
    </PublicLegalPage>
  );
}
