# Brief visuel — Copilote, espace `/assistant`

> Projet : **derat-saas**. Piste retenue : **C — « La consultation »** (choisie par l'utilisateur le 2026-09-03).
> Auteur : `direction-artistique` (Mode A, étapes 4 et 6). Destinataire : **Codex**, qui conçoit ET construit la couche visuelle.
> Statut : **brief validé en attente de validation humaine avant prototype.** Aucun prototype n'existe.
>
> Ce document est **token-first** : il ne décrit aucune couleur, aucune taille et aucun espacement qui ne soit déjà un token du dépôt ou une dérivation explicite de ceux-ci.

---

## 0. Cadre non négociable (hérité, ne pas rouvrir)

- **Décision A (tranchée)** : `/assistant` est l'espace principal du Copilote. Le Sheet `AiAssistantPanel` reste comme accès rapide et ne disparaît pas.
- **Décision B (tranchée)** : **aucun signal proactif sur le Dashboard** en V1 — pas de badge, pas de carte d'alerte. La découverte proactive vit entièrement dans `/assistant`.
- **Nom affiché** : « **Copilote** » partout dans l'interface. La clé de permission `assistant_ia`, les noms de route et le nommage interne du code ne sont **pas** renommés — seul le libellé visible change, aucune migration technique.
- **Navigation** : deux niveaux d'accès, pas trois. (1) entrée permanente « Copilote » dans la sidebar → `/assistant` ; (2) bouton Sparkles du `Header` → ouvre le Sheet, qui porte un moyen d'aller vers `/assistant`. **Ne pas multiplier les points d'entrée ailleurs dans l'app.**
- **Périmètre** : arbre `_app.*` uniquement (owner + bureau autorisé `assistant_ia`). **Jamais `/tech/*`** — les techniciens sont exclus structurellement, aucune interface Copilote n'existe ni ne doit exister côté terrain.
- **Lecture seule stricte.** Aucune action d'écriture, jamais, dans cette V1.
- **Animation** : CSS / Tailwind uniquement. `framer-motion` n'est pas installé et **ne doit pas être ajouté**. Techniques autorisées : `transform`, `opacity`, `@keyframes` dans `@layer utilities` de `src/styles.css`, `tw-animate-css` (déjà installé).
- **Correction de référence pour ce brief** : le fichier réel du Dashboard est **`src/routes/_app.app.tsx`** (route `/app`), et non `_app.index.tsx` comme l'indique encore le `CLAUDE.md` du projet. Cette correction vaut **uniquement** pour la référence Dashboard, à ne généraliser à rien d'autre.
- **Maquette de référence fournie le 2026-09-03** (parcours en 8 panneaux, conversation par bulles, écran d'accueil à cartes-insights, menu ⌘K) : elle **ne remplace pas la Piste C**. On en tire **des comportements et une expérience**, jamais une grammaire visuelle. **Règle de priorité, déjà tranchée : en cas de conflit, la Piste C et ce brief priment.** Le détail de ce qui est adopté et de ce qui est refusé est en § 4.9.
- **Nuance sur la Décision B** : l'interdiction de signal proactif porte sur le **Dashboard de l'application** (`/app`). L'écran d'accueil proactif de `/assistant` est propre à cette page et n'est donc pas concerné.

---

# Étape 4 — Parti pris

## 4.1 Thèse visuelle

**Chaque réponse du Copilote est une consultation datée, composée comme une fiche émise par ce produit** — même en-tête, mêmes zones, mêmes règles de preuve que le rapport de passage qu'il imprime déjà (`src/lib/print.ts`, bandeau `public/assets/pdf/document-hero.webp`). Le fil n'est qu'un empilement de fiches. Le Copilote ne « discute » pas : il **émet des relevés** et prouve ce qu'il avance.

Le geste réel de l'utilisateur est *vérifier*, pas converser. La composition doit donc être lisible en diagonale, porter sa preuve sans qu'on la demande, et rester intelligible après quinze échanges.

## 4.2 Anti-thèse (ce que cette direction refuse explicitement)

- **Refus du vocabulaire de chat.** Les bulles `rounded-2xl` à `max-w-[82%]` et les avatars `Bot`/`User` de `src/components/ai-assistant-panel.tsx:145-155` sont **supprimés, pas restylés**. Aucun avatar, aucune bulle, aucun alignement gauche/droite alterné.
- **Refus du deuxième dashboard.** Pas de grille de KPI, pas de panneau d'alertes permanent, pas de `DashboardHero`, pas de `QuickActionCard`. La règle produit l'interdit (§28) et la Décision B en dépend.
- **Refus de la pile de cartes indifférenciées.** Le produit en compte déjà beaucoup (12 `<Card>` dans `_app.stats.tsx`, 14 dans `_app.tresorerie.tsx`, jusqu'à 7 `AlertCard` empilées sur le Dashboard), toutes au même rayon, à la même ombre, avec le même lift au survol. `/assistant` ne doit pas en ajouter une de plus : **la fiche est une surface de lecture, pas une carte cliquable.**
- **Refus de la décoration.** Aucun dégradé dans le contenu, aucun glassmorphism, aucune ombre portée au-delà du budget ci-dessous, aucune icône décorative dans le corps d'une réponse.
- **Refus du texte brut par défaut.** Une réponse structurée qui redescend en paragraphe est un échec de cette direction, pas un cas limite acceptable.

## 4.3 Signature

**Le pied de fiche à trois zones — *Sources* · *Suites* · *Lecture seule* — présent sur chaque réponse, sans exception.**

C'est la traduction en constante de composition de trois exigences du cadrage à la fois : la transparence (« voir les données utilisées », §19), les actions contextuelles (§18) et la lecture seule. Elles ne peuvent plus être oubliées par qui construira la suite, et c'est ce qui distingue cette page de n'importe quelle surface conversationnelle.

Signature secondaire : **le filet d'en-tête de fiche**, tracé de gauche à droite à l'émission.

## 4.4 Budget d'expression — 3 gestes, pas 4

Sur toute la page, exactement trois éléments ont le droit d'être expressifs :

1. Le **filet d'en-tête** de fiche (couleur de marque + tracé animé).
2. Le **pied à trois zones** (la signature).
3. L'**état « rien à signaler »** (le seul emplacement d'une illustration).

Tout le reste est neutre. Un quatrième geste expressif est un dépassement de budget, à refuser même s'il est réussi.

## 4.5 Budget de surfaces — 2 niveaux, 3e exceptionnel

| Niveau | Token | Emploi |
| --- | --- | --- |
| 1 — fond de travail | `bg-muted/20` (déjà le fond du `<main>`, `app-shell.tsx:536`) | Le fond de la page, inchangé |
| 2 — papier de fiche | `bg-card` | Le corps de chaque fiche |
| 3 — creux, **exception** | `bg-muted` | Uniquement le dépliant *Sources* ouvert |

**Interdit : une carte dans une carte.** Aujourd'hui l'app empile jusqu'à 4 surfaces avant d'atteindre une donnée (`main` → `PageContainer` → `PageSection` → `Card` → `CardContent` → tuile `rounded-xl`). Sur `/assistant`, on ne dépasse jamais 3.

## 4.6 Budget de rayons — 2 valeurs

| Rayon | Emploi |
| --- | --- |
| `rounded-[20px]` | La fiche (valeur déjà imposée par `Card`, `src/components/ui/card.tsx:10`) |
| `rounded-xl` | Tous les contrôles internes : boutons, puces de piste, dépliant *Sources*, liens *Suites* |

Interdits : `rounded-2xl` (le rayon des bulles actuelles, à faire disparaître), `rounded-full` sauf pastille d'état de 6-8 px, et toute autre valeur.

## 4.7 Budget d'ombres — 1 ombre, 0 lift

- **`shadow-soft` sur la fiche. C'est tout.**
- **Le lift au survol est neutralisé** : `Card` porte `hover:shadow-elevated hover:-translate-y-0.5` en dur (`card.tsx:10`) ; une fiche n'est pas un bouton et ne doit pas réagir au survol.
  **À neutraliser par `className` sur l'instance** (`hover:shadow-soft hover:translate-y-0`), **jamais en modifiant `src/components/ui/card.tsx`** — la Phase A est commitée et poussée, cette primitive est partagée par toute l'app.
- Aucune ombre sur le pied, l'en-tête, les *Suites*, les pistes ou la saisie.

## 4.8 Budget d'accents — 2 emplois pour l'orange, 2 pour le vert

| Token | Emplois autorisés | Nombre |
| --- | --- | --- |
| `--accent` (orange socle) | 1. Bouton d'envoi · 2. Liens *Suites* | 2, pas 3 |
| `--primary` (vert socle) | 1. Filet d'en-tête de fiche (via `--copilot-rule`) · 2. État actif de l'entrée sidebar | 2 |

L'accent orange **ne signifie jamais une gravité** et le vert **ne décore jamais**. Toute autre couleur sur la page est sémantique (§ 6.5).

## 4.9 Comportements repris de la maquette de référence — traduits, jamais copiés

**La thèse (4.1), l'anti-thèse (4.2), la signature (4.3) et les cinq budgets (4.4 à 4.8) sont inchangés.** Ce qui suit ajoute des **comportements**, pas un nouveau langage visuel. Aucun budget n'est rouvert : le mouvement supplémentaire réemploie l'animation déjà spécifiée, le menu n'ajoute aucune surface permanente, et aucun accent de couleur n'est ajouté.

| # | Comportement à obtenir | Ce qui est **refusé** de la maquette | Traduction en vocabulaire Piste C |
| --- | --- | --- | --- |
| 1 | Analyse proactive dès l'arrivée sur `/assistant` | La grille de 3 cartes-KPI colorées (« Impayés en hausse / Objectif mensuel / Trésorerie ») — c'est le deuxième dashboard que 4.2 refuse | La **fiche du jour**, déjà spécifiée, portant une phrase d'ouverture et 2-3 **constats** en lignes plates (§ 6.2) |
| 2 | Orienter celui qui ne sait pas quoi demander | Les 4 cartes d'orientation en grille | Le bloc **« Par où commencer ? »** : une phrase guidante + les pistes du jour, ≤ 3, en lignes (§ 6.4) |
| 3 | Option « Surprenez-moi » | Une 4<sup>e</sup> carte mise en avant | Une **entrée discrète** sous les pistes, plus une entrée du groupe *Explorer* du menu — **hors du plafond de 3 pistes**, ce n'est pas une piste |
| 4 | Un constat cliqué mène à une exploration détaillée | La bascule en fil de bulles, la carte qui s'agrandit, les autres qui s'estompent | Le constat porte **« Approfondir »** ; le clic **émet une nouvelle fiche** sous le fil, dont l'intitulé est le constat. La fiche du jour **reste en place** et son constat porte une **marque de liaison** vers la fiche émise (§ 6.2) |
| 5 | Réponses qui apparaissent progressivement | Squelettes de chargement, cascades longues, graphiques animés | **Révélation en 3 temps déjà spécifiée** (fiche → corps → pied à +120 ms) plus un **échelonnement plafonné** des lignes du corps (§ 6.8). Même technique, aucune durée totale supplémentaire au-delà du plafond |
| 6 | Suggestions contextuelles après une réponse | Le second bloc « Vous pourriez également explorer ces pistes » et ses vignettes de graphiques | La zone **Suites** du pied **est** ce mécanisme. Ajout structurel minimal : distinguer une **Suite d'approfondissement** (reste dans le Copilote) d'une **Suite de navigation** (quitte vers un écran) (§ 6.2) |
| 7 | Menu d'actions contextuel (⌘K) | Le groupe **« Actions »** de la maquette — *Créer un rapport*, *Plan d'action*, *Exporter les données* : ce sont des écritures/exports, **interdits** en V1 lecture seule | Le **menu du Copilote** (§ 6.8 bis), 3 groupes lecture seule, **en complément du pied, jamais à sa place** |
| 8 | Sensation plus vivante et guidante | Bulles, avatars, ton « ChatGPT », multiplication des accents de couleur, graphiques décoratifs | La vivacité vient de **la fiche qu'on voit s'émettre**, de la **liaison constat → fiche** et du **menu** — jamais de la couleur, de la décoration ni d'une surface de plus |

**Ce que la maquette confirme et qu'on garde tel quel** : le bouton **« + »** à gauche de la saisie comme ouverture du menu — c'est exactement le mécanisme déjà anticipé par le cadrage `ergonomie-metier` (point 4, « menu contextuel, bouton + »).

---

# Étape 6 — Brief

## 6.1 Silhouette et grille

### Page `/assistant` (desktop `lg:` et plus)

```
┌───────────────────────────────────────────────────────────────┐
│ Sidebar (existante)  │  Header (existant, bouton Sparkles)    │
│  … · ✨ Copilote     ├────────────────────────────────────────┤
│                      │  PageHeader — « Copilote »             │
│                      │  sous-titre : mention lecture seule    │
│                      │                                        │
│                      │  ┌── FICHE DU JOUR ──────────────────┐ │
│                      │  │ ▬▬▬▬▬ filet                       │ │
│                      │  │ Relevé du <date>          <heure> │ │
│                      │  │ 2-3 constats (max 3)              │ │
│                      │  ├───────────────────────────────────┤ │
│                      │  │ Sources · Suites · Lecture seule  │ │
│                      │  └───────────────────────────────────┘ │
│                      │                                        │
│                      │  ┌── fiche repliée (1 ligne) ────────┐ │
│                      │  └───────────────────────────────────┘ │
│                      │  ┌── FICHE — réponse en cours ───────┐ │
│                      │  │ ▬▬▬ filet                         │ │
│                      │  │ <intitulé de la demande>  <heure> │ │
│                      │  │ CORPS (1 des 6 formes)            │ │
│                      │  ├───────────────────────────────────┤ │
│                      │  │ Sources · Suites · Lecture seule  │ │
│                      │  └───────────────────────────────────┘ │
│                      │                                        │
│                      │  [pistes de découverte si fil vide]    │
│                      │  ┌── saisie (collante en pied) ──────┐ │
│                      │  └───────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

- **Colonne unique**, jamais deux. `PageContainer` existant, contraint à `max-w-5xl` sur cette page (le `<main>` est déjà `max-w-7xl px-8` en `lg:`, `app-shell.tsx:537` — ne pas le retoucher, contraindre localement).
- **Rien à gauche, rien à droite de la colonne.** Pas de panneau latéral d'insights : ce serait la Piste B, écartée.
- Ordre vertical fixe : `PageHeader` → fiche du jour → fil (fiches, plus ancienne en haut) → pistes (si fil vide) → saisie.
- **Grille interne d'une fiche** : trois bandes empilées — en-tête / corps / pied. Aucune fiche n'a de colonne latérale.

### Sheet (accès rapide, `AiAssistantPanel`)

- Largeur inchangée (`sm:max-w-md` desktop, plein écran mobile) — la structure responsive actuelle est correcte, ne pas la repenser.
- Rend **le même composant de fiche en variante `compact`** : une colonne, pied à trois zones empilé. **Un seul gabarit, deux largeurs** — la cohérence entre le raccourci et la page est structurelle et ne se maintient pas à la main.
- Le Sheet **n'affiche pas** la fiche du jour complète : à sa place, un bouton pleine largeur **« Ouvrir le relevé du jour »** → `/assistant`. Le Sheet sert la question ponctuelle ; la page sert l'exploration.
- L'en-tête du Sheet conserve son habillage actuel (`bg-primary`, icône Sparkles) et son libellé de description **« Consultation sécurisée en lecture seule »**, verbatim. Seul le titre passe de « Assistant IA » à **« Copilote »**.

## 6.2 Le gabarit de fiche

### En-tête (obligatoire, toutes fiches)

- **Filet** : bande pleine largeur de 2 px en haut de la fiche, couleur `--copilot-rule`, respectant l'arrondi supérieur (`overflow-hidden` sur la fiche + `absolute inset-x-0 top-0 h-0.5`). `aria-hidden`.
- **Intitulé** : pour une réponse, la demande reformulée en une ligne (jamais la question brute recopiée si elle fait trois lignes) ; pour la fiche du jour, « Relevé du \<date longue\> ».
- **Horodatage** : à droite, discret. Format court (`HH:mm`).
- L'en-tête n'a **pas de fond propre** — il partage le papier de la fiche.

### Corps — 6 formes typées, une seule par fiche

La forme suit la nature du résultat (§17 de la règle Copilote). **Ce catalogue est fermé** : une réponse qui n'entre dans aucune forme prend la forme *Texte*, jamais une improvisation.

| Forme | Quand | Composition |
| --- | --- | --- |
| **Valeurs** | Agrégat de 2 à 4 chiffres (CA mois / mois-1 / impayés) | Rangée horizontale de valeurs, `tabular-nums`, libellé au-dessus en petites capitales. Bascule en colonne sous 640 px. |
| **Liste** | Résultats énumérables (interventions, factures, clients, devis) | Lignes séparées par un filet `border-border/50`, chacune : intitulé + qualificatif + lien à droite. Cible tactile ≥ 44 px par ligne. |
| **Comparaison** | Deux périodes / deux entités | Deux blocs de valeur côte à côte **plus l'écart** rendu explicite (valeur + sens), l'écart étant le point focal. |
| **Tableau** | 3 colonnes ou plus | `ui/table` existant, dans un conteneur `overflow-x-auto` propre. Jamais de scroll horizontal sur le `<body>`. |
| **Classement** | Ordre entre entités comparables (techniciens) | Lignes numérotées, rang 1 en graisse supérieure, barre de proportion en `bg-muted` + remplissage `--primary`. Motif déjà présent dans `_app.stats.tsx:235-239` — reprendre cette convention. |
| **Texte** | Explication, réponse ambiguë, absence de résultat | `text-sm leading-relaxed`, `whitespace-pre-wrap` (comportement actuel conservé). Tenu avec le même soin que les autres formes, jamais un fourre-tout. |

**Distinction fait / calcul / analyse / projection** (§8), portée par la composition et non par le seul texte :

- **Fait** : la valeur seule, graisse pleine.
- **Calcul** : la valeur, plus une ligne de service sous elle (`text-xs text-muted-foreground`) qui dit d'où elle sort.
- **Analyse** : forme *Texte* ou ligne de commentaire sous une valeur, jamais en graisse de valeur.
- **Projection** : **obligatoirement** préfixée d'une mention d'hypothèse visible, et **jamais rendue dans la même graisse qu'un fait**. Une projection qui ressemble à un chiffre arrivé est un défaut bloquant.

### Pied à trois zones (obligatoire, toutes fiches — la signature)

| Zone | Contenu | Comportement |
| --- | --- | --- |
| **Sources** | Déclencheur « Voir les données utilisées » | `Collapsible` (Radix, déjà installé). Fermé par défaut. Ouvert : `bg-muted rounded-xl`, `text-xs`, expose le `summary` serveur, le volume réel vs affiché, et la période le cas échéant. |
| **Suites** | 2 à 3 liens, **maximum 3** | Approfondissements de lecture ou navigation. `--accent`. Aucune action d'écriture, jamais. **Deux natures distinguées** : *approfondissement* (reste dans le Copilote, émet une nouvelle fiche) porte un chevron ; *navigation* (quitte vers un écran de l'app) porte un glyphe de lien sortant. Même style par ailleurs — la distinction est un glyphe, pas une couleur. |
| **Lecture seule** | Mention permanente | Texte constant, ton actuel conservé : **« Lecture seule · aucune action automatique »**. |

- Fond `--copilot-footer`, séparé du corps par `border-t border-border/50`, arrondi inférieur respecté.
- Desktop : les trois zones sur une ligne, *Sources* à gauche, *Suites* au centre-droit, *Lecture seule* à droite.
- Mobile : empilé dans l'ordre **Suites → Sources → Lecture seule** (l'action d'abord, sous le pouce).

### Le constat actionnable et la liaison constat → fiche

C'est la traduction du comportement 4 de la maquette. **Aucune bascule de mode : on reste dans la fiche.**

- Chaque constat de la fiche du jour porte une action **« Approfondir »** — même style que les *Suites* (`--accent`, chevron), même cible tactile ≥ 44 px, aucune couleur supplémentaire.
- Au clic, le Copilote **émet une nouvelle fiche** en bas du fil, dont l'intitulé reprend le constat. C'est le mécanisme normal d'émission, pas une transition spéciale : rien de nouveau à concevoir.
- **La fiche du jour ne disparaît pas et ne s'estompe pas.** Le constat d'origine reçoit une **marque de liaison** : une ligne de service (`text-xs`, `--muted-foreground`) « → approfondi à HH:mm », cliquable, qui ramène à la fiche émise.
- Cette marque est la seule trace de l'enchaînement. Pas de fil de bulles, pas de reformulation du constat en « message », pas d'avatar.
- Un constat déjà approfondi conserve sa marque : l'utilisateur voit ce qu'il a déjà creusé aujourd'hui.

### Fiche repliée (historique)

- Une fiche qui n'est plus la dernière se réduit à son en-tête : une ligne, hauteur ≥ 44 px, intitulé tronqué en ellipsis + horodatage + chevron.
- Redéployable au clic. `aria-expanded` géré.
- Effet recherché : le fil reste lisible après quinze échanges, et la réponse courante n'est jamais poussée hors de l'écran.

## 6.3 Point focal par état

Un seul point focal par état. S'il y en a deux, la composition est à reprendre.

| # | État | Point focal | Note |
| --- | --- | --- | --- |
| 1 | Arrivée, constats détectés | Le **premier constat** de la fiche du jour | Jamais la saisie |
| 2 | Arrivée, **rien à signaler** | L'**état calme** (illustration + phrase) puis les 3 pistes | « Mieux vaut une interface calme qu'une fausse impression d'intelligence » (§11) — ne jamais fabriquer un constat |
| 3 | Fil vide, pas encore de relevé | Les **pistes de découverte** | |
| 4 | Saisie en cours | La **zone de saisie** | Les fiches passent au second plan sans être grisées |
| 5 | Consultation (attente) | Le **bandeau d'en-tête** de la fiche en cours d'ouverture | Remplace le spinner générique. `aria-live="polite"` conservé (`ai-assistant-panel.tsx:199`) |
| 6 | Réponse *Valeurs* | La **rangée de valeurs** | |
| 7 | Réponse *Liste* | La **première ligne** | |
| 8 | Réponse *Comparaison* | L'**écart**, pas les deux valeurs | |
| 9 | Réponse *Tableau* | L'**en-tête + première ligne** | |
| 10 | Réponse *Classement* | Le **rang 1** | |
| 11 | Réponse *Texte* | La **première phrase** | |
| 12 | **Aucun résultat** | La **phrase d'absence** | Doit distinguer « rien trouvé » d'une **capacité indisponible** (§9 du cadrage) — sinon l'utilisateur ignore s'il doit reformuler ou renoncer |
| 13 | **Refus** (`refused: true`) | La **mention lecture seule**, en ton neutre | Copy serveur existante conservée verbatim (`security.ts:21-26`). Ce n'est pas une erreur : ne jamais utiliser `--destructive` |
| 14 | **Indisponible** (`unavailable: true`) | La **phrase de service** | Deux copies serveur distinctes existent déjà (clé absente vs panne, `assistant.server.ts:148` et `:243`) — les garder distinctes, elles ne disent pas la même chose |
| 15 | **Erreur réseau** (catch client) | La **phrase + réessayer** | Copy actuelle conservée (`ai-assistant-panel.tsx:108`) |
| 16 | Fiche repliée | L'**intitulé de la demande** | |
| 17 | **Constat approfondi** | La **fiche émise** en bas du fil | La fiche du jour reste intacte ; son constat porte la marque « → approfondi à HH:mm » |
| 18 | **Révélation progressive** en cours | La **première ligne révélée** du corps | L'échelonnement est plafonné (§ 6.8) ; jamais d'ossature de chargement fantôme |
| 19 | **Menu du Copilote ouvert** | La **première entrée du groupe *Analyser*** | Le pied de la dernière fiche reste lisible derrière : le menu complète le pied, il ne le remplace pas |
| 20 | **« Surprenez-moi » en cours** | Le **bandeau d'en-tête** de la fiche en préparation | Même état d'attente que n° 5 — aucun traitement particulier, c'est une demande comme une autre |

## 6.4 Rythme et densité

- **Échelle d'espacement stricte** : `8/12/16/24/32/40/48` (Tailwind `2/3/4/6/8/10/12`). Aucune valeur arbitraire, sauf nécessité d'alignement optique documentée en commentaire (précédent accepté : `mt-0.5` dans `alert-card.tsx:38`).
- Entre fiches : `space-y-4` sous `lg`, `space-y-6` à partir de `lg`.
- Intérieur de fiche : en-tête `px-4 py-3` / `lg:px-6 lg:py-4` · corps `p-4` / `lg:p-6` · pied `px-4 py-3` / `lg:px-6 lg:py-4`.
- **Plafonds, qui sont des règles et non des suggestions** : 3 constats · 3 pistes · 3 *Suites* · 4 valeurs dans la forme *Valeurs* (au-delà → forme *Liste*).
- **« Surprenez-moi » est hors plafond** : ce n'est pas une 4<sup>e</sup> piste mais une entrée distincte, de moindre emphase, placée sous le bloc des pistes (et reprise dans le groupe *Explorer* du menu). Elle ne prend jamais la place d'une piste réellement pertinente.
- **Bloc d'orientation** : une seule phrase guidante au-dessus des pistes (« Vous ne savez pas par où commencer ? »), en `t-mention`. Pas de titre supplémentaire, pas d'illustration, pas de carte.
- Densité cible : une fiche *Valeurs* tient dans un écran de téléphone **sans scroll interne**.
- Le fil grandit vers le bas ; le défilement automatique vers la dernière fiche est conservé (comportement actuel, `ai-assistant-panel.tsx:60-62`).

## 6.5 Typographie et chiffres

**Famille** : la pile système existante (`src/styles.css:148`). **Aucune webfont** — aucune n'est chargée aujourd'hui, en ajouter une serait une évolution de socle hors périmètre.

**Échelle — 5 niveaux, pas plus :**

| Rôle | Classes |
| --- | --- |
| Valeur | `text-2xl lg:text-3xl font-bold tracking-tight tabular-nums` |
| Intitulé de fiche | `text-base font-semibold tracking-tight` |
| Corps | `text-sm leading-relaxed` |
| Libellé de structure (*Sources*, *Suites*, *Période*, *Volume*) | `text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground` |
| Mention de pied / horodatage | `text-xs text-muted-foreground` |

- **Plancher : 11 px.** Le produit utilise aujourd'hui beaucoup de `text-[10px]` (`stat-card.tsx:46`, `header.tsx:53`, `ai-assistant-panel.tsx:249`) — cette page ne descend pas sous 11 px.
- Le motif « petites capitales espacées » est **déjà une convention du dépôt** (`stat-card.tsx:46`, `sidebar.tsx:88`, `header.tsx:53`) : on la reprend, on ne l'invente pas.
- **`tabular-nums` obligatoire sur toute valeur numérique**, sans exception — convention déjà en place (`stat-card.tsx:49`, `dashboard-hero.tsx:58`).
- Les montants sont formatés par le `formatEUR` **existant**. La présentation ne recalcule jamais un chiffre.

## 6.6 Couleurs — marque et sémantique, strictement séparées

### Marque (identité — ne porte jamais un sens d'état)

| Token | Statut | Emploi |
| --- | --- | --- |
| `--primary` | existant | Filet d'en-tête (via `--copilot-rule`), état actif de l'entrée sidebar |
| `--accent` | existant | Bouton d'envoi, liens *Suites* — **2 emplois, pas 3** |
| `--copilot-rule` | **nouveau, dérivé** | Le filet d'en-tête de fiche |
| `--copilot-footer` | **nouveau, alias** | Le fond du pied à trois zones |

**Définition des deux tokens nouveaux — zéro couleur nouvelle introduite**, à ajouter dans `:root` **et** `.dark` de `src/styles.css`, en suivant le basculement `primary → accent` que le thème sombre opère déjà (`styles.css:105`) :

```css
:root {
  --copilot-rule: oklch(0.28 0.07 155 / 55%); /* = --primary, opacité réduite */
  --copilot-footer: var(--background);        /* le pied « creuse » le papier */
}
.dark {
  --copilot-rule: oklch(0.7 0.19 48 / 55%);   /* = --primary du thème sombre */
  --copilot-footer: var(--background);
}
```

Les exposer dans le bloc `@theme inline` comme les autres (`--color-copilot-rule`, `--color-copilot-footer`) pour rester utilisables en classes Tailwind, comme `--color-success`/`--color-warning` le sont déjà (`styles.css:28-31`).

### Sémantique (état — ne décore jamais)

| Token | Sens sur cette page |
| --- | --- |
| `--success` | Dans les temps, objectif atteint |
| `--warning` | À surveiller, échéance proche |
| `--destructive` | En retard, seuil dépassé |
| `--muted-foreground` | Neutre, absence de donnée |

**Interdits** : employer `--accent` pour signifier une gravité ; employer `--warning`/`--destructive` pour décorer ; introduire une couleur littérale Tailwind (`orange-300`, `red-50`, `green-600`…) ; écrire un hex.

**Point de vigilance repéré dans le dépôt** : deux conventions de couleur de graphique cohabitent, dont une cassée — `_app.tresorerie.tsx:563` utilise correctement `var(--primary)`, tandis que `_app.stats.tsx:114-141` utilise `hsl(var(--accent))` alors que les tokens sont **OKLCH** (l'enveloppe `hsl()` produit une couleur invalide qui retombe silencieusement). Si un jour un graphique arrive sur cette page, c'est la convention de `_app.tresorerie.tsx` qui fait foi. **Ne pas corriger `_app.stats.tsx` dans ce lot** — hors périmètre, à signaler.

## 6.7 Surfaces, bordures, rayons, ombres

| Élément | Spécification |
| --- | --- |
| Fiche | `bg-card border border-border/50 rounded-[20px] shadow-soft overflow-hidden` + neutralisation du survol : `hover:shadow-soft hover:translate-y-0` |
| Filet d'en-tête | `absolute inset-x-0 top-0 h-0.5 bg-[--copilot-rule]`, `aria-hidden` |
| Pied | `bg-[--copilot-footer] border-t border-border/50` |
| *Sources* déplié | `bg-muted rounded-xl p-3 text-xs` |
| Ligne de liste | séparateur `border-b border-border/50`, dernière ligne sans séparateur |
| Constat de gravité | filet gauche 2 px au token sémantique (`--warning` / `--destructive`), **pas** de fond teinté — le fond teinté est le langage d'`AlertCard` sur le Dashboard, pas celui d'une fiche |
| Contrôles | `rounded-xl`, `focus-visible:ring-2 focus-visible:ring-ring` (convention existante) |

- **Une seule ombre sur toute la page** (`shadow-soft`, sur la fiche). Aucune ailleurs.
- **Aucun dégradé dans le contenu.** Le dégradé de marque reste au `Header` (`.header-gradient`) et au `DashboardHero`, qui ne sont pas de ce périmètre.
- Bordure standard : `border-border/50` (convention `Card`). Pas de bordure colorée pleine.

## 6.8 Signature de mouvement (CSS/Tailwind uniquement)

**Nom : « la fiche qui se pose ».** Rôle : faire lire que le Copilote *émet un document* et que **la preuve arrive avec la réponse**, pas après coup.

À ajouter dans `@layer utilities` de `src/styles.css`, à côté des `.animate-in-up` / `.animate-fade-in` existants :

| Classe | Rôle | Déclencheur | Durée / courbe | Mobile |
| --- | --- | --- | --- | --- |
| `.copilote-fiche-in` | La fiche se pose | Montage d'une fiche | 200 ms, `cubic-bezier(0.16,1,0.3,1)` — `opacity 0→1`, `translateY(6px→0)` | identique |
| `.copilote-rule-in` | Le filet se trace | Montage de l'en-tête | 240 ms, même courbe — `scaleX(0→1)`, `transform-origin: left` | **désactivé sous 640 px** (imperceptible à cette largeur) |
| `.copilote-pied-in` | La preuve arrive avec la réponse | Montage du pied | même que `.copilote-fiche-in` + `animation-delay: 120ms` | conservé (ne coûte rien) |
| `.copilote-attente` | L'attente du Copilote | Consultation en cours | `opacity 0.5→1→0.5`, 1,2 s, `ease-in-out`, en boucle, **sur le bandeau d'en-tête seul** | identique |
| `.copilote-item-in` | La réponse se révèle **progressivement** | Montage des lignes du corps (constats, lignes de liste, rangs, lignes de tableau) | Même image que `.copilote-fiche-in` (opacité + 4 px), **échelonnée de 40 ms par ligne, plafonnée à 5 lignes** — soit **+200 ms au maximum**, jamais davantage quel que soit le nombre de résultats | identique (aucune translation coûteuse) |

**Zéro décalage de mise en page** : la fiche est montée à sa hauteur finale ; seules `opacity` et `transform` sont animées. Aucune animation de `height`, `width`, `margin` ou `padding`.

**Ne pas doubler l'animation de page** : le `<main>` applique déjà `animate-in-up` à chaque changement de route (`app-shell.tsx:537`). L'entrée de fiche s'applique **aux fiches**, pas au conteneur de page.

### `prefers-reduced-motion` — obligatoire, et manquant dans tout le dépôt

**Constat vérifié : aucune occurrence de `prefers-reduced-motion` dans `src/`**, alors que `.animate-in-up` (`styles.css:154`), `.fab` (`styles.css:214`) et le lift des `Card` (`card.tsx:10`) animent déjà. Repli à écrire :

```css
@media (prefers-reduced-motion: reduce) {
  .copilote-fiche-in, .copilote-rule-in, .copilote-pied-in,
  .copilote-item-in, .copilote-attente {
    animation: none !important;
  }
  .copilote-item-in { animation-delay: 0s !important; }
}
```

En mode réduit : la fiche est posée d'un coup, le filet est plein, le pied est simultané, **toutes les lignes du corps apparaissent ensemble** (aucun échelonnement), et l'attente redevient le texte **« Consultation… »** déjà présent (`ai-assistant-panel.tsx:205`) — qui reste dans tous les cas le message accessible de référence.

**Portée volontairement limitée aux classes du Copilote** (arbitrage tranché le 2026-09-03) : les animations existantes de l'application (`.animate-in-up`, `.animate-fade-in`, `.fab`, le lift des `Card`) **ne sont pas touchées** — pas de refonte globale dans ce lot. Point d'intégration : ce bloc se place dans `@layer utilities` de `src/styles.css`, immédiatement après les `@keyframes` du Copilote. Le manque global reste consigné comme constat, pas comme tâche de ce lot.

## 6.8 bis — Menu contextuel du Copilote (⌘K)

Comportement 7 de la maquette. **Complément du pied à trois zones, jamais son remplacement** : le pied porte ce qui découle de *cette* réponse, le menu porte ce qu'on peut demander *en général*.

### Vérification de collision du raccourci — faite avant de le proposer

| Vérification | Résultat |
| --- | --- |
| Un raccourci global existe-t-il dans l'app ? | **Un seul** : `Cmd/Ctrl + B` dans `src/components/ui/sidebar.tsx:26,99` (`SIDEBAR_KEYBOARD_SHORTCUT = "b"`) |
| Ce fichier est-il utilisé ? | **Non** — `src/components/ui/sidebar.tsx` n'est importé nulle part (le projet utilise sa propre `src/components/sidebar.tsx`, décision documentée). Le raccourci n'est donc jamais armé |
| Une palette de commande existe-t-elle ? | `src/components/ui/command.tsx` (cmdk) existe comme primitive shadcn **jamais utilisée**. La recherche réelle est `GlobalSearch` (`app-shell.tsx:37`), ouverte **uniquement au clic** sur le bouton Recherche du `Header` — **aucun raccourci clavier n'y est lié** (seul `Escape` ferme, `app-shell.tsx:186`) |
| **Conclusion** | **⌘K est libre**, aucune collision |

**Réserve à respecter malgré tout** : ⌘K est, par convention établie, le raccourci d'une recherche globale — rôle que `GlobalSearch` occuperait naturellement s'il en recevait un un jour. Le raccourci du Copilote doit donc être **borné à la surface du Copilote** (page `/assistant` et Sheet ouvert), **jamais un écouteur global sur `window`**. ⌘K reste ainsi disponible pour une future palette de recherche sans conflit à arbitrer plus tard.

### Ouverture

- **Affordance principale : le bouton « + »** à gauche de la saisie — c'est le mécanisme déjà anticipé par le cadrage `ergonomie-metier` (point 4). Cible ≥ 44 px.
- **Accélérateur : ⌘K / Ctrl+K**, actif seulement quand le Copilote a le focus.
- **Sur mobile, le bouton « + » est la seule affordance** (pas de clavier physique) : le raccourci ne doit jamais être la seule façon d'atteindre le menu, et la mention du raccourci est masquée sous `lg`.

### Contenu — trois groupes, tous en lecture seule

| Groupe | Entrées (exemples) |
| --- | --- |
| **Analyser** | Où en suis-je ? · Qu'est-ce qui mérite mon attention ? · Comprendre mon activité |
| **Comparer** | Comparer deux périodes · Comparer mes techniciens |
| **Explorer** | Explorer mes données · **Surprenez-moi** |

**Le groupe « Actions » de la maquette est refusé** (*Créer un rapport*, *Plan d'action*, *Exporter les données*) : ce sont des écritures ou des exports, hors du périmètre lecture seule de la V1. Aucune entrée du menu ne doit produire autre chose qu'une **question posée au Copilote** ou une **navigation** vers un écran existant.

### Forme

- Adopte la primitive **`src/components/ui/command.tsx`** déjà présente (cmdk installé) : **aucune dépendance nouvelle**, et c'est enfin l'emploi d'une primitive vendue mais inutilisée.
- Surface : niveau 2 (`bg-card`), rayon `rounded-xl`, ombre `shadow-soft` — **le budget de surfaces n'est pas dépassé** : le menu est transitoire, il ne s'ajoute pas à l'empilement permanent de la page.
- En-têtes de groupe au motif `t-struct` déjà défini. Aucune couleur autre que `--foreground` / `--muted-foreground` ; **aucun accent** — le menu n'entame pas le budget de 2 emplois de l'orange.
- **Hauteur plafonnée à `min(45vh, 420px)` avec défilement interne, à toutes les tailles.** Règle issue de la vérification du prototype : le menu s'ouvre vers le haut, c'est donc la **hauteur** de l'écran qui le contraint, pas sa largeur — un plafond plus généreux au-delà de `lg` sortait du viewport en 1024×768. Une seule règle, pas un palier par largeur.
- Largeur `min(320px, 100vw − 32px)` — le menu tient dans un écran de 390 px.
- Mention du raccourci en pied de menu, `t-mention`, masquée sous `lg`.
- Fermeture : `Escape`, clic extérieur. `role="dialog"` + focus piégé, restitué au bouton « + » à la fermeture.

## 6.9 États — inventaire complet

**Existants, à préserver sans régression** :
`loading` (« Consultation… », `aria-live="polite"`) · erreur réseau côté client · `unavailable` avec ses **deux** copies distinctes (clé absente / panne API) · `refused` (demande d'écriture bloquée par `security.ts`) · vide par outil (« Aucun client trouvé. », « Aucune facture trouvée. ») · compteur de caractères 1000 · `Enter` envoie, `Shift+Enter` saute une ligne.

**Nouveaux, à concevoir** :
fiche du jour avec constats · fiche du jour **sans** constat (état calme) · les 6 formes de corps · pied à trois zones · *Sources* replié/déplié · fiche repliée/dépliée · pistes de découverte dynamiques · attente sur bandeau d'en-tête.

## 6.10 Responsive

| Palier | Comportement |
| --- | --- |
| `< 640px` | Fiche pleine largeur, marges `16`. Pied à trois zones **empilé** (Suites → Sources → Lecture seule). Forme *Valeurs* en colonne. Forme *Tableau* dans un `overflow-x-auto` — **le `<body>` ne défile jamais horizontalement**. Filet non animé. |
| `640 – 1023px` | Idem, largeur accrue, pied toujours empilé si l'espace manque. |
| `≥ 1024px (lg)` | Sidebar visible, colonne contrainte à `max-w-5xl`, pied sur une ligne, historique replié en une ligne. |

**Deux contraintes mobiles réelles du shell, à respecter et à vérifier au rendu :**

1. Le `<main>` réserve déjà `pb-[calc(7rem+env(safe-area-inset-bottom))]` pour la bottom nav (`app-shell.tsx:536`) — la saisie collante doit se poser **au-dessus** de cette réserve, jamais dessous.
2. Le **FAB** est fixé en `bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4` (`app-shell.tsx:543`) — la saisie collante et le bouton d'envoi ne doivent pas entrer en collision avec lui. Le bouton d'envoi doit donc rester dans le flux de la barre de saisie, pas flotter à droite.

**Pas de tiroir** pour la navigation (règle projet). La navigation mobile reste la bottom nav existante ; l'accès mobile au Copilote passe par le bouton Sparkles du `Header`, déjà présent sur mobile.

## 6.11 Composants — réutilisés / composés / évités

### Réutilisés tels quels (aucune modification)

`PageContainer`, `PageHeader`, `PageSection`, `SectionTitle` (`src/components/page-layout.tsx`) · `Card`/`CardContent` comme **surface** de fiche, survol neutralisé par `className` · `ScrollArea` · `Button` · `Textarea` · `Badge` · `Separator` · `Tooltip` · `Collapsible` (Radix, installé) · `ui/table` pour la forme *Tableau* · `Sheet` pour l'accès rapide · `Link` TanStack pour les *Suites* · **`ui/command.tsx`** (cmdk, primitive présente et jamais utilisée jusqu'ici) pour le menu ⌘K.

### Enrichis (jamais dupliqués — règle du projet : « jamais de `XxxV2`/`PremiumXxx` »)

| Composant | Enrichissement | Garde-fou |
| --- | --- | --- |
| `StatCard` (`src/components/stat-card.tsx`) | Variante **dense** (sans tuile d'icône, hauteur réduite) pour la forme *Valeurs* | Le rendu par défaut du Dashboard doit rester **strictement identique** |
| `AlertCard` (`src/components/alert-card.tsx`) | Variante **`flat`** (mêmes tonalités, sans l'enveloppe `Card`) pour les constats **dans** une fiche | Évite la carte-dans-la-carte. Le rendu par défaut du Dashboard doit rester **strictement identique** |

Ces deux enrichissements sont la réponse à la contrainte du cadrage (« réutiliser `StatCard`/`AlertCard` au niveau structurel ») **sans** violer le budget de surfaces. Si l'utilisateur préfère une réutilisation littérale de ces composants, le coût assumé est une surface imbriquée de plus par constat — arbitrage à trancher avant construction.

### Composés (nouveaux, à créer dans `src/components/copilote/`)

`CopiloteFiche` (gabarit complet, prop `compact` pour le Sheet) · `CopiloteEnTete` · `CopilotePied` (les trois zones) · `CopiloteSources` (dépliant) · `CopiloteSuites` (≤ 3 liens, deux natures) · `CorpsValeurs` · `CorpsListe` · `CorpsComparaison` · `CorpsTableau` · `CorpsClassement` · `CorpsTexte` · `CopilotePistes` (phrase guidante + ≤ 3 pistes + « Surprenez-moi ») · `CopiloteSaisie` (avec le bouton « + ») · **`CopiloteMenu`** (menu ⌘K, § 6.8 bis) · **`CopiloteConstat`** (constat plat, avec « Approfondir » et la marque de liaison).

Conventions de nommage du dépôt à respecter : fichiers en `kebab-case`, exports en `PascalCase`, libellés en français.

### Évités — explicitement, avec la raison

| Évité | Raison |
| --- | --- |
| `DashboardHero` | Dégradé + décor SVG : point focal concurrent, et signal « deuxième dashboard » |
| `QuickActionCard`, grille 2×2 | La page n'est pas un lanceur d'actions |
| `TaskCard` | Spécifique à l'intervention du jour |
| Bulles `rounded-2xl` / `max-w-[82%]`, avatars `Bot`/`User` | Vocabulaire de chat — **supprimé, pas restylé** |
| `ui/sidebar.tsx` (shadcn) | Bascule en tiroir sur mobile, contredit une règle du projet |
| `ui/chart.tsx` + `recharts` | **Aucun graphique en V1** — les seules données de série disponibles sont CA du mois et mois précédent, et la règle du projet interdit un graphique sur données absentes |
| `framer-motion` | Non installé, ne doit pas l'être |
| Toute nouvelle dépendance | Interdit |

## 6.12 Données — Disponible / Simulé / Évolution

### ✅ Disponible aujourd'hui (réel, câblable immédiatement)

- `AssistantReply` : `answer` (texte), `links` (assainis par la whitelist), `refused`, `unavailable` (`src/lib/ai-assistant/contracts.ts:31-36`).
- Les **10 outils lecture seule** existants et leurs permissions déjà vérifiées côté serveur.
- **Déjà calculé côté serveur mais jamais exposé** : `ToolExecutionResult.summary` + le volume réel vs affiché (ex. « 12 facture(s) trouvée(s), dont 12 affichée(s) », `tools.server.ts:484`). **C'est exactement la matière de la zone *Sources* — aucune donnée nouvelle n'est nécessaire pour la construire.**
- Tokens OKLCH complets, thème sombre inclus ; `StatCard`, `AlertCard`, `page-layout`, échelle d'espacement.
- Dépendances installées et utilisables sans rien ajouter : Radix (`collapsible`, `scroll-area`, `tooltip`, `progress`, `separator`), `lucide-react`, `tw-animate-css`, `sonner`, `cmdk`, `vaul`.
- Précédent d'actif visuel de marque : `public/assets/pdf/document-hero.webp` (60 Ko) servi par `src/lib/print.ts:25`.

### ⚠️ Simulé (la forme se conçoit maintenant, la donnée arrive plus tard)

**À rendre visiblement exemplaire dans toute maquette — jamais câblé sur une fausse donnée, jamais présenté comme réel.**

- Les **2-3 constats proactifs** : la détection n'existe pas (Lot 3 du cadrage technique).
- Les **formes *Comparaison*, *Tableau*, *Classement*, et la structure des *Valeurs*** : `AssistantReply` ne porte aujourd'hui que `answer: string` — aucune structure typée ne remonte encore.
- Les **pistes de découverte dynamiques** : aujourd'hui 3 constantes en dur (`ai-assistant-panel.tsx:30-34`).
- Les **Suites** (2-3 actions contextuelles) et leur distinction approfondissement / navigation.
- Le **contenu de *Sources*** tant que le serveur ne le renvoie pas au client.
- Les **entrées du menu ⌘K** : elles doivent être **dérivées des capacités réellement disponibles pour le rôle** (un bureau sans `tresorerie` ne voit pas « Où en suis-je ? »), exactement comme les pistes. Un menu à entrées fixes serait une régression par rapport au cadrage `ergonomie-metier` (point 3).
- **« Surprenez-moi »** : dépend du module de détection du Lot 3, comme les constats.
- La **liaison constat → fiche** : suppose que le constat porte un identifiant et une question associée, ce que le format de réponse actuel ne transporte pas.

### 🔧 Évolution (hors périmètre Codex — revient à `developpeur-autonome`)

1. **Étendre `AssistantReply`** (`contracts.ts`) avec un corps typé et un bloc sources. Risque connu : c'est un format déjà couvert par des tests — `src/lib/ai-assistant/ai-assistant.test.ts` doit être étendu **en parallèle, pas après**.
2. **Exposer au client** le `summary`, le volume et la période déjà calculés côté serveur.
3. ⚠️ **Whitelist de liens** : `SAFE_INTERNAL_LINK` (`src/lib/ai-assistant/security.ts:28-29`) autorise `/clients`, `/interventions`, `/factures`, `/devis`, `/contrats`, `/stock`, `/stats`, `/tresorerie`, `/equipe` — **elle ne contient ni `/programmation` ni `/reappro`**. Les *Suites* vers ces deux écrans (pourtant identifiées comme prioritaires par le cadrage technique) **seront silencieusement filtrées** tant que la regex n'est pas étendue. **Fichier de sécurité — Codex n'y touche pas.**
4. **Module de détection des constats** (`insights.server.ts`, Lot 3) : rien à afficher tant qu'il n'existe pas. La forme « rien à signaler » n'est donc pas un état de repli, c'est l'**état par défaut réel** de la V1.
5. **Ajout des deux tokens** `--copilot-rule` / `--copilot-footer` et du garde-fou `prefers-reduced-motion` dans `src/styles.css` (présentation pure, mais fichier partagé).
6. **Entrée de navigation** : `{ to: "/assistant", label: "Copilote", icon: Sparkles, perm: "assistant_ia" }` dans `APP_SECONDARY_NAV_ITEMS` (`src/lib/navigation.ts`). **Aucune évolution du système de permissions n'est nécessaire** : `AppNavItem` porte déjà `perm?: PermissionKey` (`navigation.ts:21-27`) et `assistant_ia` est déjà une `PermissionKey` (`src/lib/permissions.ts:14`). La route sera protégée par `PermissionGate` comme les autres modules.
7. **Libellé visible de la permission** : `PERMISSION_LABELS.assistant_ia` vaut aujourd'hui « Assistant IA (lecture seule) » (`permissions.ts:30`) et **est affiché à l'utilisateur** sur la page Équipe. Cohérence de nommage → il devrait devenir « Copilote (lecture seule) ». **La clé reste `assistant_ia`, seule la chaîne change.** À confirmer, car c'est le seul endroit où le renommage touche un fichier de permissions.

## 6.13 IA visuelle — deux emplacements, pas trois

Évaluation explicite de l'apport possible d'actifs générés :

1. **État « rien à signaler »** (le seul vraiment justifié). La règle produit dit qu'une interface calme vaut mieux qu'une fausse intelligence ; une illustration sectorielle sobre est la façon honnête de faire lire ce calme comme **intentionnel** et non comme une panne.
2. **Motif d'en-tête de fiche**, très discret, dérivé de l'iconographie du secteur (trame de plan de piégeage, grille de site) — **SVG inline**, jamais une image matricielle.

**Contraintes** : aucun visuel dans le corps d'une réponse (ce sont des données) · poids ≤ le précédent existant (60 Ko) · licences/droits vérifiés pour toute ressource externe · **jamais une capture d'interface figée** · lisibilité contrôlée aux tailles réelles et dans les deux thèmes. Textes, montants, listes, tableaux, états et interactions restent **natifs et dynamiques** en toutes circonstances.

## 6.14 Copy — ton existant à préserver

**Conservé verbatim** : « Consultation sécurisée en lecture seule » · « Lecture seule · aucune action automatique » · « Consultation… » · la réponse de refus (`security.ts:21-26`) · les deux messages d'indisponibilité · les messages d'absence par outil (« Aucun client trouvé. »).

**Nouveau, à écrire dans le même registre — direct, rassurant, sans emphase** : « Relevé du \<date\> » · « Sources » · « Suites » · « Voir les données utilisées » · « Rien à signaler aujourd'hui » · « Ouvrir le relevé du jour » · « Approfondir » · « → approfondi à HH:mm » · « Vous ne savez pas par où commencer ? » · « Surprenez-moi » · « Analyser / Comparer / Explorer » (groupes du menu).

**Registre explicitement refusé** (celui de la maquette) : pas de salutation nominative (« Bonjour Marc 👋 »), pas de première personne emphatique (« J'ai analysé vos données », « J'ai remarqué… »), pas d'emoji. Le Copilote **constate**, il ne se met pas en scène. Une phrase d'ouverture factuelle suffit : « Activité examinée ce matin. Trois points méritent votre attention. »

**Changé** : « Assistant IA » → « **Copilote** » partout où c'est visible (titre du Sheet `ai-assistant-panel.tsx:130`, entrée sidebar, titre de page, titre d'onglet).

---

## 7. Interdits absolus pour la construction

- Ne modifier **aucune** logique métier, requête, route existante, permission, base ou modèle de données.
- **Aucune interface Copilote côté `/tech/*`**, sous aucune forme.
- **Aucune action d'écriture**, aucun bouton qui déclenche autre chose qu'une lecture ou une navigation.
- **Ne pas modifier `src/components/ui/*`** (primitives de Phase A, commitées et poussées) — neutraliser par `className` sur l'instance.
- **Aucune nouvelle dépendance**, `framer-motion` en premier lieu.
- **Aucune couleur en dur**, aucun hex, aucune couleur littérale Tailwind, aucun `hsl(var(--…))` sur un token OKLCH.
- **Aucune valeur d'espacement hors échelle** `8/12/16/24/32/40/48`.
- **Aucune donnée inventée** : ce qui n'est pas encore disponible reste visiblement exemplaire (§ 6.12).
- **Ne jamais commiter ni pousser sans validation visuelle explicite de l'utilisateur** (règle du projet sur la refonte en cours).

---

## 8. Contrôle avant validation — liste à cocher

- [ ] Le pied à trois zones est présent sur **chaque** fiche, sans exception.
- [ ] Aucune bulle, aucun avatar, aucun alignement alterné ne subsiste.
- [ ] Budget respecté : 3 gestes expressifs · 2 niveaux de surface (3 pour *Sources*) · 2 rayons · 1 ombre · 2 emplois de l'orange.
- [ ] Aucune fiche ne réagit au survol.
- [ ] Les 16 états du § 6.3 sont rendus, chacun avec **un seul** point focal.
- [ ] `prefers-reduced-motion` vérifié réellement activé : plus aucune animation, aucune régression de lisibilité.
- [ ] Rendu vérifié aux tailles réelles : téléphone, tablette, desktop — **et** dans le Sheet, **et** en thème sombre.
- [ ] Le `<body>` ne défile jamais horizontalement, même sur la forme *Tableau*.
- [ ] Cibles tactiles ≥ 44 px partout, focus visible partout.
- [ ] Le rendu par défaut de `StatCard` et `AlertCard` sur le Dashboard est **strictement inchangé**.
- [ ] Aucune chaîne « Assistant IA » visible ne subsiste.
- [ ] Aucune bulle, aucun avatar, aucune salutation nominative, aucun emoji n'est apparu avec les comportements de la § 4.9.
- [ ] Approfondir un constat **émet une fiche** et laisse la fiche du jour en place, avec sa marque de liaison.
- [ ] L'échelonnement de révélation est **plafonné à 5 lignes / +200 ms**, y compris sur une liste de 20 résultats.
- [ ] Le menu ⌘K ne contient **aucune** entrée d'écriture ou d'export, et son raccourci n'est **pas** un écouteur global.
- [ ] Sur mobile, le menu reste atteignable par le bouton « + » et la mention du raccourci est masquée.
- [ ] `bun run build` vert.

---

## 9. Point d'arrêt

Ce brief s'arrête ici. **Aucun prototype n'est produit et rien n'est écrit dans `design/proto/`.**
Prochaine étape attendue : **validation humaine de ce brief**, puis prototype isolé, puis préparation du prompt contextuel Codex (6 points de la règle globale) intégrant les décisions consignées ici.
