import { createFileRoute } from "@tanstack/react-router";

import { PublicSite } from "@/components/public-site";
import { PUBLIC_BRAND_NAME } from "@/lib/brand";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: `${PUBLIC_BRAND_NAME} — Gestion pour professionnels de la dératisation`,
      },
      {
        name: "description",
        content:
          "Gérez clients, interventions, techniciens, rapports et facturation depuis une plateforme dédiée aux professionnels de la lutte antiparasitaire.",
      },
    ],
  }),
  component: PublicSite,
});
