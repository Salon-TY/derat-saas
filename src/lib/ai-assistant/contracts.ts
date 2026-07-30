import { z } from "zod";

export const AI_MAX_MESSAGE_LENGTH = 1_000;
export const AI_MAX_HISTORY_MESSAGES = 8;
export const AI_MAX_HISTORY_MESSAGE_LENGTH = 1_000;
export const AI_MAX_TOOL_CALLS = 5;
export const AI_REQUEST_TIMEOUT_MS = 20_000;

export const assistantHistoryMessageSchema = z
  .object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(AI_MAX_HISTORY_MESSAGE_LENGTH),
  })
  .strict();

export const assistantRequestSchema = z
  .object({
    message: z.string().trim().min(1).max(AI_MAX_MESSAGE_LENGTH),
    history: z.array(assistantHistoryMessageSchema).max(AI_MAX_HISTORY_MESSAGES),
  })
  .strict();

export type AssistantHistoryMessage = z.infer<typeof assistantHistoryMessageSchema>;
export type AssistantRequest = z.infer<typeof assistantRequestSchema>;

export type AssistantLink = {
  label: string;
  href: string;
};

export type AssistantReply = {
  answer: string;
  links: AssistantLink[];
  refused?: boolean;
  unavailable?: boolean;
};

export type JsonSchema = {
  type: "object";
  properties: Record<string, unknown>;
  required: string[];
  additionalProperties: false;
};

export type AssistantToolDefinition = {
  type: "function";
  name: string;
  description: string;
  strict: true;
  parameters: JsonSchema;
};

const nullableText = (description: string, maxLength = 200) => ({
  type: ["string", "null"],
  description,
  maxLength,
});

const limitProperty = {
  type: "integer",
  description: "Nombre maximal de résultats à retourner.",
  minimum: 1,
  maximum: 20,
};

export const ASSISTANT_TOOL_DEFINITIONS = [
  {
    type: "function",
    name: "get_revenue_overview",
    description:
      "Retourne les agrégats financiers fiables existants : CA du mois, mois précédent et impayés.",
    strict: true,
    parameters: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "list_interventions",
    description:
      "Recherche les interventions par période, statut et texte (adresse, nuisible, produit ou client).",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        date_from: nullableText("Date de début incluse au format YYYY-MM-DD.", 10),
        date_to: nullableText("Date de fin incluse au format YYYY-MM-DD.", 10),
        status: nullableText("Statut exact de l'intervention.", 40),
        query: nullableText("Terme de recherche.", 120),
        limit: limitProperty,
      },
      required: ["date_from", "date_to", "status", "query", "limit"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "search_clients",
    description: "Recherche des clients par nom, adresse, téléphone ou email.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Terme de recherche client.",
          minLength: 1,
          maxLength: 120,
        },
        limit: limitProperty,
      },
      required: ["query", "limit"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "get_client_history",
    description:
      "Retourne la fiche synthétique d'un client et ses interventions récentes. Utiliser un identifiant obtenu par search_clients.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        client_id: {
          type: "string",
          description: "Identifiant UUID du client.",
        },
        limit: limitProperty,
      },
      required: ["client_id", "limit"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "list_reports_to_review",
    description: "Liste les interventions terminées dont le rapport doit être vérifié.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        limit: limitProperty,
      },
      required: ["limit"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "search_invoices",
    description:
      "Recherche les factures par numéro, client, période ou statut, notamment les impayées et en retard.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        query: nullableText("Numéro ou nom du client.", 120),
        date_from: nullableText("Date de début incluse au format YYYY-MM-DD.", 10),
        date_to: nullableText("Date de fin incluse au format YYYY-MM-DD.", 10),
        status: nullableText("Statut exact de la facture.", 40),
        unpaid_only: {
          type: "boolean",
          description: "Limiter aux statuts envoyee et retard.",
        },
        min_total_ttc: {
          type: ["number", "null"],
          description: "Montant TTC minimal stocké sur la facture.",
          minimum: 0,
        },
        limit: limitProperty,
      },
      required: [
        "query",
        "date_from",
        "date_to",
        "status",
        "unpaid_only",
        "min_total_ttc",
        "limit",
      ],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "search_quotes",
    description: "Recherche les devis par numéro, client, période ou statut.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        query: nullableText("Numéro ou nom du client.", 120),
        status: nullableText("Statut exact du devis.", 40),
        pending_only: {
          type: "boolean",
          description: "Limiter aux devis brouillon ou envoyés.",
        },
        limit: limitProperty,
      },
      required: ["query", "status", "pending_only", "limit"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "search_contracts",
    description: "Recherche les contrats par numéro, client, statut ou échéance prochaine.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        query: nullableText("Numéro, établissement ou nom du client.", 120),
        status: nullableText("Statut exact du contrat.", 40),
        expires_before: nullableText("Date d'échéance maximale au format YYYY-MM-DD.", 10),
        limit: limitProperty,
      },
      required: ["query", "status", "expires_before", "limit"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "search_stock",
    description:
      "Recherche les produits et leurs niveaux par emplacement, avec option stock sous le seuil.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        query: nullableText("Nom du produit.", 120),
        low_only: {
          type: "boolean",
          description: "Limiter aux niveaux inférieurs ou égaux au seuil d'alerte.",
        },
        limit: limitProperty,
      },
      required: ["query", "low_only", "limit"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "list_technician_interventions",
    description: "Liste les interventions d'un technicien recherché par son nom sur une période.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        technician_query: {
          type: "string",
          description: "Nom ou identifiant du technicien.",
          minLength: 1,
          maxLength: 120,
        },
        date_from: nullableText("Date de début incluse au format YYYY-MM-DD.", 10),
        date_to: nullableText("Date de fin incluse au format YYYY-MM-DD.", 10),
        limit: limitProperty,
      },
      required: ["technician_query", "date_from", "date_to", "limit"],
      additionalProperties: false,
    },
  },
] satisfies AssistantToolDefinition[];

export const assistantToolNames = ASSISTANT_TOOL_DEFINITIONS.map((tool) => tool.name);
