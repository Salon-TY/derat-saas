// Réexport centralisé des types utilisés par les composants du Copilote —
// point d'entrée unique pour éviter que chaque composant re-déclare ses
// propres alias vers contracts.ts.
export type {
  AssistantLink,
  AssistantReply,
  AssistantSources,
  CopiloteClassementItem,
  CopiloteCorps,
  CopiloteEcart,
  CopiloteListeItem,
  CopiloteProjection,
  CopiloteValeur,
} from "@/lib/ai-assistant/contracts";
export type { CopiloteSuite } from "./copilote-suites";
