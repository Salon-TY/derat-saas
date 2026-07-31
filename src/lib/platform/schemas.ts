import { z } from "zod";

const phonePattern = /^[+()\d\s.-]{6,32}$/;

export const accessRequestSchema = z.object({
  companyName: z
    .string()
    .trim()
    .min(2, "Indiquez le nom de l’entreprise.")
    .max(160, "Le nom est trop long."),
  managerFirstName: z
    .string()
    .trim()
    .min(1, "Indiquez le prénom.")
    .max(80, "Le prénom est trop long."),
  managerLastName: z.string().trim().min(1, "Indiquez le nom.").max(80, "Le nom est trop long."),
  professionalEmail: z
    .string()
    .trim()
    .email("Saisissez un email professionnel valide.")
    .max(254, "L’email est trop long."),
  phone: z.string().trim().regex(phonePattern, "Saisissez un numéro de téléphone valide."),
  technicianCount: z
    .number({ invalid_type_error: "Indiquez le nombre de techniciens." })
    .int("Le nombre doit être entier.")
    .min(0, "Le nombre ne peut pas être négatif.")
    .max(10000, "Le nombre indiqué est trop élevé."),
  cityOrRegion: z
    .string()
    .trim()
    .min(2, "Indiquez une ville ou une région.")
    .max(160, "La localisation est trop longue."),
  message: z.string().trim().max(2000, "Le message est trop long.").optional(),
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: "Vous devez accepter les conditions nécessaires." }),
  }),
  website: z.string().max(0).optional(),
});

export type AccessRequestInput = z.infer<typeof accessRequestSchema>;

export const platformDecisionSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().trim().max(1000).optional().default(""),
});

export const platformAccountDecisionSchema = z.object({
  ownerId: z.string().uuid(),
  status: z.enum(["active", "suspended", "cancelled"]),
  reason: z.string().trim().max(1000).optional().default(""),
});
