import { createFileRoute } from "@tanstack/react-router";

import { PublicLegalPage } from "@/components/public-legal-page";
import { PUBLIC_BRAND_NAME } from "@/lib/brand";

export const Route = createFileRoute("/conditions")({
  head: () => ({ meta: [{ title: `Conditions — ${PUBLIC_BRAND_NAME}` }] }),
  component: ConditionsPage,
});

function ConditionsPage() {
  return (
    <PublicLegalPage title="Conditions d’utilisation">
      <p>
        L’accès à la plateforme est réservé aux entreprises validées et aux membres qu’elles
        autorisent. Les identifiants sont personnels et les droits dépendent du rôle attribué dans
        l’entreprise.
      </p>
      <p>
        Les conditions commerciales et contractuelles complètes devront être validées avant toute
        ouverture publique du service.
      </p>
    </PublicLegalPage>
  );
}
