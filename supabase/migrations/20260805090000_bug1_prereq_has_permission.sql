-- Prérequis du correctif Bug audit #1 — versionner `public.has_permission(text)`.
--
-- ─── Pourquoi ce fichier existe ──────────────────────────────────────────────
-- `has_permission(p_key text)` EXISTE et FONCTIONNE dans la base de production
-- mais n'était définie dans AUCUNE migration versionnée, ni présente dans
-- `schema.sql` : c'est de la dérive "SQL Editor" (fonction créée à la main
-- dans l'interface Supabase, jamais redescendue dans le dépôt). Conséquence :
-- la migration `20260805100000_bug1_permission_gated_rls.sql` s'appuie sur une
-- fonction qui n'existe nulle part dans le code versionné — toute
-- reconstruction de la base à partir des migrations échouerait.
-- (Même classe de problème que le `dashboard_money_stats` manquant documenté
-- dans CLAUDE.md.)
--
-- ─── Définition ───────────────────────────────────────────────────────────
-- Récupérée le 2026-08-06 via `SELECT pg_get_functiondef(...)` sur le projet
-- Supabase (MCP), reproduite ici à l'identique. `CREATE OR REPLACE` est donc
-- sûr : soit la fonction vivante est remplacée par elle-même (no-op), soit
-- elle est créée à neuf sur une base reconstruite depuis les migrations.

CREATE OR REPLACE FUNCTION public.has_permission(p_key text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select case
    when public.current_user_role() = 'owner' then true
    else coalesce(
      (select (tm.permissions ->> p_key)::boolean
         from team_members tm
        where tm.user_id = auth.uid()
          and tm.active = true
        limit 1),
      false)
  end;
$function$;
