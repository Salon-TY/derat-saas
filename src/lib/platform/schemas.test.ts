import { describe, expect, it } from "bun:test";

import { accessRequestSchema } from "@/lib/platform/schemas";

const validRequest = {
  companyName: "Entreprise exemple",
  managerFirstName: "Camille",
  managerLastName: "Martin",
  professionalEmail: "contact@example.test",
  phone: "+33 6 00 00 00 00",
  technicianCount: 3,
  cityOrRegion: "Île-de-France",
  message: "",
  termsAccepted: true as const,
  website: "",
};

describe("accessRequestSchema", () => {
  it("accepte une demande professionnelle complète", () => {
    expect(accessRequestSchema.safeParse(validRequest).success).toBe(true);
  });

  it("refuse une demande sans consentement", () => {
    expect(
      accessRequestSchema.safeParse({
        ...validRequest,
        termsAccepted: false,
      }).success,
    ).toBe(false);
  });

  it("refuse le champ piège rempli", () => {
    expect(
      accessRequestSchema.safeParse({
        ...validRequest,
        website: "https://spam.invalid",
      }).success,
    ).toBe(false);
  });

  it("refuse les longueurs et quantités hors limites", () => {
    expect(
      accessRequestSchema.safeParse({
        ...validRequest,
        companyName: "x".repeat(161),
        technicianCount: 10001,
      }).success,
    ).toBe(false);
  });
});
