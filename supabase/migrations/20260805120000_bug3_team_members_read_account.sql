-- Bug audit #3 [CRITIQUE] — sélecteur de technicien vide/cassé pour le
-- personnel de bureau.
--
-- Cause : `useAssignableMembers()` interroge `team_members`, dont la RLS
-- SELECT n'autorisait que `owner_id = auth.uid()` (le patron voit SON équipe)
-- OU `user_id = auth.uid()` (chacun voit SA PROPRE ligne) — jamais "mes
-- collègues". Confirmé en direct (2026-08-05, compte de test
-- audit-qa-20260805@example.com) : authentifié avec le token de bureau1,
-- GET /rest/v1/team_members ne retourne que la ligne de bureau1 lui-même,
-- ni celle de bureau2 ni celles de tech1/tech2/tech3 — donc le sélecteur de
-- technicien est vide à la création d'une intervention, et le nom d'un
-- technicien déjà assigné n'apparaît pas non plus sur une fiche existante.
--
-- Correctif additif : une policy SELECT supplémentaire (les policies RLS
-- Postgres permissives sont OR'd entre elles, rien n'est retiré) autorisant
-- la lecture de toutes les lignes du même compte à tout membre actif de ce
-- compte. `account_owner()` résout déjà exactement "le compte auquel
-- j'appartiens si je suis un employé actif, sinon moi-même (je suis le
-- patron)" — un employé désactivé (active=false) n'est plus reconnu comme
-- membre actif par `account_owner()`, qui retombe sur son propre uid, lequel
-- ne matchera aucun `owner_id` : il perd donc bien l'accès, conformément à
-- "tout membre ACTIF de ce compte" demandé par l'audit.
--
-- Écriture (INSERT/UPDATE/DELETE) INCHANGÉE : reste strictement couverte par
-- la policy existante "team members owner manage" (owner_id = auth.uid()),
-- donc toujours owner-only. Cette migration ne touche à aucune policy
-- d'écriture.
CREATE POLICY "team members read account" ON public.team_members
  FOR SELECT
  USING (owner_id = public.account_owner());
