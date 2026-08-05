-- Bug audit #1 [CRITIQUE] — permissions cochables dans "Équipe" purement
-- cosmétiques : la RLS ne filtrait que par compte (account_owner()), jamais
-- par team_members.permissions. Un employé bureau sans une case cochée
-- pouvait lire (et souvent écrire) la donnée correspondante en appelant
-- directement l'API REST Supabase avec son propre token.
--
-- ─── Vérification en base avant correction (2026-08-05) ──────────────────────
-- Compte de test : audit-qa-20260805@example.com (owner) + bureau1 (permission
-- "devis" cochée, pas "tresorerie"/"stock") + bureau2 (permission "tresorerie"
-- cochée, pas "devis"). Tokens obtenus via /auth/v1/token (mot de passe reset
-- via la clé service-role, compte de test dédié). Vérité terrain lue avec la
-- clé service-role (bypass RLS).
--
--   - has_permission(p_key text) EXISTE DÉJÀ en base (RPC SECURITY DEFINER,
--     visible dans l'OpenAPI PostgREST : /rpc/has_permission) et est DÉJÀ
--     câblée sur la policy RLS de `devis` — jamais committée dans une
--     migration (dérive SQL Editor non versionnée, cf. CLAUDE.md). Comportement
--     confirmé correct par appel direct : bureau1 (devis=true) reçoit les 3
--     devis du compte sur GET /rest/v1/devis ; bureau2 (devis absent des
--     permissions => false) reçoit []. owner: has_permission(...) = true quel
--     que soit p_key. Ce fichier NE TOUCHE PAS à `devis`/`devis_lines` : c'est
--     déjà le comportement cible, il n'y a rien à corriger là.
--   - invoices : AUCUN filtrage confirmé — bureau1 (sans "factures" ni
--     "tresorerie") et bureau2 (avec "tresorerie") reçoivent EXACTEMENT les
--     mêmes lignes sur GET /rest/v1/invoices. Bug réel.
--   - stock_products : bureau1 (sans "stock") lit le catalogue complet. Bug
--     réel côté lecture, mais lecture laissée volontairement ouverte ici (voir
--     plus bas) — seule l'écriture est gatée.
--   - company_settings : bureau1 (sans "parametres") lit nom/IBAN/BIC/
--     next_invoice_number en entier. L'écriture, elle, est DÉJÀ bloquée par la
--     RLS existante ("settings update owner", owner-only) — confirmé par un
--     PATCH bureau1 qui retourne 0 ligne modifiée sans erreur (c'est le bug
--     #4, traité dans une autre migration/commit, purement frontend).
--
-- ─── Décisions de portée ──────────────────────────────────────────────────────
-- 1) `devis`/`devis_lines` : non touchées (déjà correctes, cf. ci-dessus).
-- 2) `invoices`/`invoice_lines` : gate complète (lecture + écriture). Aucun
--    technicien ne touche jamais à la facturation (règle structurelle
--    CLAUDE.md : le chantier technicien n'a "AUCUN bouton facturation"), donc
--    aucun risque de régression côté terrain. La table est lue par DEUX pages
--    bureau distinctes (`_app.factures.*` -> perm "factures", `_app.tresorerie.tsx`
--    -> perm "tresorerie", + le widget "impayées" du dashboard, déjà masqué
--    côté front par can("factures") depuis la Phase 6-A) : la policy autorise
--    donc factures OU tresorerie, pas une seule des deux.
-- 3) `stock_requests` : gate + dérogation technicien. Un technicien doit
--    toujours pouvoir créer/lire SES PROPRES demandes de réappro sans aucune
--    permission bureau (comportement documenté et voulu, CLAUDE.md Phase 6-B :
--    "un technicien à court de stock demande depuis Mon camion, toujours
--    possible, sans permission requise"). Seul le TRAITEMENT de toutes les
--    demandes du compte (page /reappro) reste gaté par "reappro".
-- 4) `stock_products` : gate ÉCRITURE SEULE (INSERT/UPDATE/DELETE). La lecture
--    reste ouverte à tout le compte : `stock_products` est le catalogue
--    (nom/unité/prix/seuil) consulté par les TECHNICIENS pour leur camion
--    (`tech.camion.tsx`) — vérifié empiriquement que has_permission('stock')
--    renvoie `false` pour un technicien (permissions={} par construction, ils
--    ne sont pas soumis au système de permissions bureau). Gater la lecture
--    casserait leur outil de terrain. Seule la gestion du catalogue (ajout/
--    édition/suppression de produits, fait uniquement par owner/bureau via
--    `_app.stock.index.tsx`) est désormais restreinte à "stock".
-- 5) `company_settings` : NON restreinte ici, voir bilan de session — question
--    ouverte pour l'utilisateur (restreindre la lecture casserait des usages
--    légitimes cross-permission : app-shell/tech-shell affichent le nom de la
--    société, les 3 générateurs de PDF (devis/factures/contrats) lisent IBAN/
--    SIRET/logo pour n'importe quel employé autorisé à créer CE document,
--    indépendamment de la permission "Paramètres"). L'écriture est déjà
--    owner-only par la RLS existante, rien à faire ici.
-- 6) Périmètre volontairement NON élargi à clients/contracts/interventions/
--    service_presets/stock_levels/stock_movements/produits_biocides/relances :
--    `interventions` n'a même pas de clé de permission dédiée dans
--    PermissionKey, et stock_levels/stock_movements sont écrits en direct par
--    les techniciens (consommation/transfert sur leur camion) — les gater par
--    "stock" casserait leur flux terrain exactement comme pour stock_products.
--    Chaque table nécessiterait une vérification au cas par cas des accès
--    techniciens croisés avant d'être étendue en toute sécurité. Laissé en
--    suivi (voir bilan de session), pas fait à l'aveugle ici.

-- ── invoices ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "account members full access" ON public.invoices;

CREATE POLICY "account members full access" ON public.invoices
  FOR ALL
  USING (
    user_id = public.account_owner()
    AND (public.has_permission('factures') OR public.has_permission('tresorerie'))
  )
  WITH CHECK (
    user_id = public.account_owner()
    AND (public.has_permission('factures') OR public.has_permission('tresorerie'))
  );

-- ── invoice_lines ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "account members full access" ON public.invoice_lines;

CREATE POLICY "account members full access" ON public.invoice_lines
  FOR ALL
  USING (
    user_id = public.account_owner()
    AND (public.has_permission('factures') OR public.has_permission('tresorerie'))
  )
  WITH CHECK (
    user_id = public.account_owner()
    AND (public.has_permission('factures') OR public.has_permission('tresorerie'))
  );

-- ── stock_requests ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "account members full access" ON public.stock_requests;

CREATE POLICY "account members full access" ON public.stock_requests
  FOR ALL
  USING (
    user_id = public.account_owner()
    AND (public.has_permission('reappro') OR technicien_id = auth.uid())
  )
  WITH CHECK (
    user_id = public.account_owner()
    AND (public.has_permission('reappro') OR technicien_id = auth.uid())
  );

-- ── stock_products : écriture gatée, lecture inchangée (voir décision 4) ─────
DROP POLICY IF EXISTS "account members full access" ON public.stock_products;
DROP POLICY IF EXISTS "Users manage their own stock products" ON public.stock_products;

CREATE POLICY "account members read" ON public.stock_products
  FOR SELECT
  USING (user_id = public.account_owner());

CREATE POLICY "account members insert" ON public.stock_products
  FOR INSERT
  WITH CHECK (user_id = public.account_owner() AND public.has_permission('stock'));

CREATE POLICY "account members update" ON public.stock_products
  FOR UPDATE
  USING (user_id = public.account_owner() AND public.has_permission('stock'))
  WITH CHECK (user_id = public.account_owner() AND public.has_permission('stock'));

CREATE POLICY "account members delete" ON public.stock_products
  FOR DELETE
  USING (user_id = public.account_owner() AND public.has_permission('stock'));
