# Audit — Fondation commerciale et administration SaaS

- Date de l'audit : 31 juillet 2026
- Branche locale : `feat/saas-platform-foundation`
- Base de départ : `origin/main` au commit `7a445d1`

## Périmètre et état de départ

L'audit a été réalisé sans modifier l'application métier, sans appliquer de
migration, sans utiliser de clé OpenAI, sans push GitHub et sans déploiement.
La branche `feat/ai-assistant-readonly` reste séparée et intacte dans son
worktree d'origine.

Le projet est une application TanStack Start avec React, TanStack Router,
Supabase et une cible Netlify. Le port de développement est `4321`. Le dépôt ne
contient actuellement aucun framework de tests automatisés ni script `test`.

## Ce qui existe déjà et doit être conservé

### Routes actuelles

Les routes sont enregistrées dans un arbre maintenu manuellement :

- `/auth` : connexion et création directe d'un compte propriétaire ;
- `/` : Dashboard protégé de l'application cliente ;
- `/onboarding` : configuration initiale de la société ;
- `/clients`, `/clients/new`, `/clients/$id` ;
- `/interventions`, `/interventions/new`, `/interventions/$id` ;
- `/planning` ;
- `/factures`, `/factures/new`, `/factures/$id` ;
- `/devis`, `/devis/new`, `/devis/$id` ;
- `/contrats`, `/contrats/$id` ;
- `/stock` ;
- `/reappro` ;
- `/programmation` ;
- `/tresorerie` ;
- `/stats` ;
- `/equipe` ;
- `/parametres` ;
- `/tech`, `/tech/chantiers`, `/tech/chantiers/$id`, `/tech/camion`.

Le layout pathless `_app` protège l'espace administratif client. Le layout
`tech` protège l'espace technicien et redirige les non-techniciens vers
l'application administrative.

### Authentification actuelle

- Supabase Auth est l'unique système d'authentification.
- La connexion accepte un email ou un identifiant employé transformé en email
  interne `identifiant@team.app.local`.
- La page `/auth` permet aussi une inscription libre par email et mot de passe.
- Une inscription réussie donne actuellement accès à l'onboarding, sans
  validation manuelle de la plateforme.
- `handle_new_user()` crée automatiquement `company_settings` et des
  `service_presets` pour chaque nouvel utilisateur Auth.
- Les employés sont créés côté serveur avec le client `service_role`, après une
  vérification du rôle `owner`.
- Aucun rôle `platform_admin` et aucun statut commercial de société n'existent.

Il faut conserver Supabase Auth et supprimer le contournement que représente
l'inscription libre. Il ne faut pas créer un second système de mots de passe.

### Multi-tenant, rôles et permissions

L'identité d'une entreprise cliente est aujourd'hui l'UUID Auth de son
propriétaire, et non une ligne d'une table `companies`.

- `account_owner()` retourne l'UUID du propriétaire du compte.
- `current_user_role()` retourne `owner`, `employe` ou `disabled`.
- `team_members` rattache les employés à `owner_id`.
- Les tables métier portent un `user_id` égal à l'UUID du propriétaire.
- Les politiques RLS principales isolent les comptes avec
  `user_id = account_owner()`.
- `company_settings` est lisible par le compte, mais modifiable par le
  propriétaire.
- Les permissions par module sont principalement appliquées dans l'interface.
  Elles ne constituent pas, à elles seules, une autorisation serveur.

Cette architecture peut être conservée pour la fondation commerciale : une
table de contrôle de plateforme peut référencer `owner_id`, sans migrer toutes
les données vers un nouveau `company_id`.

### Routes et fonctions protégées

Les layouts `_app.tsx` et `tech.tsx` vérifient la session et le rôle dans le
navigateur. Les accès directs aux données passent majoritairement par le client
Supabase et dépendent donc de la RLS.

Les fonctions serveur utilisent :

- `attachSupabaseAuth` pour transmettre le bearer token ;
- `requireSupabaseAuth` pour vérifier le token et exposer `userId` ;
- un import dynamique de `client.server.ts` pour les opérations
  `service_role`.

Ce pattern doit être réutilisé pour l'administration de plateforme. Une simple
redirection ou un menu caché ne suffit pas : le statut actif doit également
être imposé dans la RLS et dans les fonctions serveur privilégiées.

## Fidélité visuelle exigée pour le site public

Les aperçus marketing devront être des composants décoratifs statiques. Ils ne
devront appeler ni Supabase ni les hooks métier et ne devront contenir aucune
donnée cliente.

### Menu administratif réel

Ordre lu dans `src/components/app-shell.tsx` :

1. Accueil
2. Clients
3. Terrain
4. Factures
5. Stock
6. Devis
7. Trésorerie
8. Contrats
9. Réappro
10. À programmer
11. Statistiques
12. Paramètres
13. Équipe, lorsque la permission existe

Sur mobile, les accès directs sont Accueil, Clients, Terrain et Stock. Le menu
Plus commence par Factures, puis reprend les entrées secondaires autorisées.

### Navigation technicien réelle

Ordre lu dans `src/components/tech-shell.tsx` :

1. Ma journée
2. Mes chantiers
3. Mon camion

Cette navigation reste une barre inférieure, y compris sur grand écran.
L'espace technicien n'a pas de sidebar.

### Structure réelle du Dashboard

L'aperçu public devra reprendre la hiérarchie existante :

- salutation et date ;
- chiffre d'affaires mensuel et progression vers l'objectif sur ordinateur ;
- interventions du jour, rapports à vérifier et impayés ;
- prochaines interventions ;
- actions rapides ;
- alertes de factures, devis, contrats, stock, réapprovisionnement et passages
  à programmer lorsque ces données existent.

Les valeurs montrées sur le site public seront explicitement décoratives,
neutres et sans identité de client.

### Couleurs et composants

La charte actuelle repose sur :

- un vert profond pour le primaire et le header, avec le gradient
  `#1a3c2e` vers `#0f2a1e` ;
- un orange d'accent, notamment `#e8800a` dans le bouton d'action flottant ;
- des fonds vert très pâle, cartes blanches, rayons proches de `1rem` et
  ombres légères ;
- les composants `Header`, `Sidebar`, `BottomNav`, cartes, boutons, champs et
  statuts déjà présents.

Le site public pourra réutiliser les tokens CSS et les composants de base, mais
il devra avoir son propre layout sans sidebar ni requête privée.

## Routes à ajouter ou à adapter

Architecture recommandée, sous réserve de l'enregistrement dans l'arbre de
routes :

- `/` : site marketing public ;
- `/connexion` : connexion, avec conservation de `/auth` comme redirection de
  compatibilité ;
- `/demande-acces` : formulaire public ;
- `/demande-en-attente` : confirmation générique d'une demande ;
- `/acces-refuse` : information pour une demande ou un compte refusé ;
- `/acces-suspendu` : information pour un compte suspendu ;
- `/app` : Dashboard protégé, si l'on accepte de déplacer l'URL actuelle ;
- routes métier sous leur URL actuelle, si le layout pathless peut rester
  protégé sans occuper `/` ;
- `/platform` : tableau de bord du platform admin ;
- `/platform/demandes` : demandes d'accès ;
- `/platform/entreprises` : entreprises clientes ;
- `/tech/*` : inchangées.

Le conflit actuel est que `/` est déjà l'index enfant de `_app`. Pour donner
`/` au site public sans casser les URL métier, l'option la moins disruptive est
de retirer uniquement le Dashboard de `/` et de lui donner `/app`, puis
d'adapter les liens « Accueil » et les redirections. Les autres URL métier
peuvent rester inchangées sous le layout pathless `_app`.

## Données nécessaires

### Modèle recommandé

#### `platform_access_requests`

Demande publique avant création d'un compte :

- `id` UUID ;
- `company_name` ;
- `manager_first_name` ;
- `manager_last_name` ;
- `professional_email` et une version normalisée unique pour les demandes
  encore ouvertes ;
- `phone` ;
- `technician_count` ;
- `city_or_region` ;
- `message` facultatif ;
- version et date d'acceptation des règles nécessaires ;
- `status` : `pending`, `active`, `rejected`, `cancelled` ;
- dates de création, mise à jour et décision ;
- administrateur ayant décidé ;
- raison de refus ou d'annulation, facultative ;
- données techniques minimales de limitation, stockées sous forme hachée
  lorsque possible.

La table ne doit pas accepter d'insert anonyme direct. Le formulaire doit
appeler une fonction serveur qui valide les données, applique la limitation et
utilise le client serveur.

#### `platform_accounts`

Contrôle d'une entreprise ayant un compte :

- `owner_id` UUID, clé primaire et référence vers `auth.users` ;
- `request_id` facultatif ;
- `status` : `active`, `suspended`, `cancelled` ;
- dates d'activation, suspension et annulation ;
- raison actuelle facultative ;
- administrateur à l'origine de la dernière décision ;
- dates de création et mise à jour.

Le statut `pending` reste sur la demande tant qu'aucun compte Auth n'a été
créé. Cela évite de créer des tenants, presets et mots de passe pour des
demandes non validées.

#### `platform_admins`

- `user_id` UUID, clé primaire vers `auth.users` ;
- `created_at` ;
- `created_by` facultatif pour les administrateurs ajoutés ensuite ;
- `active`.

Cette table est séparée de `team_members`. Un propriétaire client ne peut pas
s'y ajouter via l'interface ou la RLS.

#### `platform_access_events`

Journal immuable :

- `id` UUID ;
- cible demande et/ou compte ;
- `actor_user_id` ;
- action ;
- ancienne valeur ;
- nouvelle valeur ;
- raison ;
- date.

Toutes les acceptations, refus, suspensions et réactivations doivent être
exécutées côté serveur dans une transaction ou un RPC atomique qui écrit
également cet événement.

### Flux recommandé

1. Le visiteur soumet une demande sans créer de mot de passe.
2. Une confirmation générique est affichée ; elle ne révèle pas si un email
   existe déjà.
3. Le platform admin accepte ou refuse la demande.
4. En cas d'acceptation, le serveur crée ou invite le propriétaire via
   Supabase Auth, puis crée `platform_accounts` avec le statut `active`.
5. Le propriétaire définit son mot de passe par le flux Supabase, se connecte
   et termine l'onboarding existant.
6. Il crée ensuite ses employés avec les fonctions existantes.
7. Une suspension conserve les données mais bloque le propriétaire et toute
   son équipe au niveau RLS et serveur.

Ce flux réutilise Supabase Auth, n'expose aucun mot de passe à l'administration
de plateforme et évite les comptes en attente inutiles.

## Migrations nécessaires

Une migration future devra :

1. créer les quatre tables de plateforme et leurs contraintes ;
2. activer la RLS et refuser tout accès direct anonyme ;
3. ajouter des fonctions SQL de lecture du rôle plateforme et du statut du
   compte courant ;
4. ajouter le statut `active` aux politiques RLS de toutes les tables métier ;
5. couvrir aussi `devis`, `devis_lines`, `relances` et
   `produits_biocides`, dont les politiques visibles dans `schema.sql`
   utilisent encore `auth.uid() = user_id` plutôt que `account_owner()` ;
6. vérifier et renforcer les politiques des buckets
   `company-logos`, `intervention-photos` et
   `intervention-signatures` ;
7. ajouter les RPC atomiques de décision et de journalisation ;
8. supprimer l'inscription publique directe ou la rendre inaccessible ;
9. adapter les types Supabase locaux après validation du schéma réel.

Aucune migration n'a été créée à ce stade, car le dépôt ne contient qu'une
migration historique de `stock_products`. `schema.sql` est plus complet, mais
ne prouve pas à lui seul l'état exact de la base distante.

## Création sécurisée du premier `platform_admin`

Le premier administrateur doit être créé hors du frontend :

1. créer un utilisateur Auth avec son email réel via le Dashboard Supabase ou
   une invitation sécurisée ;
2. vérifier l'email et récupérer exactement son UUID Auth ;
3. dans le SQL Editor du bon projet, exécuter une transaction ponctuelle qui
   recherche cet utilisateur par email, exige exactement une ligne et insère
   son UUID dans `platform_admins` ;
4. ne conserver ni email personnel, ni UUID, ni mot de passe dans le dépôt ;
5. vérifier la ligne puis supprimer le script ponctuel de l'historique local.

La migration peut créer la table et les protections, mais elle ne doit
contenir aucun identifiant inventé. Le bootstrap effectif restera une
opération manuelle validée par l'utilisateur.

## Protections applicatives à ajouter après validation

- résolution centralisée de la destination après connexion :
  platform admin, client actif, demande en attente, refus, suspension ;
- garde de route pour `_app`, `tech` et `platform` ;
- vérification serveur `platform_admin` avant chaque opération de plateforme ;
- vérification serveur du statut actif dans les fonctions de gestion d'équipe ;
- RLS imposant le statut actif à toutes les requêtes métier directes ;
- confirmations explicites avant accepter, refuser, suspendre ou réactiver ;
- refus d'une action si la cible a changé depuis son affichage ;
- validation Zod des formulaires et raisons ;
- protection des doubles demandes par email normalisé ;
- limitation glissante par email et empreinte réseau hachée ;
- messages publics non énumérables ;
- journal d'audit non modifiable depuis le navigateur ;
- aucune donnée Supabase dans les aperçus marketing.

## Risques de sécurité identifiés

1. **Inscription libre actuelle** : elle contourne toute validation manuelle.
2. **Contrôles de route côté client** : ils ne bloquent pas un appel direct.
3. **Absence de statut commercial en RLS** : un compte suspendu conserverait
   aujourd'hui l'accès direct avec son token.
4. **Politiques incohérentes** : plusieurs tables utilisent encore
   `auth.uid() = user_id`, ce qui peut empêcher le partage patron-employé ou
   produire une protection différente des autres tables.
5. **Permissions de modules surtout visuelles** : un employé peut potentiellement
   appeler directement des tables de son entreprise hors de ses permissions.
6. **Client `service_role`** : toute fonction de plateforme doit vérifier
   explicitement le platform admin avant son import et avant toute mutation.
7. **Trigger de création** : chaque utilisateur Auth reçoit actuellement des
   lignes de tenant, y compris un futur platform admin.
8. **Collision des identifiants employés** : `identifiant@team.app.local` est
   global ; deux entreprises ne peuvent pas utiliser le même identifiant.
9. **Schéma distant non démontré** : le dépôt ne versionne pas toutes les
   migrations ayant produit `schema.sql`.
10. **Configuration Supabase contradictoire** : `CLAUDE.md` désigne le projet
    `ysmkhdwjvlgmduipuaqs`, alors que `supabase/config.toml` contient encore
    `dawwepdqqzrdyyadhmtw`, identifié comme l'ancien projet client.

Les points 5 et 8 préexistent et dépassent la seule interface commerciale,
mais ils sont importants avant une commercialisation.

## Décisions déjà prises dans cet audit

- conserver Supabase Auth comme unique gestionnaire des mots de passe ;
- conserver le modèle de tenant fondé sur `owner_id` pour limiter la migration ;
- utiliser une demande sans compte Auth avant validation ;
- créer un rôle plateforme séparé de `owner` et `team_members` ;
- effectuer toutes les décisions de plateforme côté serveur et les journaliser ;
- n'utiliser que des aperçus statiques fidèles aux composants réels sur le site
  public ;
- conserver toutes les routes `/tech` et leur navigation réelle ;
- ne pas appliquer de migration depuis Codex.

## Décisions nécessitant une confirmation

### 1. Modification de `src/routeTree.gen.ts` — bloquante

`CLAUDE.md` confirme que ce fichier est maintenu manuellement et que toute
nouvelle route doit y être ajoutée. Le cahier des charges interdit pourtant sa
modification. Sans exception explicite, il est techniquement impossible
d'enregistrer le site public, `/connexion`, les pages de statut et
`/platform/*`.

### 2. Nouvelle URL du Dashboard

Pour libérer `/`, l'option recommandée est `/app`. Les autres routes métier
resteraient inchangées. Une redirection de `/auth` vers `/connexion` préserverait
les anciens favoris.

### 3. Projet Supabase cible avant toute application SQL

Le projet attendu semble être `ysmkhdwjvlgmduipuaqs`, mais
`supabase/config.toml` désigne l'ancien projet `dawwepdqqzrdyyadhmtw`. Il faut
confirmer la cible avant d'appliquer une migration ou de tester des données
réelles. La préparation locale de SQL peut continuer sans application.

### 4. Bootstrap du premier administrateur

Il faudra fournir l'email réel de l'utilisateur Auth au moment de l'opération
manuelle. Aucun identifiant ne sera inventé ou commité.

## Critère de reprise

Le développement peut commencer après autorisation explicite de modifier
manuellement `src/routeTree.gen.ts` pour les seules routes de cette fondation,
validation de `/app` comme nouvelle URL du Dashboard et confirmation que le
projet Supabase cible est bien `ysmkhdwjvlgmduipuaqs`.
