import { createFileRoute } from "@tanstack/react-router";

import { AccessStatusPage } from "@/components/access-status-page";
import { PUBLIC_BRAND_NAME } from "@/lib/brand";

export const Route = createFileRoute("/demande-en-attente")({
  head: () => ({ meta: [{ title: `Demande reçue — ${PUBLIC_BRAND_NAME}` }] }),
  component: () => (
    <AccessStatusPage
      tone="pending"
      title="Votre demande est en attente"
      description="Elle a bien été reçue et sera vérifiée manuellement avant toute ouverture d’accès."
      details="Vous recevrez les prochaines instructions à l’adresse professionnelle indiquée. Une nouvelle demande avec le même email n’accélère pas son traitement."
    />
  ),
});
