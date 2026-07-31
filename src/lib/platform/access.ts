import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/db";

export type AccountAccessStatus = "pending" | "active" | "rejected" | "suspended" | "cancelled";

export type CurrentPlatformContext = {
  authenticated: boolean;
  platformAdmin: boolean;
  status: AccountAccessStatus | null;
  role: "owner" | "employe" | "disabled" | null;
  poste: "bureau" | "technicien" | null;
};

export type SignedInDestination =
  | "/app"
  | "/tech"
  | "/platform"
  | "/demande-en-attente"
  | "/acces-refuse"
  | "/acces-suspendu"
  | "/connexion";

function isPlatformContext(value: unknown): value is CurrentPlatformContext {
  if (!value || typeof value !== "object") return false;
  const context = value as Partial<CurrentPlatformContext>;
  return (
    typeof context.authenticated === "boolean" &&
    typeof context.platformAdmin === "boolean" &&
    (context.status === null ||
      ["pending", "active", "rejected", "suspended", "cancelled"].includes(context.status))
  );
}

export async function getCurrentPlatformContext(): Promise<CurrentPlatformContext> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) {
    return {
      authenticated: false,
      platformAdmin: false,
      status: null,
      role: null,
      poste: null,
    };
  }

  const { data, error } = await db.rpc("current_platform_context");
  if (error) {
    throw new Error("Impossible de vérifier le statut d’accès de ce compte.");
  }
  if (!isPlatformContext(data)) {
    throw new Error("Le statut d’accès reçu est invalide.");
  }
  return data;
}

export function destinationForPlatformContext(
  context: CurrentPlatformContext,
): SignedInDestination {
  if (!context.authenticated) return "/connexion";
  if (context.platformAdmin) return "/platform";

  switch (context.status) {
    case "active":
      return context.role !== "owner" && context.poste === "technicien" ? "/tech" : "/app";
    case "pending":
      return "/demande-en-attente";
    case "rejected":
    case "cancelled":
      return "/acces-refuse";
    case "suspended":
      return "/acces-suspendu";
    default:
      return "/demande-en-attente";
  }
}

export async function resolveSignedInDestination(): Promise<SignedInDestination> {
  return destinationForPlatformContext(await getCurrentPlatformContext());
}
