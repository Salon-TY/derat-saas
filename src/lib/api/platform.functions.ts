import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { platformAccountDecisionSchema, platformDecisionSchema } from "@/lib/platform/schemas";
import { accessRequestSchema } from "@/lib/platform/schemas";

const TERMS_VERSION = "2026-07-31";

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function createRequestFingerprint(email: string, ipAddress: string): Promise<string> {
  const pepper = process.env.ACCESS_REQUEST_HASH_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!pepper) {
    throw new Error("La protection des demandes d’accès n’est pas configurée.");
  }

  const input = new TextEncoder().encode(`${pepper}:${email.trim().toLowerCase()}:${ipAddress}`);
  return bytesToHex(await crypto.subtle.digest("SHA-256", input));
}

export const submitAccessRequest = createServerFn({ method: "POST" })
  .inputValidator(accessRequestSchema)
  .handler(async ({ data }) => {
    // Champ piège : les visiteurs légitimes ne le voient et ne le remplissent jamais.
    if (data.website) return { ok: true };

    const { getRequest } = await import("@tanstack/react-start/server");
    const request = getRequest();
    const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const clientIp =
      forwardedFor || request.headers.get("x-real-ip")?.trim() || "local-or-unavailable";
    const fingerprint = await createRequestFingerprint(
      data.professionalEmail,
      clientIp.slice(0, 128),
    );

    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const { error } = await admin.rpc("submit_platform_access_request", {
      p_company_name: data.companyName,
      p_manager_first_name: data.managerFirstName,
      p_manager_last_name: data.managerLastName,
      p_professional_email: data.professionalEmail,
      p_phone: data.phone,
      p_technician_count: data.technicianCount,
      p_city_or_region: data.cityOrRegion,
      p_message: data.message || null,
      p_terms_version: TERMS_VERSION,
      p_request_fingerprint: fingerprint,
    });

    if (error?.message.includes("RATE_LIMIT")) {
      throw new Error("Trop de tentatives ont été effectuées. Réessayez dans environ une heure.");
    }
    if (error) {
      console.error("[platform-access-request]", error.code);
      throw new Error("La demande n’a pas pu être enregistrée. Réessayez dans quelques instants.");
    }

    // Une double demande reçoit volontairement la même réponse afin de ne pas
    // révéler publiquement si une adresse existe déjà.
    return { ok: true };
  });

export type PlatformAccessRequest = {
  id: string;
  companyName: string;
  managerFirstName: string;
  managerLastName: string;
  professionalEmail: string;
  phone: string;
  technicianCount: number;
  cityOrRegion: string;
  message: string | null;
  status: "pending" | "active" | "rejected" | "cancelled";
  decisionReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

export type PlatformAccount = {
  ownerId: string;
  requestId: string | null;
  companyName: string;
  managerEmail: string;
  phone: string | null;
  status: "pending" | "active" | "rejected" | "suspended" | "cancelled";
  currentReason: string | null;
  activatedAt: string | null;
  suspendedAt: string | null;
  createdAt: string;
};

export type PlatformAccessEvent = {
  id: string;
  requestId: string | null;
  ownerId: string | null;
  actorUserId: string;
  action: string;
  oldValue: string | null;
  newValue: string;
  reason: string | null;
  createdAt: string;
};

export type PlatformOverview = {
  counts: {
    pendingRequests: number;
    activeAccounts: number;
    suspendedAccounts: number;
  };
  requests: PlatformAccessRequest[];
  accounts: PlatformAccount[];
  events: PlatformAccessEvent[];
};

async function requirePlatformAdmin(context: {
  userId: string;
  supabase: {
    rpc: (
      functionName: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: unknown }>;
  };
}) {
  const { data, error } = await context.supabase.rpc("is_platform_admin", {
    p_user_id: context.userId,
  });
  if (error || data !== true) {
    throw new Error("Action réservée à l’administration de la plateforme.");
  }
}

function mapRequest(row: Record<string, unknown>): PlatformAccessRequest {
  return {
    id: String(row.id),
    companyName: String(row.company_name),
    managerFirstName: String(row.manager_first_name),
    managerLastName: String(row.manager_last_name),
    professionalEmail: String(row.professional_email),
    phone: String(row.phone),
    technicianCount: Number(row.technician_count),
    cityOrRegion: String(row.city_or_region),
    message: typeof row.message === "string" ? row.message : null,
    status: row.status as PlatformAccessRequest["status"],
    decisionReason: typeof row.decision_reason === "string" ? row.decision_reason : null,
    reviewedAt: typeof row.reviewed_at === "string" ? row.reviewed_at : null,
    createdAt: String(row.created_at),
  };
}

function mapEvent(row: Record<string, unknown>): PlatformAccessEvent {
  return {
    id: String(row.id),
    requestId: typeof row.request_id === "string" ? row.request_id : null,
    ownerId: typeof row.owner_id === "string" ? row.owner_id : null,
    actorUserId: String(row.actor_user_id),
    action: String(row.action),
    oldValue: typeof row.old_value === "string" ? row.old_value : null,
    newValue: String(row.new_value),
    reason: typeof row.reason === "string" ? row.reason : null,
    createdAt: String(row.created_at),
  };
}

export const getPlatformOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PlatformOverview> => {
    await requirePlatformAdmin(context);
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");

    const [requestsResult, accountsResult, settingsResult, eventsResult, usersResult] =
      await Promise.all([
        admin
          .from("platform_access_requests")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200),
        admin
          .from("platform_accounts")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200),
        admin.from("company_settings").select("user_id, nom, email, telephone").limit(500),
        admin
          .from("platform_access_events")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200),
        admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      ]);

    const databaseError =
      requestsResult.error || accountsResult.error || settingsResult.error || eventsResult.error;
    if (databaseError || usersResult.error) {
      throw new Error("Impossible de charger l’administration de la plateforme.");
    }

    const requests = (requestsResult.data ?? []).map((row) =>
      mapRequest(row as Record<string, unknown>),
    );
    const settingsByOwner = new Map((settingsResult.data ?? []).map((row) => [row.user_id, row]));
    const emailByOwner = new Map(
      (usersResult.data.users ?? []).map((user) => [user.id, user.email ?? ""]),
    );
    const accounts: PlatformAccount[] = (accountsResult.data ?? []).map((row) => {
      const settings = settingsByOwner.get(row.owner_id);
      return {
        ownerId: row.owner_id,
        requestId: row.request_id,
        companyName: settings?.nom?.trim() || "Entreprise à configurer",
        managerEmail: emailByOwner.get(row.owner_id) || settings?.email || "",
        phone: settings?.telephone || null,
        status: row.status as PlatformAccount["status"],
        currentReason: row.current_reason,
        activatedAt: row.activated_at,
        suspendedAt: row.suspended_at,
        createdAt: row.created_at,
      };
    });
    const events = (eventsResult.data ?? []).map((row) => mapEvent(row as Record<string, unknown>));

    return {
      counts: {
        pendingRequests: requests.filter((request) => request.status === "pending").length,
        activeAccounts: accounts.filter((account) => account.status === "active").length,
        suspendedAccounts: accounts.filter((account) => account.status === "suspended").length,
      },
      requests,
      accounts,
      events,
    };
  });

export const acceptPlatformRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(platformDecisionSchema)
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");

    const { data: request, error: requestError } = await admin
      .from("platform_access_requests")
      .select("id, professional_email, manager_first_name, manager_last_name, company_name, status")
      .eq("id", data.id)
      .maybeSingle();
    if (requestError || !request || request.status !== "pending") {
      throw new Error("Cette demande n’est plus en attente.");
    }

    const { data: existingAccount } = await admin
      .from("platform_accounts")
      .select("owner_id")
      .eq("request_id", request.id)
      .maybeSingle();
    if (existingAccount) {
      throw new Error("Cette demande est déjà liée à une entreprise.");
    }

    let ownerId: string | null = null;
    let invitedUserCreated = false;
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
      request.professional_email,
      {
        data: {
          display_name: `${request.manager_first_name} ${request.manager_last_name}`,
          company_name: request.company_name,
          access_request_id: request.id,
        },
      },
    );

    if (!inviteError && invited.user) {
      ownerId = invited.user.id;
      invitedUserCreated = true;
    } else {
      const { data: users, error: usersError } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      if (usersError) throw new Error("Impossible de vérifier l’utilisateur existant.");
      const existingUser = users.users.find(
        (user) => user.email?.toLowerCase() === request.professional_email.toLowerCase(),
      );
      if (!existingUser?.email_confirmed_at) {
        throw new Error("L’invitation n’a pas pu être envoyée à cette adresse professionnelle.");
      }
      ownerId = existingUser.id;
    }

    const { data: ownerAccount } = await admin
      .from("platform_accounts")
      .select("owner_id")
      .eq("owner_id", ownerId)
      .maybeSingle();
    if (ownerAccount) {
      if (invitedUserCreated) {
        await admin.auth.admin.deleteUser(ownerId).catch(() => undefined);
      }
      throw new Error("Cette adresse est déjà liée à une entreprise.");
    }

    const { error: acceptError } = await admin.rpc("platform_accept_request", {
      p_request_id: request.id,
      p_owner_id: ownerId,
      p_actor_user_id: context.userId,
    });
    if (acceptError) {
      if (invitedUserCreated) {
        await admin.auth.admin.deleteUser(ownerId).catch(() => undefined);
      }
      throw new Error("L’acceptation n’a pas pu être enregistrée.");
    }

    return { ok: true };
  });

export const rejectPlatformRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(platformDecisionSchema)
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const { error } = await admin.rpc("platform_reject_request", {
      p_request_id: data.id,
      p_actor_user_id: context.userId,
      p_reason: data.reason,
    });
    if (error) throw new Error("Le refus n’a pas pu être enregistré.");
    return { ok: true };
  });

export const setPlatformAccountStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(platformAccountDecisionSchema)
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const { error } = await admin.rpc("platform_set_account_status", {
      p_owner_id: data.ownerId,
      p_new_status: data.status,
      p_actor_user_id: context.userId,
      p_reason: data.reason,
    });
    if (error) throw new Error("Le statut de l’entreprise n’a pas pu être modifié.");
    return { ok: true };
  });
