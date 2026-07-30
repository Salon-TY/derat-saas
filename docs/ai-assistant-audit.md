# Audit Bloc IA 1 — assistant en lecture seule

Date de l'audit : 30 juillet 2026  
Branche : `feat/ai-assistant-readonly`

## Périmètre audité

L'application est un SaaS multi-tenant TanStack Start + Supabase. Les données d'un
compte sont isolées par les politiques RLS basées sur `account_owner()`. Les
techniciens utilisent exclusivement l'arbre `/tech/*`; l'assistant de ce bloc doit
donc rester dans l'arbre administrateur `_app.*`.

Fichiers et surfaces examinés :

- `CLAUDE.md` ;
- `src/lib/queries.ts`, `src/lib/db.ts` et `src/lib/permissions.ts` ;
- `src/lib/api/team.functions.ts` et le middleware `requireSupabaseAuth` ;
- `src/components/app-shell.tsx`, `header.tsx`, `sidebar.tsx` et `bottom-nav.tsx` ;
- les routes Clients, Terrain/Planning, Devis, Factures, Contrats, Stock,
  Réapprovisionnement, Statistiques, Trésorerie et Équipe ;
- `src/integrations/supabase/types.ts` ;
- les migrations SQL présentes dans le dépôt.

## Données actuellement accessibles en lecture

| Domaine       | Données disponibles                                                                                          | Limites connues                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Clients       | identité, coordonnées, adresse, nuisible, notes, historique des interventions                                | la recherche serveur existante est bornée et normalise certains caractères                         |
| Interventions | date, site, nuisible, type, statut, technicien, consignes, observations, produits, heures, client et contrat | le nom du client joint ne peut pas être filtré proprement dans la requête PostgREST existante      |
| Rapports      | interventions au statut `realisee`, observations, produits, photos et signature                              | aucun statut séparé « rapport absent » ; `realisee` représente la file à vérifier                  |
| Factures      | numéro, dates, échéance, statut, totaux existants, client et intervention                                    | la recherche serveur existante ne cherche exactement par numéro que lorsque le terme est numérique |
| Devis         | numéro, dates, statut, totaux existants, client                                                              | tables absentes du fichier de types Supabase manuel                                                |
| Contrats      | numéro, dates, statut, fréquence, passages inclus/réalisés, client                                           | aucune règle automatique nouvelle ne doit être déduite à partir des dates                          |
| Stock         | catalogue, niveaux garage/camions, seuils, mouvements et demandes de réapprovisionnement                     | une alerte est calculée par emplacement lorsque `quantite <= seuil_alerte`                         |
| Équipe        | nom, poste, activité, permissions et interventions assignées                                                 | un employé ne peut lire que ce que la RLS et ses permissions applicatives autorisent               |
| Statistiques  | CA mois courant/précédent, impayés, compteurs et statistiques existantes                                     | plusieurs agrégats historiques sont encore calculés côté client sur des listes non bornées         |

## Questions auxquelles le Bloc IA 1 peut répondre

- Quel est le CA du mois et comment se compare-t-il au mois précédent ?
- Quelles interventions sont prévues entre deux dates ?
- Quelles interventions sont à vérifier ?
- Retrouve un client et résume son historique récent.
- Retrouve une intervention par adresse, nuisible, produit ou période.
- Quelles factures sont envoyées ou en retard ?
- Retrouve une facture par numéro, client ou période.
- Quels devis sont encore en attente ? Retrouve un devis.
- Quels contrats actifs expirent prochainement ? Retrouve un contrat.
- Quels produits ou emplacements sont sous leur seuil d'alerte ?
- Quelles interventions sont assignées à un technicien sur une période ?

Les réponses doivent utiliser uniquement les résultats des outils serveur. Une
absence de résultat doit être annoncée comme telle, sans compléter avec une
supposition.

## Données manquantes ou insuffisamment fiables

1. Il n'existe pas d'agrégat SQL fiable et générique pour calculer le CA sur une
   période arbitraire. Le seul agrégat financier dédié est
   `dashboard_money_stats`, limité au mois courant, au mois précédent et aux
   impayés. Le Bloc IA 1 doit réutiliser cet agrégat.
2. Les statistiques historiques de `useMonthlyStats` et
   `useTechnicianStats` sont calculées côté client. Les exposer comme outils
   génériques demanderait d'abord des RPC d'agrégation fiables.
3. La recherche PostgREST existante sur les interventions et factures ne couvre
   pas correctement les colonnes des relations jointes. Une recherche en deux
   étapes peut être faite côté serveur, avec des limites strictes, sans SQL libre.
4. `src/integrations/supabase/types.ts` est géré à la main et ne décrit pas toutes
   les tables/champs utilisés par l'application : `devis`, `devis_lines`,
   `relances`, `produits_biocides`, `interventions.photos`,
   `interventions.signature_url`, `company_settings.logo_url` et plusieurs champs
   de paramètres n'y figurent pas.
5. Aucun stockage de conversation IA n'existe. Ce bloc conservera uniquement un
   court historique en mémoire dans le composant de chat.

## Modèle de sécurité retenu

### Authentification et tenant

- L'unique fonction serveur publique de l'assistant utilise
  `requireSupabaseAuth`.
- Le client Supabase utilisé par les outils est créé avec le jeton de la session
  courante. Aucun client service-role n'est utilisé.
- Aucun schéma d'outil n'accepte `user_id`, `owner_id`, `tenant_id` ou un jeton.
- Le tenant est donc déterminé exclusivement par la session et la RLS
  `user_id = account_owner()`.
- Un technicien est refusé côté serveur même s'il appelle directement la fonction.

### Permissions

- L'assistant constitue un nouveau module administrateur et nécessite une
  permission dédiée `assistant_ia`.
- Un employé de bureau doit posséder cette permission et la permission du domaine
  consulté (`clients`, `factures`, `devis`, `contrats`, `stock`, `stats`, etc.).
- L'owner conserve l'accès complet.
- Le bouton n'est rendu qu'une fois les accès résolus, mais la protection serveur
  reste l'autorité.

### OpenAI

- `OPENAI_API_KEY` et `OPENAI_MODEL` sont lus uniquement côté serveur.
- Le navigateur n'envoie jamais la clé et ne reçoit jamais sa valeur.
- L'intégration utilise la Responses API et des fonctions à schémas stricts :
  `strict: true`, tous les champs requis, `additionalProperties: false`.
- Les appels d'outils sont séquentiels et bornés ; aucun outil d'écriture n'est
  déclaré.
- Les réponses de l'API ne sont pas stockées (`store: false`) et l'historique
  court est renvoyé explicitement à chaque requête.
- Références officielles :
  [Function calling](https://developers.openai.com/api/docs/guides/function-calling),
  [migration vers Responses](https://developers.openai.com/api/docs/guides/migrate-to-responses).

### Limites d'exécution

- longueur maximale d'un message utilisateur ;
- nombre maximal de messages d'historique et taille maximale par message ;
- nombre maximal d'appels d'outils par réponse ;
- limites maximales explicites dans chaque outil ;
- délai maximal pour l'appel OpenAI ;
- validation Zod de l'entrée publique et validation stricte des arguments d'outil ;
- erreur OpenAI transformée en message utilisateur non bloquant ;
- refus déterministe des demandes de création, modification, suppression, envoi,
  paiement, validation ou changement de statut.

## Outils de lecture proposés

| Outil                           | Source                                     | Permission métier                      |
| ------------------------------- | ------------------------------------------ | -------------------------------------- |
| `get_revenue_overview`          | RPC `dashboard_money_stats`                | `tresorerie` ou `stats`                |
| `list_interventions`            | `interventions` + `clients` + équipe       | Terrain, toujours visible dans l'admin |
| `search_clients`                | `clients`                                  | `clients`                              |
| `get_client_history`            | `clients` + `interventions`                | `clients`                              |
| `list_reports_to_review`        | `interventions` au statut `realisee`       | Terrain                                |
| `search_invoices`               | `invoices` + `clients`                     | `factures`                             |
| `search_quotes`                 | `devis` + `clients`                        | `devis`                                |
| `search_contracts`              | `contracts` + `clients`                    | `contrats`                             |
| `search_stock`                  | `stock_products` + `stock_levels` + équipe | `stock`                                |
| `list_technician_interventions` | équipe + `interventions`                   | Terrain                                |

Chaque résultat contient au plus quelques dizaines de lignes et uniquement des
liens internes construits par le serveur.

## Actions explicitement interdites

L'assistant de ce bloc ne peut pas :

- créer, modifier ou supprimer un client, une intervention, un devis, une
  facture, un contrat, un produit, un membre ou un paramètre ;
- changer un statut, assigner un technicien ou programmer un passage ;
- valider, envoyer ou renvoyer un rapport ;
- enregistrer un paiement, envoyer une relance ou convertir un devis ;
- ajouter/supprimer une photo ou une signature ;
- déplacer ou ajuster du stock, traiter une demande de réapprovisionnement ;
- exécuter du SQL, choisir un tenant, appeler Supabase directement depuis le
  modèle ou utiliser la service-role ;
- fabriquer un chiffre, une date, une ligne ou un lien.

Une demande de ce type reçoit un refus court et oriente l'utilisateur vers
l'écran existant correspondant.

## Risques résiduels et protections

| Risque                                    | Protection du Bloc IA 1                                                 | Risque résiduel                                                                    |
| ----------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Fuite inter-tenant                        | client Supabase de session + RLS, aucun paramètre tenant                | dépend de la justesse des politiques RLS déjà déployées                            |
| Contournement des permissions UI          | contrôle serveur de la permission assistant et de chaque domaine        | les permissions historiques restent un JSON applicatif, pas des claims signés      |
| Injection de prompt par une donnée métier | consignes système, outils read-only, aucune action disponible           | le texte d'une fiche peut encore influencer la formulation ; jamais l'autorisation |
| Hallucination                             | réponse limitée aux résultats d'outils, absence explicitée              | une reformulation peut rester imprécise et doit être testée sur données réelles    |
| Charge/coût                               | historique, messages, outils, résultats et délai bornés                 | pas encore de quota distribué par compte                                           |
| Donnée financière fausse                  | RPC existante uniquement pour le CA ; totaux stockés pour les documents | les totaux dépendent toujours de la logique métier existante                       |
| Clé exposée                               | accès `process.env` dans un module `.server.ts` importé dans le handler | configuration Netlify à vérifier avant déploiement                                 |

## Découvertes à corriger ultérieurement

Ces points ne sont pas modifiés dans le Bloc IA 1 :

1. régénérer ou compléter le fichier de types Supabase manuel pour refléter le
   schéma réellement utilisé ;
2. ajouter des RPC d'agrégation pour les périodes financières arbitraires et les
   statistiques historiques ;
3. envisager une vue/RPC de recherche multi-entités si le volume dépasse les
   limites actuelles de recherche en deux étapes ;
4. ajouter un quota distribué par compte et de l'observabilité sans contenu
   sensible avant une ouverture commerciale ;
5. définir une politique produit de conservation des données envoyées au
   fournisseur IA avant toute mémoire persistante.

## Possibilités supplémentaires découvertes

Le code permettrait, dans des blocs ultérieurs et après validation métier, de
réutiliser la charge de travail par technicien, les passages de contrat restant à
programmer, les niveaux de relance des factures et les statistiques de consommation
de stock. Ces informations ne doivent pas devenir des recommandations ou des
actions automatiques sans règles explicites.

## Besoins futurs — Blocs IA 2 et 3

Le Bloc IA 2 pourra envisager des actions assistées uniquement après ajout :

- d'un écran de confirmation explicite pour chaque mutation ;
- d'outils d'écriture séparés, jamais mélangés aux outils de lecture ;
- d'une autorisation serveur par action et par ressource ;
- d'une protection contre la répétition/relecture des confirmations ;
- d'un journal d'audit par compte ;
- de tests RLS et permissions automatisés contre une base de test multi-tenant ;
- d'idempotence et de transactions pour les actions financières ou de stock.

Le Bloc IA 3 devra en plus définir les règles métier, jeux d'évaluation, seuils de
confiance et mécanismes d'explication avant toute recommandation prédictive ou
automatisation.
