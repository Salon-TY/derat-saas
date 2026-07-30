/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from "zod";

import type { PermissionKey } from "@/lib/permissions";
import {
  ASSISTANT_TOOL_DEFINITIONS,
  type AssistantLink,
  type AssistantToolDefinition,
} from "./contracts";
import { sanitizeSearchTerm } from "./security";

type AssistantContext = {
  userId: string;
  supabase: any;
};

export type AssistantAccess = {
  role: "owner" | "employe";
  permissions: Record<string, boolean>;
};

export type ToolExecutionResult = {
  summary: string;
  items: unknown[];
  links: AssistantLink[];
};

const nullableDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable();
const nullableTextSchema = z.string().trim().max(120).nullable();
const resultLimitSchema = z.number().int().min(1).max(20);

const toolArgumentSchemas = {
  get_revenue_overview: z.object({}).strict(),
  list_interventions: z
    .object({
      date_from: nullableDateSchema,
      date_to: nullableDateSchema,
      status: z.string().trim().max(40).nullable(),
      query: nullableTextSchema,
      limit: resultLimitSchema,
    })
    .strict(),
  search_clients: z
    .object({
      query: z.string().trim().min(1).max(120),
      limit: resultLimitSchema,
    })
    .strict(),
  get_client_history: z
    .object({
      client_id: z.string().uuid(),
      limit: resultLimitSchema,
    })
    .strict(),
  list_reports_to_review: z.object({ limit: resultLimitSchema }).strict(),
  search_invoices: z
    .object({
      query: nullableTextSchema,
      date_from: nullableDateSchema,
      date_to: nullableDateSchema,
      status: z.string().trim().max(40).nullable(),
      unpaid_only: z.boolean(),
      min_total_ttc: z.number().min(0).nullable(),
      limit: resultLimitSchema,
    })
    .strict(),
  search_quotes: z
    .object({
      query: nullableTextSchema,
      status: z.string().trim().max(40).nullable(),
      pending_only: z.boolean(),
      limit: resultLimitSchema,
    })
    .strict(),
  search_contracts: z
    .object({
      query: nullableTextSchema,
      status: z.string().trim().max(40).nullable(),
      expires_before: nullableDateSchema,
      limit: resultLimitSchema,
    })
    .strict(),
  search_stock: z
    .object({
      query: nullableTextSchema,
      low_only: z.boolean(),
      limit: resultLimitSchema,
    })
    .strict(),
  list_technician_interventions: z
    .object({
      technician_query: z.string().trim().min(1).max(120),
      date_from: nullableDateSchema,
      date_to: nullableDateSchema,
      limit: resultLimitSchema,
    })
    .strict(),
} satisfies Record<string, z.ZodTypeAny>;

type ToolName = keyof typeof toolArgumentSchemas;

const permissionByTool: Record<ToolName, PermissionKey | "terrain" | "financial"> = {
  get_revenue_overview: "financial",
  list_interventions: "terrain",
  search_clients: "clients",
  get_client_history: "clients",
  list_reports_to_review: "terrain",
  search_invoices: "factures",
  search_quotes: "devis",
  search_contracts: "contrats",
  search_stock: "stock",
  list_technician_interventions: "terrain",
};

function canUse(access: AssistantAccess, permission: PermissionKey | "terrain" | "financial") {
  if (access.role === "owner" || permission === "terrain") return true;
  if (permission === "financial") {
    return access.permissions.tresorerie === true || access.permissions.stats === true;
  }
  return access.permissions[permission] === true;
}

export async function loadAssistantAccess(context: AssistantContext): Promise<AssistantAccess> {
  const { data: role, error: roleError } = await context.supabase.rpc("current_user_role");
  if (roleError || role === "disabled") {
    throw new Error("Accès refusé.");
  }
  if (role === "owner") {
    return { role: "owner", permissions: {} };
  }
  if (role !== "employe") {
    throw new Error("Accès refusé.");
  }

  const { data: member, error: memberError } = await context.supabase
    .from("team_members")
    .select("active, poste, permissions")
    .eq("user_id", context.userId)
    .maybeSingle();

  const permissions = (member?.permissions as Record<string, boolean> | null) ?? {};
  if (
    memberError ||
    !member ||
    member.active !== true ||
    member.poste !== "bureau" ||
    permissions.assistant_ia !== true
  ) {
    throw new Error("Accès à l’assistant non autorisé.");
  }

  return { role: "employe", permissions };
}

export function getAvailableToolDefinitions(access: AssistantAccess): AssistantToolDefinition[] {
  return ASSISTANT_TOOL_DEFINITIONS.filter((tool) => {
    const permission = permissionByTool[tool.name as ToolName];
    return permission ? canUse(access, permission) : false;
  });
}

export function parseToolArguments(name: string, rawArguments: string): unknown {
  const schema = toolArgumentSchemas[name as ToolName];
  if (!schema) throw new Error("Outil non autorisé.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawArguments);
  } catch {
    throw new Error("Arguments d’outil invalides.");
  }

  const result = schema.safeParse(parsed);
  if (!result.success) throw new Error("Arguments d’outil invalides.");
  return result.data;
}

function throwOnError(error: unknown) {
  if (error) throw new Error("La consultation des données a échoué.");
}

function relationName(value: unknown): string | null {
  if (!value) return null;
  if (Array.isArray(value)) return relationName(value[0]);
  if (typeof value === "object" && "raison_sociale" in value) {
    const name = (value as { raison_sociale?: unknown }).raison_sociale;
    return typeof name === "string" ? name : null;
  }
  return null;
}

function parisDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function previousMonthBounds(today: string) {
  const [year, month] = today.split("-").map(Number);
  const previousStart = new Date(Date.UTC(year, month - 2, 1)).toISOString().slice(0, 10);
  const previousEnd = new Date(Date.UTC(year, month - 1, 0)).toISOString().slice(0, 10);
  return { previousStart, previousEnd };
}

async function findClientIds(supabase: any, query: string, limit = 20): Promise<string[]> {
  const term = sanitizeSearchTerm(query);
  if (!term) return [];
  const { data, error } = await supabase
    .from("clients")
    .select("id")
    .or(
      `raison_sociale.ilike.%${term}%,adresse_site.ilike.%${term}%,telephone.ilike.%${term}%,email.ilike.%${term}%`,
    )
    .limit(limit);
  throwOnError(error);
  return (data ?? []).map((client: any) => client.id);
}

async function teamNameMap(supabase: any): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from("team_members")
    .select("user_id, display_name, username")
    .eq("active", true)
    .limit(200);
  throwOnError(error);
  return new Map(
    (data ?? []).map((member: any) => [
      member.user_id,
      member.display_name || member.username || "Sans nom",
    ]),
  );
}

async function getRevenueOverview(context: AssistantContext): Promise<ToolExecutionResult> {
  const today = parisDate();
  const monthStart = `${today.slice(0, 7)}-01`;
  const { previousStart, previousEnd } = previousMonthBounds(today);
  const { data, error } = await context.supabase.rpc("dashboard_money_stats", {
    p_month_start: monthStart,
    p_prev_month_start: previousStart,
    p_prev_month_end: previousEnd,
  });
  throwOnError(error);
  const row = data?.[0] ?? {};
  const item = {
    period: today.slice(0, 7),
    revenue_current_month_ttc: Number(row.ca_month ?? 0),
    revenue_previous_month_ttc: Number(row.ca_prev_month ?? 0),
    unpaid_total_ttc: Number(row.unpaid_total ?? 0),
    unpaid_count: Number(row.unpaid_count ?? 0),
    currency: "EUR",
  };
  return {
    summary: "Agrégats financiers calculés par la fonction métier existante.",
    items: [item],
    links: [
      { label: "Voir la trésorerie", href: "/tresorerie" },
      { label: "Voir les statistiques", href: "/stats" },
    ],
  };
}

async function listInterventions(
  context: AssistantContext,
  args: z.infer<(typeof toolArgumentSchemas)["list_interventions"]>,
): Promise<ToolExecutionResult> {
  const clientIds = args.query ? await findClientIds(context.supabase, args.query) : [];
  const term = sanitizeSearchTerm(args.query);

  const buildQuery = () => {
    let query = context.supabase
      .from("interventions")
      .select(
        "id, date, adresse_site, type_nuisible, type_intervention, statut, technicien_id, client:clients(raison_sociale)",
        { count: "exact" },
      )
      .order("date", { ascending: true });
    if (args.date_from) query = query.gte("date", args.date_from);
    if (args.date_to) query = query.lte("date", args.date_to);
    if (args.status) query = query.eq("statut", args.status);
    return query;
  };

  const responses: Array<{ data: any[] | null; error: unknown; count?: number | null }> = [];
  if (term) {
    responses.push(
      await buildQuery()
        .or(`adresse_site.ilike.%${term}%,type_nuisible.ilike.%${term}%,produits.ilike.%${term}%`)
        .limit(args.limit),
    );
    if (clientIds.length > 0) {
      responses.push(await buildQuery().in("client_id", clientIds).limit(args.limit));
    }
  } else {
    responses.push(await buildQuery().limit(args.limit));
  }

  responses.forEach((response) => throwOnError(response.error));
  const rows = [
    ...new Map(
      responses.flatMap((response) => response.data ?? []).map((row) => [row.id, row]),
    ).values(),
  ].slice(0, args.limit);
  const names = await teamNameMap(context.supabase);
  const items = rows.map((row) => ({
    id: row.id,
    date: row.date,
    client: relationName(row.client),
    address: row.adresse_site,
    type: row.type_intervention,
    pest: row.type_nuisible,
    status: row.statut,
    technician: row.technicien_id ? (names.get(row.technicien_id) ?? null) : null,
  }));
  const exactTotal = term ? null : (responses[0]?.count ?? items.length);
  return {
    summary:
      exactTotal === null
        ? `${items.length} intervention(s) correspondante(s) affichée(s).`
        : `${exactTotal} intervention(s) trouvée(s), dont ${items.length} affichée(s).`,
    items,
    links: items.map((item) => ({
      label: `${item.client ?? "Intervention"} — ${item.date}`,
      href: `/interventions/${item.id}`,
    })),
  };
}

async function searchClients(
  context: AssistantContext,
  args: z.infer<(typeof toolArgumentSchemas)["search_clients"]>,
): Promise<ToolExecutionResult> {
  const term = sanitizeSearchTerm(args.query);
  if (!term) return { summary: "Terme de recherche vide.", items: [], links: [] };
  const { data, error, count } = await context.supabase
    .from("clients")
    .select("id, raison_sociale, adresse_site, telephone, email, type_nuisible")
    .or(
      `raison_sociale.ilike.%${term}%,adresse_site.ilike.%${term}%,telephone.ilike.%${term}%,email.ilike.%${term}%`,
    )
    .order("raison_sociale")
    .limit(args.limit);
  throwOnError(error);
  const items = data ?? [];
  return {
    summary: `${items.length} client(s) trouvé(s).`,
    items,
    links: items.map((client: any) => ({
      label: client.raison_sociale,
      href: `/clients/${client.id}`,
    })),
  };
}

async function getClientHistory(
  context: AssistantContext,
  args: z.infer<(typeof toolArgumentSchemas)["get_client_history"]>,
): Promise<ToolExecutionResult> {
  const [clientResponse, interventionsResponse] = await Promise.all([
    context.supabase
      .from("clients")
      .select("id, raison_sociale, adresse_site, telephone, email, type_nuisible, notes")
      .eq("id", args.client_id)
      .maybeSingle(),
    context.supabase
      .from("interventions")
      .select(
        "id, date, adresse_site, type_nuisible, type_intervention, statut, observations, technicien_id",
      )
      .eq("client_id", args.client_id)
      .order("date", { ascending: false })
      .limit(args.limit),
  ]);
  throwOnError(clientResponse.error);
  throwOnError(interventionsResponse.error);
  if (!clientResponse.data) {
    return { summary: "Client introuvable.", items: [], links: [] };
  }
  const names = await teamNameMap(context.supabase);
  const interventions = (interventionsResponse.data ?? []).map((row: any) => ({
    id: row.id,
    date: row.date,
    address: row.adresse_site,
    type: row.type_intervention,
    pest: row.type_nuisible,
    status: row.statut,
    observations: row.observations,
    technician: row.technicien_id ? (names.get(row.technicien_id) ?? null) : null,
  }));
  return {
    summary: `Fiche de ${clientResponse.data.raison_sociale} et ${interventions.length} intervention(s) récente(s).`,
    items: [{ client: clientResponse.data, interventions }],
    links: [
      {
        label: clientResponse.data.raison_sociale,
        href: `/clients/${clientResponse.data.id}`,
      },
      ...interventions.slice(0, 5).map((item) => ({
        label: `Intervention du ${item.date}`,
        href: `/interventions/${item.id}`,
      })),
    ],
  };
}

async function listReportsToReview(
  context: AssistantContext,
  args: z.infer<(typeof toolArgumentSchemas)["list_reports_to_review"]>,
): Promise<ToolExecutionResult> {
  const { data, error } = await context.supabase
    .from("interventions")
    .select(
      "id, date, adresse_site, observations, produits, technicien_id, client:clients(raison_sociale)",
      { count: "exact" },
    )
    .eq("statut", "realisee")
    .order("date", { ascending: true })
    .limit(args.limit);
  throwOnError(error);
  const names = await teamNameMap(context.supabase);
  const items = (data ?? []).map((row: any) => ({
    id: row.id,
    date: row.date,
    client: relationName(row.client),
    address: row.adresse_site,
    has_observations: Boolean(row.observations?.trim()),
    has_products: Boolean(row.produits?.trim()),
    technician: row.technicien_id ? (names.get(row.technicien_id) ?? null) : null,
  }));
  return {
    summary: `${count ?? items.length} rapport(s) à vérifier, dont ${items.length} affiché(s).`,
    items,
    links: items.map((item) => ({
      label: `${item.client ?? "Rapport"} — ${item.date}`,
      href: `/interventions/${item.id}`,
    })),
  };
}

async function searchInvoices(
  context: AssistantContext,
  args: z.infer<(typeof toolArgumentSchemas)["search_invoices"]>,
): Promise<ToolExecutionResult> {
  const term = sanitizeSearchTerm(args.query);
  const clientIds = term ? await findClientIds(context.supabase, term) : [];
  let query = context.supabase
    .from("invoices")
    .select(
      "id, numero, date_facture, echeance, statut, total_ht, total_ttc, client_id, client:clients(raison_sociale)",
      { count: "exact" },
    )
    .order("date_facture", { ascending: false });
  if (args.date_from) query = query.gte("date_facture", args.date_from);
  if (args.date_to) query = query.lte("date_facture", args.date_to);
  if (args.unpaid_only) query = query.in("statut", ["envoyee", "retard"]);
  else if (args.status) query = query.eq("statut", args.status);
  if (args.min_total_ttc !== null) query = query.gte("total_ttc", args.min_total_ttc);
  if (term) {
    const number = Number(term.replace(",", "."));
    if (Number.isInteger(number)) query = query.eq("numero", number);
    else if (clientIds.length > 0) query = query.in("client_id", clientIds);
    else return { summary: "Aucune facture trouvée.", items: [], links: [] };
  }
  const { data, error, count } = await query.limit(args.limit);
  throwOnError(error);
  const items = (data ?? []).map((row: any) => ({
    id: row.id,
    number: row.numero,
    client: relationName(row.client),
    invoice_date: row.date_facture,
    due_date: row.echeance,
    status: row.statut,
    total_ht: Number(row.total_ht ?? 0),
    total_ttc: Number(row.total_ttc ?? 0),
    currency: "EUR",
  }));
  return {
    summary: `${count ?? items.length} facture(s) trouvée(s), dont ${items.length} affichée(s).`,
    items,
    links: items.map((item) => ({
      label: `Facture N°${item.number}${item.client ? ` — ${item.client}` : ""}`,
      href: `/factures/${item.id}`,
    })),
  };
}

async function searchQuotes(
  context: AssistantContext,
  args: z.infer<(typeof toolArgumentSchemas)["search_quotes"]>,
): Promise<ToolExecutionResult> {
  const term = sanitizeSearchTerm(args.query);
  const clientIds = term ? await findClientIds(context.supabase, term) : [];
  let query = context.supabase
    .from("devis")
    .select(
      "id, numero, date_devis, date_validite, statut, total_ht, total_ttc, client_id, client:clients(raison_sociale)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false });
  if (args.pending_only) query = query.in("statut", ["brouillon", "envoye"]);
  else if (args.status) query = query.eq("statut", args.status);
  if (term) {
    const escaped = term.replace(/[*]/g, " ");
    if (clientIds.length > 0) {
      query = query.or(`numero.ilike.%${escaped}%,client_id.in.(${clientIds.join(",")})`);
    } else {
      query = query.ilike("numero", `%${escaped}%`);
    }
  }
  const { data, error, count } = await query.limit(args.limit);
  throwOnError(error);
  const items = (data ?? []).map((row: any) => ({
    id: row.id,
    number: row.numero,
    client: relationName(row.client),
    quote_date: row.date_devis,
    valid_until: row.date_validite,
    status: row.statut,
    total_ht: Number(row.total_ht ?? 0),
    total_ttc: Number(row.total_ttc ?? 0),
    currency: "EUR",
  }));
  return {
    summary: `${count ?? items.length} devis trouvé(s), dont ${items.length} affiché(s).`,
    items,
    links: items.map((item) => ({
      label: `Devis ${item.number}${item.client ? ` — ${item.client}` : ""}`,
      href: `/devis/${item.id}`,
    })),
  };
}

async function searchContracts(
  context: AssistantContext,
  args: z.infer<(typeof toolArgumentSchemas)["search_contracts"]>,
): Promise<ToolExecutionResult> {
  const term = sanitizeSearchTerm(args.query);
  const clientIds = term ? await findClientIds(context.supabase, term) : [];
  let query = context.supabase
    .from("contracts")
    .select(
      "id, numero, nom_etablissement, date_debut, date_fin, statut, frequence, nb_passages_inclus, passages_realises, client_id, client:clients(raison_sociale)",
      { count: "exact" },
    )
    .order("date_fin", { ascending: true });
  if (args.status) query = query.eq("statut", args.status);
  if (args.expires_before) query = query.lte("date_fin", args.expires_before);
  if (term) {
    const nativeFilter = `numero.ilike.%${term}%,nom_etablissement.ilike.%${term}%`;
    query =
      clientIds.length > 0
        ? query.or(`${nativeFilter},client_id.in.(${clientIds.join(",")})`)
        : query.or(nativeFilter);
  }
  const { data, error, count } = await query.limit(args.limit);
  throwOnError(error);
  const items = (data ?? []).map((row: any) => ({
    id: row.id,
    number: row.numero,
    client: relationName(row.client),
    establishment: row.nom_etablissement,
    start_date: row.date_debut,
    end_date: row.date_fin,
    status: row.statut,
    frequency: row.frequence,
    included_visits: row.nb_passages_inclus,
    completed_visits: row.passages_realises,
  }));
  return {
    summary: `${count ?? items.length} contrat(s) trouvé(s), dont ${items.length} affiché(s).`,
    items,
    links: items.map((item) => ({
      label: `${item.number ?? "Contrat"}${item.client ? ` — ${item.client}` : ""}`,
      href: `/contrats/${item.id}`,
    })),
  };
}

async function searchStock(
  context: AssistantContext,
  args: z.infer<(typeof toolArgumentSchemas)["search_stock"]>,
): Promise<ToolExecutionResult> {
  const term = sanitizeSearchTerm(args.query);
  let productQuery = context.supabase
    .from("stock_products")
    .select("id, nom, unite, seuil_alerte, prix_achat_ht")
    .order("nom");
  if (term) productQuery = productQuery.ilike("nom", `%${term}%`);
  const { data: products, error: productError } = await productQuery.limit(100);
  throwOnError(productError);
  const productIds = (products ?? []).map((product: any) => product.id);
  if (productIds.length === 0) {
    return { summary: "Aucun produit trouvé.", items: [], links: [] };
  }
  const [{ data: levels, error: levelsError }, names] = await Promise.all([
    context.supabase
      .from("stock_levels")
      .select("product_id, technicien_id, quantite")
      .in("product_id", productIds)
      .limit(500),
    teamNameMap(context.supabase),
  ]);
  throwOnError(levelsError);
  const productsById = new Map((products ?? []).map((product: any) => [product.id, product]));
  const items = (levels ?? [])
    .map((level: any) => {
      const product: any = productsById.get(level.product_id);
      const quantity = Number(level.quantite ?? 0);
      const threshold = Number(product?.seuil_alerte ?? 0);
      return {
        product_id: level.product_id,
        product: product?.nom ?? "Produit",
        unit: product?.unite ?? "",
        location: level.technicien_id
          ? `Camion de ${names.get(level.technicien_id) ?? "technicien"}`
          : "Garage",
        quantity,
        threshold,
        low_stock: quantity <= threshold,
      };
    })
    .filter((item: any) => !args.low_only || item.low_stock)
    .slice(0, args.limit);
  return {
    summary: `${items.length} niveau(x) de stock trouvé(s).`,
    items,
    links: [{ label: "Voir le stock", href: "/stock" }],
  };
}

async function listTechnicianInterventions(
  context: AssistantContext,
  args: z.infer<(typeof toolArgumentSchemas)["list_technician_interventions"]>,
): Promise<ToolExecutionResult> {
  const term = sanitizeSearchTerm(args.technician_query);
  if (!term) return { summary: "Nom de technicien vide.", items: [], links: [] };
  const { data: members, error: memberError } = await context.supabase
    .from("team_members")
    .select("user_id, display_name, username")
    .eq("active", true)
    .eq("poste", "technicien")
    .or(`display_name.ilike.%${term}%,username.ilike.%${term}%`)
    .limit(10);
  throwOnError(memberError);
  if (!members?.length) {
    return { summary: "Aucun technicien trouvé.", items: [], links: [] };
  }
  const memberIds = members.map((member: any) => member.user_id);
  const names = new Map(
    members.map((member: any) => [
      member.user_id,
      member.display_name || member.username || "Sans nom",
    ]),
  );
  let query = context.supabase
    .from("interventions")
    .select(
      "id, date, adresse_site, type_intervention, type_nuisible, statut, technicien_id, client:clients(raison_sociale)",
    )
    .in("technicien_id", memberIds)
    .order("date", { ascending: true });
  if (args.date_from) query = query.gte("date", args.date_from);
  if (args.date_to) query = query.lte("date", args.date_to);
  const { data, error } = await query.limit(args.limit);
  throwOnError(error);
  const items = (data ?? []).map((row: any) => ({
    id: row.id,
    date: row.date,
    client: relationName(row.client),
    address: row.adresse_site,
    type: row.type_intervention,
    pest: row.type_nuisible,
    status: row.statut,
    technician: names.get(row.technicien_id) ?? null,
  }));
  return {
    summary: `${items.length} intervention(s) assignée(s).`,
    items,
    links: items.map((item) => ({
      label: `${item.technician ?? "Technicien"} — ${item.date}`,
      href: `/interventions/${item.id}`,
    })),
  };
}

export async function executeAssistantTool({
  name,
  rawArguments,
  context,
  access,
}: {
  name: string;
  rawArguments: string;
  context: AssistantContext;
  access: AssistantAccess;
}): Promise<ToolExecutionResult> {
  const toolName = name as ToolName;
  const permission = permissionByTool[toolName];
  if (!permission || !canUse(access, permission)) {
    throw new Error("Outil non autorisé.");
  }
  const args = parseToolArguments(name, rawArguments) as any;

  switch (toolName) {
    case "get_revenue_overview":
      return getRevenueOverview(context);
    case "list_interventions":
      return listInterventions(context, args);
    case "search_clients":
      return searchClients(context, args);
    case "get_client_history":
      return getClientHistory(context, args);
    case "list_reports_to_review":
      return listReportsToReview(context, args);
    case "search_invoices":
      return searchInvoices(context, args);
    case "search_quotes":
      return searchQuotes(context, args);
    case "search_contracts":
      return searchContracts(context, args);
    case "search_stock":
      return searchStock(context, args);
    case "list_technician_interventions":
      return listTechnicianInterventions(context, args);
    default:
      throw new Error("Outil non autorisé.");
  }
}
