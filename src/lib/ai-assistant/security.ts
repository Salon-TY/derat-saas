import type { AssistantLink } from "./contracts";

const WRITE_VERBS =
  "(?:cr(?:ée|éer|ées|éez)|ajout(?:e|er|es|ez)|modifi(?:e|er|es|ez)|supprim(?:e|er|es|ez)|effac(?:e|er|es|ez)|annul(?:e|er|es|ez)|valid(?:e|er|es|ez)|envoi(?:e|es|ez)|envoy(?:er|é|ée|és|ées)|renvoi(?:e|es|ez)|renvoy(?:er|é|ée|és|ées)|assign(?:e|er|es|ez)|programm(?:e|er|es|ez)|d[ée]plac(?:e|er|es|ez)|ajust(?:e|er|es|ez)|(?:paie|paies|payes?|payer|payez)|r[èe]gl(?:e|er|es|ez)|converti(?:s|r|es|ez)|chang(?:e|er|es|ez))";

const DIRECT_WRITE_REQUEST = new RegExp(
  `^(?:(?:peux|pourrais|dois)-?tu\\s+|merci\\s+de\\s+|je\\s+(?:veux|souhaite)\\s+que\\s+tu\\s+)?${WRITE_VERBS}\\b`,
  "iu",
);

const EXPLICIT_WRITE_OBJECT = new RegExp(
  `\\b${WRITE_VERBS}\\s+(?:(?:le|la|les|un|une|ce|cette|mon|ma|mes)\\s+)?(?:client|intervention|devis|facture|contrat|rapport|produit|stock|statut|technicien|photo|signature|paiement|relance|passage|membre|param[èe]tre)\\b`,
  "iu",
);

export function isForbiddenMutationRequest(message: string): boolean {
  const normalized = message.trim().replace(/\s+/g, " ");
  return DIRECT_WRITE_REQUEST.test(normalized) || EXPLICIT_WRITE_OBJECT.test(normalized);
}

export function forbiddenMutationReply(): string {
  return (
    "Je suis limité à la consultation : je ne peux ni créer, modifier, supprimer, " +
    "envoyer, valider ou changer un statut. Utilisez l’écran concerné pour effectuer cette action."
  );
}

const SAFE_INTERNAL_LINK =
  /^\/(?:clients|interventions|factures|devis|contrats|stock|stats|tresorerie|equipe)(?:\/[0-9a-f-]+)?(?:\?[a-z0-9_=&%-]+)?$/i;

export function sanitizeAssistantLinks(links: AssistantLink[]): AssistantLink[] {
  const seen = new Set<string>();
  return links.filter((link) => {
    if (!SAFE_INTERNAL_LINK.test(link.href) || link.href.startsWith("//") || seen.has(link.href)) {
      return false;
    }
    seen.add(link.href);
    return link.label.trim().length > 0 && link.label.length <= 100;
  });
}

export function sanitizeSearchTerm(value: string | null): string | null {
  if (!value) return null;
  const sanitized = value
    .trim()
    .replace(/[,()%'"\\]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 120)
    .trim();
  return sanitized || null;
}
