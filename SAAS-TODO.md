# SAAS-TODO.md — État des lieux avant transformation en SaaS multi-sociétés

Ce fichier liste ce qui doit être généralisé/corrigé pour transformer `city-derat-pro` (outil mono-société) en SaaS pour plusieurs sociétés de dératisation. **Aucun code n'a été modifié** — repérage uniquement.

---

## 1. Valeurs codées en dur à généraliser

### 1.a `EMPLOYEE_EMAIL_DOMAIN` — bloquant pour le multi-tenant

- [src/lib/team.ts:1](src/lib/team.ts#L1) : `export const EMPLOYEE_EMAIL_DOMAIN = "team.cityderat.local";`
  Utilisé par `usernameToEmail()` ([src/lib/team.ts:9](src/lib/team.ts#L9)) pour transformer un identifiant employé en email interne Supabase (`identifiant@team.cityderat.local`).
  **Problème SaaS** : ce domaine est global à toute l'app. Deux sociétés clientes différentes ne pourront pas avoir chacune un employé « jean » (collision d'email dans `auth.users`, qui est unique globalement tous comptes confondus). Il faudra namespacer par société (ex. `identifiant@<slug-societe>.team.local`), ce qui implique de stocker un `slug`/identifiant de société quelque part (nouvelle table `companies` ou équivalent) et de le résoudre à l'écran de connexion.

### 1.b « CITY DERAT » codé en dur (titres de pages, fallback UI)

Présent dans **~40 emplacements**, principalement des titres d'onglet (`head: () => ({ meta: [{ title: "... — CITY DERAT" }] })`) et des fallbacks d'affichage (`s?.nom ?? "CITY DERAT"`) quand `company_settings.nom` n'est pas encore renseigné. Fichiers concernés :

- [src/routes/__root.tsx:68-69](src/routes/__root.tsx#L68) — meta `apple-mobile-web-app-title` + titre par défaut du site
- [src/routes/auth.tsx:14](src/routes/auth.tsx#L14) et [:67](src/routes/auth.tsx#L67) — titre onglet + titre affiché sur l'écran de connexion
- [src/components/app-shell.tsx:416](src/components/app-shell.tsx#L416) — fallback nom société dans la nav admin
- [src/components/tech-shell.tsx:46](src/components/tech-shell.tsx#L46) — fallback nom société dans la nav technicien
- [src/routes/_app.parametres.tsx:358](src/routes/_app.parametres.tsx#L358) et [:364](src/routes/_app.parametres.tsx#L364) — valeur par défaut du formulaire Paramètres (`nom: "CITY DERAT"`)
- [src/routes/_app.parametres.tsx:347](src/routes/_app.parametres.tsx#L347) — nom du fichier export Excel (`city-derat-sauvegarde-${date}.xlsx`)
- Tous les `head()` de titres de route : `_app.clients.*`, `_app.contrats.*`, `_app.devis.*`, `_app.equipe.index.tsx`, `_app.factures.*`, `_app.index.tsx`, `_app.interventions.*`, `_app.parametres.tsx`, `_app.programmation.index.tsx`, `_app.reappro.index.tsx`, `_app.stats.tsx`, `_app.stock.index.tsx`, `_app.tresorerie.tsx`, `tech.index.tsx`, `tech.camion.tsx`, `tech.chantiers.index.tsx`, `tech.chantiers.$id.tsx`
- Fallbacks `s?.nom ?? "CITY DERAT"` dans les générateurs de documents : [_app.contrats.$id.tsx:119](src/routes/_app.contrats.$id.tsx#L119),[:211](src/routes/_app.contrats.$id.tsx#L211) ; [_app.devis.$id.tsx:373](src/routes/_app.devis.$id.tsx#L373),[:423](src/routes/_app.devis.$id.tsx#L423) ; [_app.factures.$id.tsx:405](src/routes/_app.factures.$id.tsx#L405),[:471](src/routes/_app.factures.$id.tsx#L471),[:487](src/routes/_app.factures.$id.tsx#L487),[:543](src/routes/_app.factures.$id.tsx#L543) ; [_app.interventions.$id.tsx:440](src/routes/_app.interventions.$id.tsx#L440),[:489](src/routes/_app.interventions.$id.tsx#L489),[:493](src/routes/_app.interventions.$id.tsx#L493),[:579](src/routes/_app.interventions.$id.tsx#L579),[:611](src/routes/_app.interventions.$id.tsx#L611),[:678](src/routes/_app.interventions.$id.tsx#L678),[:699](src/routes/_app.interventions.$id.tsx#L699)

**Note** : ces fallbacks ne posent pas de risque fonctionnel immédiat (ils ne s'affichent que si `company_settings.nom` est vide), mais pour un SaaS il faut décider d'un comportement neutre (ex. « Votre société », ou nom de l'app SaaS elle-même) plutôt que le nom du client historique.

### 1.c SIRET codé en dur en fallback

- [src/routes/_app.devis.$id.tsx:379](src/routes/_app.devis.$id.tsx#L379) et [:423](src/routes/_app.devis.$id.tsx#L423)
- [src/routes/_app.factures.$id.tsx:411](src/routes/_app.factures.$id.tsx#L411)
- [src/routes/_app.interventions.$id.tsx:442](src/routes/_app.interventions.$id.tsx#L442)

Tous utilisent `s?.siret ?? "88268913600019"` — le SIRET de CITY DERAT en dur comme valeur de repli sur les PDF (devis, facture, certificat biocide). **À corriger avant toute autre société** : un client verrait le SIRET d'un tiers sur ses documents légaux si `company_settings.siret` n'est pas encore rempli.

### 1.d Couleurs de marque

`CLAUDE.md` documente `#1a3c2e` (vert) et `#f97316` (orange devis) comme couleurs de marque — à vérifier si elles sont codées en dur dans le CSS/Tailwind config ou déjà pilotables par société (probable qu'elles soient dans la charte Tailwind globale, donc partagées par tous les tenants sauf si on ajoute un thème par société — non vérifié en détail dans ce repérage).

---

## 2. Inscription publique

**Confirmé retirée.** [src/routes/auth.tsx](src/routes/auth.tsx) ne contient qu'un formulaire de connexion (identifiant/email + mot de passe, `supabase.auth.signInWithPassword`) — aucun formulaire d'inscription, aucun appel à `supabase.auth.signUp`.

Pour le SaaS, il faudra réintroduire un flux d'inscription qui, en plus de créer un compte utilisateur, doit :
- créer une nouvelle « société » (compte owner) isolée des autres tenants,
- déclencher l'onboarding (paramètres société minimum : nom, SIRET, etc. — cf. section 1.c, ces champs ne doivent plus avoir de fallback vers une société tierce),
- probablement générer le slug utilisé pour namespacer les emails internes employés (cf. section 1.a).

---

## 3. Pagination — bug critique (troncature silencieuse à 1000 lignes)

Supabase (PostgREST) plafonne à **1000 lignes par requête** par défaut. Sur les **41 appels `.from(...)` recensés** dans [src/lib/queries.ts](src/lib/queries.ts) (1193 lignes), **un seul** utilise `.limit()` :

- [src/lib/queries.ts:584](src/lib/queries.ts#L584) — `useSiteHistory` : `.limit(11)` (intentionnel, borné par design).

Tous les autres hooks qui chargent des listes n'ont **ni `.limit()` ni `.range()`**. Risque réel : au-delà de 1000 lignes, les résultats sont tronqués **sans erreur ni avertissement** — dashboard, stats et exports afficheraient des chiffres faux. Pour une société avec plusieurs années d'historique (interventions, factures, mouvements de stock), ce seuil est atteignable.

Hooks concernés par ordre de risque (tables qui grossissent avec l'activité, donc les plus susceptibles de dépasser 1000 lignes un jour) :

**Risque élevé — tables transactionnelles/historiques, croissance illimitée dans le temps :**
- `useInterventions` — [queries.ts:547](src/lib/queries.ts#L547)
- `useInvoices` — [queries.ts:685](src/lib/queries.ts#L685)
- `useStockMovements` — [queries.ts:338](src/lib/queries.ts#L338)
- `useQuotes` (devis) — [queries.ts:972](src/lib/queries.ts#L972)
- `useRelances` — [queries.ts:144](src/lib/queries.ts#L144)
- `useContracts` — [queries.ts:596](src/lib/queries.ts#L596)
- `useClients` — [queries.ts:524](src/lib/queries.ts#L524)

**Risque moyen — agrégations dashboard/stats construites sur les tables ci-dessus, mêmes limites :**
- `useDashboardStats` — [queries.ts:868-889](src/lib/queries.ts#L868) (plusieurs sous-requêtes non bornées en `Promise.all`)
- `useMonthlyStats` — [queries.ts:1127-1144](src/lib/queries.ts#L1127) (idem)
- `useTechnicianStats` — [queries.ts:1030-1054](src/lib/queries.ts#L1030)
- `useProductStats` — [queries.ts:489-496](src/lib/queries.ts#L489)

**Risque faible — tables catalogue/référentiel, bornées par la taille de l'équipe ou du catalogue produit (peu susceptibles de dépasser 1000 lignes en pratique, mais toujours sans garde-fou) :**
- `useProduitsBiocides` — [queries.ts:177](src/lib/queries.ts#L177)
- `useStockProducts` — [queries.ts:240](src/lib/queries.ts#L240)
- `useStockLevels` — [queries.ts:268](src/lib/queries.ts#L268)
- `useTeamMembers` — [queries.ts:751](src/lib/queries.ts#L751)
- `usePresets` (service_presets) — [queries.ts:860](src/lib/queries.ts#L860)
- `useStockRequests` — [queries.ts:424](src/lib/queries.ts#L424)

**À corriger** : pagination réelle (`.range()` avec curseur/offset ou scroll infini) sur les listes admin (clients, interventions, factures, devis, mouvements de stock), et a minima des `.limit()` explicites + alertes si le plafond est atteint sur les agrégations de stats.

---

## 4. Sécurité — permissions appliquées côté interface uniquement

Confirmé par lecture de [schema.sql](schema.sql) : la RLS des tables de données (`clients, contracts, interventions, invoices, invoice_lines, service_presets, stock_products, stock_levels, stock_movements, stock_requests, devis, devis_lines, relances, produits_biocides`) suit le même modèle partout :

```sql
CREATE POLICY "account members full access" ON "public"."clients"
  USING (("user_id" = "public"."account_owner"()))
  WITH CHECK (("user_id" = "public"."account_owner"()));
```

Autrement dit : **tout membre authentifié d'un compte (owner, bureau, technicien) a un accès complet en lecture/écriture à toutes les données du compte au niveau base de données**, quelles que soient ses permissions applicatives. Le système de permissions par module ([src/lib/permissions.ts](src/lib/permissions.ts), `PermissionKey`/`PERMISSION_LABELS`, `useMyAccess().can(...)`, `PermissionGate`) et la séparation d'interface technicien/admin ne sont que des **garde-fous côté client** : ils cachent des pages/boutons et filtrent des vues, mais un membre techniquement capable d'appeler l'API Supabase directement (devtools, requête HTTP manuelle avec son propre token) peut lire/modifier n'importe quelle donnée du compte, y compris hors de son périmètre de permissions coché.

Ce modèle était acceptable pour une société unique où patron et employés sont dans la même structure de confiance. **Pour un SaaS avec des permissions vendues/différenciées par rôle, il faudra durcir la RLS** pour refléter au niveau base les mêmes restrictions que l'UI (ex. policies conditionnées sur `poste`/`permissions` en plus de `account_owner()`), plutôt que de compter uniquement sur le masquage d'interface.

`company_settings` a une RLS légèrement plus fine (lecture pour tout le compte, écriture owner uniquement) mais suit le même principe de base large.

---

## 5. Autres points relevés en passant (hors périmètre demandé, à garder en tête)

- Le trigger `handle_new_user` (fonction dumpée dans `schema.sql`) est attaché à `auth.users`, une table du schéma `auth` — **il n'apparaît pas dans `schema.sql`** puisque le dump est scopé à `--schema public`. Le corps de la fonction est bien présent, mais le `CREATE TRIGGER ... ON auth.users ...` qui l'attache devra être recréé à la main dans le nouveau projet (voir section schema.sql du résumé final).
- `src/integrations/supabase/types.ts` est géré à la main (pas de génération automatique) — à ne pas oublier de le régénérer/adapter pour tout nouveau champ multi-tenant (ex. `companies.id`, `company_id` sur les tables si le modèle `account_owner()` est remplacé par un modèle multi-société explicite).
