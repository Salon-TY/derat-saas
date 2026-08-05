-- Bug audit #2 [CRITIQUE] — numérotation devis/factures non fiable, doublons
-- CONFIRMÉS en base (pas juste possibles) sur le compte de test
-- audit-qa-20260805@example.com :
--   - 3 devis avec numero='DEV-2026-001' (même user_id = owner).
--   - 2 factures avec numero=2 (même user_id = owner).
--
-- Causes racines identifiées :
--   - Devis (`_app.devis.new.tsx`) : compte le prochain numéro via
--     `.eq("user_id", user.id)` avec l'UID de la SESSION COURANTE. Pour tout
--     non-owner, ce filtre ne retrouve jamais les devis existants (stockés
--     sous l'UID owner par le trigger `set_account_owner_trg`) => le comptage
--     repart de 0 à chaque fois => DEV-2026-001 généré en boucle.
--   - Factures (`_app.factures.new.tsx`) : lit `company_settings.next_invoice_number`
--     puis fait un `UPDATE ... SET next_invoice_number = next_invoice_number + 1`
--     bloqué SILENCIEUSEMENT par la RLS owner-only pour tout non-owner (0 ligne
--     affectée, aucune erreur remontée par Supabase JS) => le compteur n'avance
--     jamais quand un employé facture => réutilisation du même numéro.
--   - `public.next_invoice_number()` : une fonction RPC SECURITY DEFINER de ce
--     nom EXISTE DÉJÀ en base (visible dans l'OpenAPI PostgREST), mais N'EST
--     JAMAIS APPELÉE par le frontend (grep du repo : aucun `rpc("next_invoice_number")`)
--     et reproduit EXACTEMENT le même bug en interne : elle incrémente
--     `company_settings.next_invoice_number` `WHERE user_id = auth.uid()` (l'UID
--     de l'APPELANT) au lieu de `account_owner()` (le compte). Confirmé en
--     direct : appelée plusieurs fois de suite en tant que owner puis en tant
--     que bureau1, chacun obtient sa PROPRE séquence indépendante au lieu de
--     partager celle du compte. Code mort et buggé, jamais committé dans une
--     migration (dérive SQL Editor). Ce fichier la corrige EN PLACE (elle
--     n'est appelée nulle part actuellement donc aucun risque de régression)
--     plutôt que d'en créer une nouvelle sous un autre nom.
--
-- Correctif (règle : au niveau base de données, pas seulement côté interface) :
--   1. Dé-doublonne les numéros déjà en conflit (ne renumérote QUE les lignes
--      strictement dupliquées, garde la plus ancienne de chaque groupe telle
--      quelle — c'est la plus probable d'avoir déjà été envoyée à un client —
--      et décale les suivantes vers le premier numéro disponible). Aucune
--      donnée inventée : seul le champ numero des doublons est recalculé à
--      partir de l'ordre chronologique réel de création.
--   2. Ajoute une contrainte d'unicité réelle (user_id, numero) sur `devis` et
--      `invoices` : garantit l'absence de doublon même en cas de double-clic
--      quasi simultané, indépendamment du rôle de l'appelant (erreur 23505 au
--      pire, jamais un doublon silencieux).
--   3. Corrige `next_invoice_number()` pour utiliser `account_owner()`, et crée
--      son équivalent `next_devis_number()` (nouveau, même modèle : compteur
--      atomique dans `company_settings`, UPDATE...RETURNING sur une seule ligne
--      = verrouillage de ligne Postgres = sérialisation automatique des appels
--      concurrents pour un même compte).
--
-- Le frontend (`_app.devis.new.tsx`, `_app.factures.new.tsx`) est adapté dans
-- le même commit pour appeler ces RPC au lieu de calculer le numéro côté client.

-- ── 1a. Dé-doublonnage devis (numero text 'DEV-YYYY-NNN') ───────────────────
DO $$
DECLARE
  r RECORD;
  v_year text;
  v_next integer;
  v_new_numero text;
BEGIN
  FOR r IN
    SELECT d.id, d.user_id, d.numero
    FROM public.devis d
    JOIN (
      SELECT user_id, numero
      FROM public.devis
      GROUP BY user_id, numero
      HAVING COUNT(*) > 1
    ) dup ON dup.user_id = d.user_id AND dup.numero = d.numero
    WHERE d.id NOT IN (
      -- garde la ligne la plus ancienne de chaque groupe dupliqué
      SELECT DISTINCT ON (user_id, numero) id
      FROM public.devis
      ORDER BY user_id, numero, created_at, id
    )
    ORDER BY d.user_id, d.created_at, d.id
  LOOP
    v_year := substring(r.numero FROM 'DEV-(\d{4})-');
    IF v_year IS NULL THEN
      v_year := EXTRACT(YEAR FROM now())::text;
    END IF;

    SELECT COALESCE(MAX(NULLIF(regexp_replace(numero, '^DEV-' || v_year || '-', ''), '')::int), 0) + 1
      INTO v_next
      FROM public.devis
      WHERE user_id = r.user_id AND numero LIKE 'DEV-' || v_year || '-%';

    v_new_numero := 'DEV-' || v_year || '-' || LPAD(v_next::text, 3, '0');
    UPDATE public.devis SET numero = v_new_numero WHERE id = r.id;
  END LOOP;
END $$;

-- ── 1b. Dé-doublonnage factures (numero integer) ─────────────────────────────
DO $$
DECLARE
  r RECORD;
  v_next integer;
BEGIN
  FOR r IN
    SELECT i.id, i.user_id
    FROM public.invoices i
    JOIN (
      SELECT user_id, numero
      FROM public.invoices
      GROUP BY user_id, numero
      HAVING COUNT(*) > 1
    ) dup ON dup.user_id = i.user_id AND dup.numero = i.numero
    WHERE i.id NOT IN (
      SELECT DISTINCT ON (user_id, numero) id
      FROM public.invoices
      ORDER BY user_id, numero, created_at, id
    )
    ORDER BY i.user_id, i.created_at, i.id
  LOOP
    SELECT COALESCE(MAX(numero), 0) + 1 INTO v_next FROM public.invoices WHERE user_id = r.user_id;
    UPDATE public.invoices SET numero = v_next WHERE id = r.id;
  END LOOP;
END $$;

-- ── 2. Contraintes d'unicité réelles ─────────────────────────────────────────
ALTER TABLE public.devis
  ADD CONSTRAINT devis_user_id_numero_unique UNIQUE (user_id, numero);

ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_user_id_numero_unique UNIQUE (user_id, numero);

-- ── 3. Compteur next_devis_number (nouveau, même modèle que next_invoice_number) ──
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS next_devis_number integer NOT NULL DEFAULT 1;

-- Recale les deux compteurs sur le vrai maximum désormais sans trou ni doublon
-- (GREATEST : ne fait jamais reculer un compteur déjà correct).
UPDATE public.company_settings cs
SET next_invoice_number = GREATEST(cs.next_invoice_number, COALESCE(sub.max_n, 0) + 1)
FROM (SELECT user_id, MAX(numero) AS max_n FROM public.invoices GROUP BY user_id) sub
WHERE cs.user_id = sub.user_id;

UPDATE public.company_settings cs
SET next_devis_number = GREATEST(cs.next_devis_number, COALESCE(sub.max_n, 0) + 1)
FROM (
  SELECT user_id, MAX(NULLIF(regexp_replace(numero, '^DEV-\d{4}-', ''), '')::int) AS max_n
  FROM public.devis
  WHERE numero ~ '^DEV-\d{4}-\d+$'
  GROUP BY user_id
) sub
WHERE cs.user_id = sub.user_id;

-- ── 4. RPC atomiques, scopées par compte (account_owner()) ──────────────────
CREATE OR REPLACE FUNCTION public.next_invoice_number()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_owner uuid;
  v_next integer;
BEGIN
  v_owner := public.account_owner();

  UPDATE public.company_settings
    SET next_invoice_number = next_invoice_number + 1
    WHERE user_id = v_owner
    RETURNING next_invoice_number - 1 INTO v_next;

  IF v_next IS NULL THEN
    RAISE EXCEPTION 'Aucune ligne company_settings pour ce compte : impossible de générer un numéro de facture.';
  END IF;

  RETURN v_next;
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_invoice_number() TO authenticated;

CREATE OR REPLACE FUNCTION public.next_devis_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_owner uuid;
  v_next integer;
  v_year integer := EXTRACT(YEAR FROM now())::int;
BEGIN
  v_owner := public.account_owner();

  UPDATE public.company_settings
    SET next_devis_number = next_devis_number + 1
    WHERE user_id = v_owner
    RETURNING next_devis_number - 1 INTO v_next;

  IF v_next IS NULL THEN
    RAISE EXCEPTION 'Aucune ligne company_settings pour ce compte : impossible de générer un numéro de devis.';
  END IF;

  RETURN 'DEV-' || v_year || '-' || LPAD(v_next::text, 3, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_devis_number() TO authenticated;
