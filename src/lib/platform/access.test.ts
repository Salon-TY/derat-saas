import { describe, expect, it } from "bun:test";

import { destinationForPlatformContext, type CurrentPlatformContext } from "@/lib/platform/access";

const baseContext: CurrentPlatformContext = {
  authenticated: true,
  platformAdmin: false,
  status: "active",
  role: "owner",
  poste: null,
};

describe("destinationForPlatformContext", () => {
  it("envoie un administrateur de plateforme vers son espace séparé", () => {
    expect(
      destinationForPlatformContext({
        ...baseContext,
        platformAdmin: true,
      }),
    ).toBe("/platform");
  });

  it("envoie les comptes clients actifs vers leur interface", () => {
    expect(destinationForPlatformContext(baseContext)).toBe("/app");
    expect(
      destinationForPlatformContext({
        ...baseContext,
        role: "employe",
        poste: "technicien",
      }),
    ).toBe("/tech");
  });

  it.each([
    ["pending", "/demande-en-attente"],
    ["rejected", "/acces-refuse"],
    ["cancelled", "/acces-refuse"],
    ["suspended", "/acces-suspendu"],
  ] as const)("redirige le statut %s vers %s", (status, expected) => {
    expect(
      destinationForPlatformContext({
        ...baseContext,
        status,
      }),
    ).toBe(expected);
  });

  it("redirige un visiteur non connecté vers la connexion", () => {
    expect(
      destinationForPlatformContext({
        authenticated: false,
        platformAdmin: false,
        status: null,
        role: null,
        poste: null,
      }),
    ).toBe("/connexion");
  });
});
