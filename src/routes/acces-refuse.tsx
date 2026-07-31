import { createFileRoute } from "@tanstack/react-router";

import { AccessStatusPage } from "@/components/access-status-page";
import { PUBLIC_BRAND_NAME } from "@/lib/brand";

export const Route = createFileRoute("/acces-refuse")({
  head: () => ({ meta: [{ title: `Accès refusé — ${PUBLIC_BRAND_NAME}` }] }),
  component: () => (
    <AccessStatusPage
      tone="rejected"
      title="L’accès n’est pas disponible"
      description="La demande associée à ce compte a été refusée ou annulée."
      details="Aucune donnée métier n’est accessible avec ce compte. Utilisez le canal de contact du site si vous pensez qu’une nouvelle vérification est nécessaire."
    />
  ),
});
