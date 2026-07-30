import { afterEach, describe, expect, test } from "bun:test";

import {
  AI_MAX_HISTORY_MESSAGES,
  AI_MAX_MESSAGE_LENGTH,
  ASSISTANT_TOOL_DEFINITIONS,
  assistantRequestSchema,
} from "./contracts";
import { runAiAssistant } from "./assistant.server";
import { isForbiddenMutationRequest, sanitizeAssistantLinks, sanitizeSearchTerm } from "./security";
import {
  getAvailableToolDefinitions,
  loadAssistantAccess,
  parseToolArguments,
} from "./tools.server";

const originalApiKey = process.env.OPENAI_API_KEY;
const originalModel = process.env.OPENAI_MODEL;

afterEach(() => {
  if (originalApiKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalApiKey;
  if (originalModel === undefined) delete process.env.OPENAI_MODEL;
  else process.env.OPENAI_MODEL = originalModel;
});

describe("contrats d’outils stricts", () => {
  test("tous les schémas sont stricts et n’acceptent aucun tenant", () => {
    for (const tool of ASSISTANT_TOOL_DEFINITIONS) {
      expect(tool.type).toBe("function");
      expect(tool.strict).toBe(true);
      expect(tool.parameters.additionalProperties).toBe(false);
      expect(new Set(tool.parameters.required)).toEqual(
        new Set(Object.keys(tool.parameters.properties)),
      );
      for (const forbidden of ["tenant_id", "owner_id", "user_id", "account_id", "token"]) {
        expect(tool.parameters.properties).not.toHaveProperty(forbidden);
      }
    }
  });

  test("aucun outil d’écriture n’est déclaré", () => {
    const forbiddenPrefixes = /^(create|update|delete|send|pay|assign|schedule|validate|set)_/;
    for (const tool of ASSISTANT_TOOL_DEFINITIONS) {
      expect(tool.name).not.toMatch(forbiddenPrefixes);
    }
  });

  test("les arguments inconnus et les tentatives de tenant sont refusés", () => {
    expect(() =>
      parseToolArguments(
        "search_clients",
        JSON.stringify({ query: "Dupont", limit: 5, tenant_id: "autre-compte" }),
      ),
    ).toThrow("Arguments d’outil invalides.");
    expect(() => parseToolArguments("delete_client", "{}")).toThrow("Outil non autorisé.");
    expect(() =>
      parseToolArguments(
        "list_interventions",
        JSON.stringify({
          date_from: "30/07/2026",
          date_to: null,
          status: null,
          query: null,
          limit: 5,
        }),
      ),
    ).toThrow("Arguments d’outil invalides.");
    expect(() =>
      parseToolArguments("search_clients", JSON.stringify({ query: "Dupont", limit: 21 })),
    ).toThrow("Arguments d’outil invalides.");
  });
});

describe("garde-fous des requêtes", () => {
  test("les demandes d’écriture sont refusées", () => {
    expect(isForbiddenMutationRequest("Supprime le client Dupont")).toBe(true);
    expect(isForbiddenMutationRequest("Crée une nouvelle intervention")).toBe(true);
    expect(isForbiddenMutationRequest("Peux-tu modifier la facture 42 ?")).toBe(true);
    expect(isForbiddenMutationRequest("Je veux que tu assignes un technicien")).toBe(true);
    expect(isForbiddenMutationRequest("Valide et envoie le rapport")).toBe(true);
    expect(isForbiddenMutationRequest("Paye la facture 12")).toBe(true);
  });

  test("les consultations de statuts ne sont pas prises pour des mutations", () => {
    expect(isForbiddenMutationRequest("Quelles interventions sont annulées ?")).toBe(false);
    expect(isForbiddenMutationRequest("Recherche les factures payées")).toBe(false);
    expect(isForbiddenMutationRequest("Combien de devis ont été envoyés ?")).toBe(false);
  });

  test("l’entrée publique est bornée et strictement validée", () => {
    expect(
      assistantRequestSchema.safeParse({
        message: "a".repeat(AI_MAX_MESSAGE_LENGTH + 1),
        history: [],
      }).success,
    ).toBe(false);
    expect(
      assistantRequestSchema.safeParse({
        message: "Question",
        history: Array.from({ length: AI_MAX_HISTORY_MESSAGES + 1 }, () => ({
          role: "user",
          content: "Suite",
        })),
      }).success,
    ).toBe(false);
    expect(
      assistantRequestSchema.safeParse({
        message: "Question",
        history: [],
        tenant_id: "autre-compte",
      }).success,
    ).toBe(false);
  });

  test("les termes PostgREST et les liens sont nettoyés", () => {
    expect(sanitizeSearchTerm("  Dupont,(test)%  ")).toBe("Dupont test");
    expect(
      sanitizeAssistantLinks([
        { label: "Client", href: "/clients/01234567-89ab-cdef-0123-456789abcdef" },
        { label: "Externe", href: "https://example.com" },
        { label: "Protocole", href: "//example.com" },
        { label: "Doublon", href: "/clients/01234567-89ab-cdef-0123-456789abcdef" },
      ]),
    ).toEqual([{ label: "Client", href: "/clients/01234567-89ab-cdef-0123-456789abcdef" }]);
  });
});

describe("contrôle d’accès serveur", () => {
  test("l’owner est autorisé sans paramètre de tenant", async () => {
    const access = await loadAssistantAccess({
      userId: "user-owner",
      supabase: {
        rpc: async () => ({ data: "owner", error: null }),
      },
    });
    expect(access).toEqual({ role: "owner", permissions: {} });
  });

  test("un bureau sans permission assistant est refusé", async () => {
    const supabase = {
      rpc: async () => ({ data: "employe", error: null }),
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: { active: true, poste: "bureau", permissions: { clients: true } },
              error: null,
            }),
          }),
        }),
      }),
    };
    await expect(loadAssistantAccess({ userId: "bureau", supabase })).rejects.toThrow(
      "Accès à l’assistant non autorisé.",
    );
  });

  test("un technicien est refusé même avec la permission", async () => {
    const supabase = {
      rpc: async () => ({ data: "employe", error: null }),
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                active: true,
                poste: "technicien",
                permissions: { assistant_ia: true },
              },
              error: null,
            }),
          }),
        }),
      }),
    };
    await expect(loadAssistantAccess({ userId: "tech", supabase })).rejects.toThrow(
      "Accès à l’assistant non autorisé.",
    );
  });

  test("un bureau ne reçoit que les outils de ses domaines autorisés", () => {
    const names = getAvailableToolDefinitions({
      role: "employe",
      permissions: { assistant_ia: true, clients: true },
    }).map((tool) => tool.name);
    expect(names).toContain("search_clients");
    expect(names).toContain("list_interventions");
    expect(names).not.toContain("search_invoices");
    expect(names).not.toContain("get_revenue_overview");
  });
});

describe("indisponibilité OpenAI", () => {
  const ownerContext = {
    userId: "owner",
    supabase: {
      rpc: async () => ({ data: "owner", error: null }),
    },
  };

  test("une demande d’écriture est refusée sans appeler OpenAI", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    let called = false;
    const reply = await runAiAssistant({
      request: { message: "Supprime cette facture", history: [] },
      context: ownerContext,
      fetchImpl: (async () => {
        called = true;
        throw new Error("ne doit pas être appelé");
      }) as typeof fetch,
    });
    expect(reply.refused).toBe(true);
    expect(called).toBe(false);
  });

  test("l’absence de clé retourne un état non bloquant", async () => {
    delete process.env.OPENAI_API_KEY;
    const reply = await runAiAssistant({
      request: { message: "Quels rapports sont à vérifier ?", history: [] },
      context: ownerContext,
    });
    expect(reply.unavailable).toBe(true);
    expect(reply.answer).toContain("OPENAI_API_KEY");
  });

  test("une panne OpenAI ne bloque pas l’application", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const reply = await runAiAssistant({
      request: { message: "Quels rapports sont à vérifier ?", history: [] },
      context: ownerContext,
      fetchImpl: (async () => new Response("indisponible", { status: 503 })) as typeof fetch,
    });
    expect(reply.unavailable).toBe(true);
    expect(reply.answer).toContain("momentanément indisponible");
  });

  test("une réponse textuelle sans outil est acceptée", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const reply = await runAiAssistant({
      request: { message: "Bonjour", history: [] },
      context: ownerContext,
      fetchImpl: (async () =>
        new Response(
          JSON.stringify({
            id: "resp_test",
            output: [
              {
                type: "message",
                content: [{ type: "output_text", text: "Bonjour, que souhaitez-vous consulter ?" }],
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        )) as typeof fetch,
    });
    expect(reply.answer).toBe("Bonjour, que souhaitez-vous consulter ?");
    expect(reply.links).toEqual([]);
  });

  test("un court historique permet une question de suivi", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    let requestBody: Record<string, unknown> | null = null;
    const reply = await runAiAssistant({
      request: {
        message: "Et le mois précédent ?",
        history: [
          { role: "user", content: "Quel est le CA de ce mois ?" },
          { role: "assistant", content: "Le CA du mois est disponible." },
        ],
      },
      context: ownerContext,
      fetchImpl: (async (_input, init) => {
        requestBody = JSON.parse(String(init?.body));
        return new Response(
          JSON.stringify({
            id: "resp_follow_up",
            output: [
              {
                type: "message",
                content: [{ type: "output_text", text: "Je consulte la comparaison demandée." }],
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }) as typeof fetch,
    });
    expect(reply.answer).toBe("Je consulte la comparaison demandée.");
    expect(requestBody?.input).toEqual([
      { role: "user", content: "Quel est le CA de ce mois ?" },
      { role: "assistant", content: "Le CA du mois est disponible." },
      { role: "user", content: "Et le mois précédent ?" },
    ]);
    expect(requestBody?.store).toBe(false);
  });

  test("une recherche sans résultat est transmise proprement au modèle", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    let openAiCall = 0;
    const emptyQuery = {
      select() {
        return this;
      },
      or() {
        return this;
      },
      order() {
        return this;
      },
      async limit() {
        return { data: [], error: null };
      },
    };
    const context = {
      userId: "owner",
      supabase: {
        rpc: async () => ({ data: "owner", error: null }),
        from: () => emptyQuery,
      },
    };
    const reply = await runAiAssistant({
      request: { message: "Retrouve le client Introuvable", history: [] },
      context,
      fetchImpl: (async () => {
        openAiCall += 1;
        if (openAiCall === 1) {
          return new Response(
            JSON.stringify({
              id: "resp_tool",
              output: [
                {
                  type: "function_call",
                  name: "search_clients",
                  arguments: JSON.stringify({ query: "Introuvable", limit: 5 }),
                  call_id: "call_search",
                },
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response(
          JSON.stringify({
            id: "resp_answer",
            output: [
              {
                type: "message",
                content: [
                  { type: "output_text", text: "Aucun client correspondant n’a été trouvé." },
                ],
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }) as typeof fetch,
    });
    expect(openAiCall).toBe(2);
    expect(reply.answer).toBe("Aucun client correspondant n’a été trouvé.");
    expect(reply.links).toEqual([]);
  });
});
