// Détection légère de client quasi-doublon (variante d'écriture d'une même
// raison sociale). Purement informatif — ne bloque jamais une création.

const LEGAL_FORM_TOKENS = /\b(sarl|sas|sasu|eurl|sa|ei|eirl|sci|sccv)\b/g;

// Plage Unicode des signes diacritiques combinants (U+0300–U+036F) isolés par
// la normalisation NFD (ex. "é" -> "e" + accent combinant). Filtrage par
// point de code plutôt que par plage regex \u pour éviter toute ambiguïté
// d'encodage à l'écriture de ce fichier.
function stripCombiningDiacritics(s: string): string {
  let out = "";
  for (const ch of s) {
    const code = ch.codePointAt(0) ?? 0;
    if (code < 0x0300 || code > 0x036f) out += ch;
  }
  return out;
}

export function normalizeCompanyName(raw: string): string {
  return stripCombiningDiacritics(raw.normalize("NFD"))
    .toLowerCase()
    .replace(LEGAL_FORM_TOKENS, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const curr = [i];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    prev = curr;
  }
  return prev[n];
}

function similarityRatio(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

/**
 * Client existant dont le nom (normalisé) est proche mais pas identique à
 * `name`, hors `excludeId`. Renvoie le meilleur candidat au-dessus du seuil,
 * ou `null` si aucun.
 */
export function findNearDuplicateClient<T extends { id: string; raison_sociale: string }>(
  name: string,
  excludeId: string | null | undefined,
  clients: T[],
  threshold = 0.82,
): T | null {
  const normTarget = normalizeCompanyName(name);
  if (!normTarget) return null;

  let best: { client: T; ratio: number } | null = null;
  for (const c of clients) {
    if (c.id === excludeId) continue;
    const normC = normalizeCompanyName(c.raison_sociale);
    if (!normC) continue;
    const ratio = similarityRatio(normTarget, normC);
    if (ratio >= threshold && (!best || ratio > best.ratio)) {
      best = { client: c, ratio };
    }
  }
  return best?.client ?? null;
}
