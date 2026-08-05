-- Prérequis du correctif Bug audit #1 — versionner `public.has_permission(text)`.
--
-- ─── Pourquoi ce fichier existe ──────────────────────────────────────────────
-- `has_permission(p_key text)` EXISTE et FONCTIONNE dans la base de production
-- (vérifié le 2026-08-05 : elle est visible dans l'OpenAPI PostgREST et déjà
-- câblée sur la policy RLS de `devis`, dont le filtrage par permission a été
-- confirmé correct en direct avec deux tokens employés distincts).
--
-- MAIS elle n'est définie dans AUCUNE migration versionnée, ni présente dans
-- `schema.sql` : c'est de la dérive "SQL Editor" (fonction créée à la main
-- dans l'interface Supabase, jamais redescendue dans le dépôt). Conséquence :
-- la migration `20260805100000_bug1_permission_gated_rls.sql` s'appuie sur une
-- fonction qui n'existe nulle part dans le code versionné — toute
-- reconstruction de la base à partir des migrations échouerait.
-- (Même classe de problème que le `dashboard_money_stats` manquant documenté
-- dans CLAUDE.md.)
--
-- ─── Pourquoi une création CONDITIONNELLE et pas un CREATE OR REPLACE ────────
-- La définition exacte de la fonction vivante n'a pas pu être lue depuis cet
-- environnement (pas de CLI Supabase lié, pas d'accès Postgres direct : la clé
-- service-role donne l'API REST, pas le catalogue système). Le corps ci-dessous
-- est donc une RECONSTRUCTION calquée sur les conventions maison
-- (`account_owner()` / `current_user_role()`, cf. schema.sql) et sur le
-- comportement observé empiriquement :
--   - owner                        -> true quelle que soit la clé
--   - employé bureau               -> true seulement si la case est cochée
--                                     (team_members.permissions ->> clé)
--   - technicien (permissions={})  -> false (vérifié pour la clé 'stock')
--   - employé désactivé            -> false
--
-- Un `CREATE OR REPLACE` écraserait la fonction vivante par cette
-- reconstruction. Sur une frontière de sécurité, un écart même subtil serait
-- une faille : on ne remplace donc RIEN. Ce bloc ne crée la fonction QUE si
-- elle est absente.
--   -> Base actuelle (fonction présente) : NO-OP total, aucun risque.
--   -> Base reconstruite à neuf          : la fonction est créée, les policies
--                                          du bug #1 deviennent applicables.
--
-- ─── À FAIRE pour lever la réserve définitivement ────────────────────────────
-- Exécuter dans Supabase SQL Editor :
--     SELECT pg_get_functiondef('public.has_permission(text)'::regprocedure);
-- puis remplacer le corps ci-dessous par la définition retournée, à
-- l'identique, et transformer ce bloc en simple CREATE OR REPLACE. Tant que ce
-- n'est pas fait, considérer ce fichier comme un filet de sécurité pour la
-- reconstruction, pas comme la source de vérité.

DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'has_permission'
      AND pg_get_function_identity_arguments(p.oid) = 'text'
  ) THEN
    RAISE NOTICE 'has_permission(text) absente : création depuis la définition versionnée.';

    EXECUTE $fn$
      CREATE FUNCTION public.has_permission(p_key text) RETURNS boolean
          LANGUAGE sql STABLE SECURITY DEFINER
          SET search_path TO 'public'
          AS $body$
        SELECT COALESCE(
          (SELECT CASE
                    WHEN NOT active         THEN false
                    WHEN role = 'owner'     THEN true
                    ELSE COALESCE((permissions ->> p_key)::boolean, false)
                  END
             FROM public.team_members
             WHERE user_id = auth.uid()
             ORDER BY active DESC
             LIMIT 1),
          -- Aucune ligne team_members = compte sans équipe : l'utilisateur est
          -- son propre patron (même repli que current_user_role(), qui renvoie
          -- 'owner' dans ce cas).
          true
        );
      $body$;
    $fn$;

    EXECUTE 'ALTER FUNCTION public.has_permission(text) OWNER TO postgres';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.has_permission(text) TO authenticated';
  ELSE
    RAISE NOTICE 'has_permission(text) déjà présente : conservée telle quelle (aucune modification).';
  END IF;
END
$do$;
