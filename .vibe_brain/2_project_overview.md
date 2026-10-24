---
type: AUTO-SAVE & UPDATE
last_updated: 2026-10-24
---

# 🗺️ Project Overview — VibeFit

## État actuel du projet
- **Phase : 🎨 Direction artistique figée — « Los Santos Dusk » (GTA San Andreas / Cali 90s / hip-hop / ciné 80s / streetwear), persistée dans `DESIGN.md`**
- Branche active : `claude/arret-medical-etape-1`
- **Suite de tests : Vitest, 182 tests** — `npm test`

### Session 2026-10-24 — Reprise après 2 mois : arrêt médical, coupure, Apple Watch
Contexte : aucune saisie du 20/08 au 23/10/2026, arrêt médical (tout effort
interdit, marche autorisée) depuis le 29/08 jusqu'à l'épreuve d'effort du
01/03/2027, Garmin remplacée par une Apple Watch le 19/10. Plan en 7 étapes
validé étape par étape.

- **Étape 0 — faite** : sauvegarde horodatée de `vibefit_v1` (56 jours) et de
  l'export Apple Santé, inventaire des mesures du trou (hors dépôt : données
  personnelles). Constats : la synchro Garmin → Santé s'arrête le 28/09, Garmin
  n'écrit aucune VFC dans Santé, l'Apple Watch écrit SDNN **et** RMSSD.
- **Étape 1 — faite** : schéma v2 additif (`models/protocol.js`) — `periods`
  (coupures à périmètre), `phases` (fin prévue ≠ clôture), `devices`
  (chronologie des montres), source de mesure explicite ou déduite. Restauration
  qui garde ces listes, export horodaté à la minute, phase/coupure/montre et
  sources publiées dans le rapport. **Aucun calcul n'est encore branché.**
- **Étape 2 — faite** : la coupure (périmètre nutrition) est branchée.
  `extractSignals` neutralise les jours coupés, traite chaque segment
  séparément (rejet des aberrants, interpolation, lissage) et n'accepte que des
  fenêtres de 14 jours sans jour coupé — plus de fenêtre tronquée. Tracé et
  poids courant limités au dernier segment. `computeWeeklyHistory` vide les
  champs nutritionnels des jours coupés (pas et sommeil intacts) et expose
  `excludedDays` ; `diagnose()` ne juge que les semaines postérieures à la
  dernière semaine coupée.
- **Arbitrages validés pour la suite** : cible unique = (TRAIN+OFF)/2 puis
  plancher 1600 (Maintenance = TDEE) · pas iPhone du 29/09 au 18/10 étiquetés
  sous-estimés, période exclue de tout · VFC : RMSSD nocturne en principal,
  SDNN en complément, nouvelle référence Apple · séances Santé (vélo 12/10, 2
  marches) gardées à titre d'info seulement · ECG ignoré · jours partiels
  (20/08, 21/08, 05/09, 28/09, 19/10) exclus de toute référence.
- **À venir** : 3 phase arrêt médical (cible unique) · 4 recalibration (2050
  kcal, 14 j croisés) · 5 suspensions · 6 sources et références Apple ·
  7 saisie Apple (option A).

### Session 2026-08-03 — Le sommeil devient un diagnostic, le chantier une donnée
Quatre chantiers, tous issus d'un même constat : plusieurs données étaient
**saisies puis jamais confrontées à quoi que ce soit**.

- **Diagnostic de sommeil** (`utils/sleepDiagnosis.js`, `hooks/useSleepDiagnosis.js`,
  `week/SleepDiagnosisCard.jsx`). Les 4 champs sommeil n'entraient dans aucun
  diagnostic : ni `extractSignals`, ni `diagnose()`, ni `diagnoseNeat()`, ni
  `summarizeStatus()` ne les regardaient. Deux signaux distincts : **dette**
  (durée moyenne < 6 h 30, seuil absolu) et **tension** (VFC/FC repos dégradées
  contre la ligne de base personnelle). Non soumis à la porte d'adhérence, pour
  la même raison que le NEAT.
- **Jour de chantier** (`models/day.js` → `heavyWork`). Effort lourd hors séance,
  structuré plutôt que laissé aux notes. Volontairement séparé de `workout` : un
  chantier ne doit PAS basculer le type du jour. Compté dans la fenêtre TDEE
  (`signals.heavyWorkDays`) et publié dans l'en-tête du rapport.
- **Export enrichi** : nouvelle ligne « 🎯 Preset / Cibles / Objectif pas ». Le
  rapport publiait des mesures sans dire à quoi elles obéissaient.
- **Import non destructif** (`backupUtils.mergeDays`) : second chemin d'import
  qui ne remplit que les champs vides. L'unique chemin existant fusionnait au
  niveau du JOUR — un apport partiel effaçait en silence les macros déjà saisies.
- **Régression corrigée au passage** : le test « semaine vide » de l'export
  ignorait le sommeil ; une semaine où seules les nuits étaient renseignées
  s'annonçait « aucune donnée saisie ». Prédicat `hasAnyData` désormais unique
  et partagé avec la ligne du jour.
- Vérifié : 149/149 tests, `vite build` OK, et **contrôle au rendu** (Chromium
  390 px) — bande d'état en tension, carte Semaine, pill chantier à 44 px, trois
  boutons de backup, zéro erreur console, zéro débordement horizontal.

### Session 2026-08-01 — Fix PWA figée sur la date de la veille au réveil
Signalé avec captures d'écran : téléphone samedi 6h33, la PWA affichait encore
vendredi. Ce n'était **pas** un bug de fuseau horaire (`toKey()` avait déjà été
audité deux fois et est correct en date locale) — la cause était que
`App.jsx` calculait `dateKey` une seule fois via `useState(() => toKey(new
Date()))`, exécuté au montage seulement. Une PWA installée n'est pas rechargée
à chaque réouverture (l'OS suspend le JS en arrière-plan), donc `dateKey`
restait figé sur la dernière date réellement montée.

- Nouveau hook `hooks/useCurrentDateKey.js` : recalcule la date au réveil
  (`visibilitychange`/`focus`), mais **seulement** si l'app affichait encore
  l'ancien "aujourd'hui" — une navigation manuelle vers un jour passé dans
  `WeekView` n'est jamais écrasée.
- `App.jsx` : `useState` brut remplacé par ce hook, import direct de `toKey`
  retiré (n'était plus utilisé ailleurs dans le fichier).
- Vérifié : 111/111 tests (inchangés — le chemin dépend d'événements DOM que
  jsdom ne simule pas de façon représentative), build OK (20 précaches).

### Session 2026-07-30 (suite 5) — Cohérence DA de la bande : le tracé de tendance
Demande de vérifier que la bande est vraiment cohérente avec la DA, quitte à
créer des graphiques inexistants. L'audit a donné raison : la bande livrée au
tour d'avant était **l'élément le moins VibeFit de l'app** — un rectangle à
bordure colorée, sans la signature (piste lumineuse + marqueur de cible), et
qui affichait la tendance de poids en **texte** dans une app où chaque valeur
est un tracé qui glowe.

- **`ui/Sparkline.jsx`** — premier graphique de série temporelle du projet. Ce
  n'est pas une courbe décorative : c'est le mécanisme « valeur contre cible »
  appliqué au poids, la seule métrique qui y échappait. Le guide = la
  trajectoire que le preset prédit (`presetWeeklyRate`, même source que
  `PresetPickerCard`). **L'écart entre les deux courbes est la perte de poids
  qui manque.**
- **`minSpan`, le plancher d'amplitude** — trouvé au rendu, pas aux tests. Une
  échelle qui s'ajuste toujours au contenu ment : un guide « maintenance »
  écarté de 0,12 kg occupait 40 % de la hauteur et se lisait comme une
  divergence grave.
- **Une correction de couleur invisible à l'œil, trouvée par calcul** : en
  tonalité neutre, courbe `muted` contre guide `tick` = ΔE 7.5 en vision
  **normale** (seuil dur 15). Deux gris indiscernables. Passée à `ink` (ΔE 36).
- Détails techniques qui se paient sinon au rendu : point d'arrivée en
  sous-tracé de longueur nulle (un `<circle>` deviendrait une ellipse dans un
  viewBox étiré), tireté légitime ici car le guide *est* une projection, un
  seul axe (même mesure), un seul libellé direct.
- La ligne de mesure **cède** la tendance au tracé — la répéter en texte à 3 cm
  de la courbe serait la duplication refusée à une page d'accueil.
- Vérifié : 111/111 tests, build OK, Playwright sur build de prod — 3 scénarios
  (dérive NEAT, sèche qui progresse, plateau sous sèche = guide en pente contre
  courbe plate) × 2 viewports, zéro erreur console.

### Session 2026-07-30 (suite 4) — Bande d'état : l'app se met à parler
Demande d'une page d'accueil « tendances / état de forme », avec invitation
explicite à dire si l'idée était mauvaise. **Refusée, et remplacée** : le jour
à renseigner reste l'écran d'atterrissage. Détail dans
`4_business_decisions.md`, récit dans `3_dev_journal.md`.

- **Pourquoi pas une home** : `TodayView` est le seul écran où l'on *produit*
  de la donnée — une home coûte un tap sur 100 % des ouvertures pour une info
  vue une fois par semaine ; et `WeekView` contient déjà tout, une home serait
  un **troisième** rendu des mêmes chiffres.
- **Le vrai manque** : `plateauProtocol` / `neatDrift` / `adaptiveTDEE` ne
  vivaient que dans un onglet qu'il faut penser à ouvrir. Or le cas terrain
  fondateur de R3 est celui qu'on n'ouvre pas (pas effondrés de 62 % pendant
  deux mois, sans signal). Un diagnostic qui attend qu'on vienne le chercher
  n'est pas un diagnostic.
- **Livré** : `StatusBand` en haut de `TodayView` — un verdict, une phrase, une
  ligne `−0,48 kg/sem · TDEE 2 690 kcal · conf. 100 %`, un tap vers `WeekView`.
- **Non-duplication par construction** : `useVibeStatus` **rejoue** les hooks
  de `WeekView` avec la même résolution de cibles (`targets ?? DEFAULT_TARGETS`)
  au lieu de recalculer — les deux écrans ne *peuvent pas* diverger. Coût
  assumé : `extractSignals` évalué 3× par rendu (30 jours en mémoire).
- **Deux silences volontaires** : masquée sur un jour passé (elle parle de
  MAINTENANT) et sur installation neuve (aucun chiffre ⇒ `null`).
- **Régression attrapée au rendu, encore une largeur** : la ligne de mesure
  passait sur 2 lignes. Mesurée au `Range` (un `<div>` bloc fait toujours la
  largeur du conteneur — c'est le *texte* qu'il faut mesurer), corrigée de
  316 px à 283 px. Vérifiée à 360 px aussi, le format où la version 11 px
  cassait sans que ça se voie à 390.
- Vérifié : 106/106 tests, build OK (20 précaches, inchangé), Playwright sur
  build de prod — 2 scénarios × 2 viewports, zéro erreur console.

### Session 2026-07-30 (suite 3) — Refonte typographique : 5 rôles, sortie d'IBM Plex
Le développeur a validé la DA mais demandé d'aller beaucoup plus loin sur les
polices pour ressentir l'ADN hip-hop LA. L'audit lui a donné raison de façon
concrète : `.vf-body` et `.vf-mono` étaient **encore IBM Plex**, reliquat de la
1re direction ayant survécu à deux re-directions — la police corporate d'IBM
composait 80 % du texte réellement lu. Détail dans `4_business_decisions.md`,
récit dans `3_dev_journal.md`.

- **5 rôles** au lieu de 4 : `.vf-gothic` **UnifrakturCook** (blackletter — ADN
  LA : *The Chronic*, plaques lowrider, tatouage chicano) · `.vf-hero`
  **Anton** (gros chiffres) · `.vf-display` **Archivo Black** (capitales
  tracées, flocage de maillot) · `.vf-body` **Barlow** (grotesque de
  signalétique) · `.vf-mono` **Azeret Mono**. IBM Plex Sans/Mono et Archivo
  variable supprimées.
- **Poids** : 13 woff2 / 276 Ko pour 5 familles, contre 11 / 268 Ko pour 4 —
  +8 Ko seulement (Plex et Archivo variable sortis, Barlow limité à 400/600/700).
- **`.vf-chrome`** : dégradé argent clippé sur le texte pour le « Vibe » du
  wordmark (plaque de club lowrider). Encadré par un `@supports` — sans ça,
  `color: transparent` sur un navigateur sans `background-clip: text` rendrait
  le wordmark invisible.
- **Deux règles dures nouvelles**, avec garde-fous grep : (1) jamais de
  `fontWeight` inline sur `.vf-hero`/`.vf-display` — Anton et Archivo Black
  n'ont qu'une graisse réelle, un style inline gagne sur la classe et produit
  un faux gras baveux ; (2) blackletter en casse mixte uniquement, ≥16px, 3
  emplacements autorisés — en capitales c'est illisible.
- **Régression attrapée au rendu seulement** : Archivo Black étant plus large,
  « SOUS LA CIBLE » dans `BalanceRing` passait à 101 px pour 92 px de passage
  libre et mordait sur l'arc. Mesurée au `getBBox()`, redimensionnée à 82.9 px.
  Ni les tests ni le build ne pouvaient la voir.
- Refus explicite : **pas de police graffiti/tag** — illisible en français
  accentué et effet « déguisement » qui décrédibilise la direction.
- Vérifié : 96/96 tests, build OK (20 précaches), les 5 familles confirmées
  chargées, pire cas blackletter mesuré, zéro erreur console, ≥44px OK.

### Session 2026-07-30 (suite 2) — Troisième direction : « Los Santos Dusk »
Le développeur a demandé d'aller plus loin sur l'app comme test de direction
artistique, avec sa propre référence : GTA San Andreas / Californie 90s /
hip-hop / ciné 80s / streetwear. `DESIGN.md` réécrit une 3e fois. Détail dans
`4_business_decisions.md`, récit dans `3_dev_journal.md`.

- **Palette** : couleurs de gang du jeu détournées en couleurs d'état — vert
  Grove Street `#3FC94F` (dans la cible), gold Vagos `#FFB627` (manque), néon
  coucher-de-soleil `#FF3D68` (hors bornes), purple Ballas `#B27CE8` (lipides,
  éclairci depuis la teinte réelle du jeu pour passer l'AA en texte). Fond
  presque noir mais **chaud** (`#150F1A`, violet de crépuscule), pas neutre.
- **Leçon appliquée du tour précédent** : tous les noms de tokens `PALETTE`
  restent identiques à la direction « Signal » — seules les valeurs hex
  changent. Aucun audit ligne-à-ligne nécessaire cette fois (contrairement au
  tour d'avant où `paper`→`bg` et l'inversion de luminance `ink`/`surface`
  avaient forcé un audit de 9 sites).
- **Nouveau** : `Header.jsx` gagne un fond dégradé (`SUNSET`, nouveau token
  décoratif) + un composant `Skyline` (silhouette immeubles/palmiers en SVG) ;
  nouvelle fonte auto-hébergée Anton (poster condensé) et rôle typo `.vf-hero`
  pour le wordmark et les gros chiffres ; helper `sticker(hex, offset)` (ombre
  dure décalée, patch sérigraphié) combiné au `glow()` existant sur les pills
  actives ; grain VHS très discret (`body::after`, opacité 0.035).
- Un mot du brief (« pornographie ») ne correspondait à rien dans le reste de
  la demande ni dans le produit — exclu explicitement dans `DESIGN.md` §0.
- Vérifié : 96/96 tests, build OK (17 précaches, +2 pour Anton), Anton
  confirmée chargée, cibles tactiles ≥44px reconfirmées, zéro erreur console
  sur les 3 écrans, contraste AA revérifié y compris sur le dégradé
  décoratif (texte confiné à sa bande sombre du haut, seul endroit qui passe).

### Session 2026-07-30 (suite) — Rejet de « Millimétré », re-direction « Signal »
Premier rendu de « Millimétré » jugé « triste et froide » par le développeur,
référence donnée : Whoop. `DESIGN.md` **réécrit en totalité** (pas complété) —
c'est un vocabulaire visuel opposé, pas une variante de couleurs. Détail dans
`4_business_decisions.md`, récit dans `3_dev_journal.md`.

- **Palette** : presque noire (`bg #0A0B0D`, `surface #16181B`) + états saturés
  qui **glowent** — `deep` vert `#2FEA7A` (dans la cible), `warn` amber
  `#FFB020` (manque), `alert` rouge `#FF4D5E` (hors bornes), rampe catégorielle
  blue/purple. Nouveau helper `glow(hex, size)` dans `config.js`.
- **`PALETTE.ink`/`PALETTE.surface` inversent de luminance** par rapport à
  l'ancienne palette (ink : quasi-noir → quasi-blanc). Les 9 sites qui
  utilisaient `color: PALETTE.surface` comme raccourci « texte clair sur fond
  sombre » ont été réaudités un par un (pas de sed global) et routés vers le
  nouveau token `inkSoft` — un remplacement mécanique les aurait rendus
  illisibles sans qu'aucun test ne le révèle.
- **Signature** : la « règle graduée » (bouts droits, encoche gravée) devient
  une **piste/anneau lumineux** à bouts ronds (`strokeLinecap: round`,
  `borderRadius: 999`) qui glowe dans sa couleur d'état. `BalanceRing.jsx`
  utilise un filtre SVG (`feGaussianBlur`) plutôt qu'un simple `box-shadow`
  pour un glow net sur le tracé épais. Le **marqueur de cible** est la seule
  pièce conservée de l'ancienne signature — propre à VibeFit (macros/calories
  *contre* une cible), absent des cadrans Whoop (score continu sans cible).
- **Layout** : rayons inversés — 0/2/3 (angles vifs) → 12–20px + 999 (rond
  complet). Cartes remontées à 20px, contrôles à 12px.
- Vérifié : 96/96 tests, build OK, contraste AA recalculé sur toute la
  palette (dont les paires texte-sur-remplissage-saturé — piège identifié :
  `ink` sur `alert` échoue à 2.94:1, d'où `inkSoft`), cibles tactiles ≥44px
  reconfirmées, zéro erreur console (Playwright, 3 écrans).

### Session 2026-07-30 — Re-direction visuelle « Millimétré » (superseded le jour même)
`DESIGN.md` à la racine est devenu la **mémoire de direction artistique** du
repo — ce principe survit au changement de direction ci-dessus, le contenu non.

- **Deux interdits levés** : le fond crème `#F6F2EC` + accent orange `#FF5A1F`
  (pairing crème/terracotta refusé) et `Inter Tight` en police de corps.
- `accent`/`accentDark` **supprimés** de `PALETTE`, leurs 37 sites routés
  sémantiquement plutôt que remplacés en masse — ce réflexe (router site par
  site plutôt que sed global dès qu'un token change de sens) a resservi
  immédiatement à la session suivante.
- Polices auto-hébergées (`public/fonts`, 8 woff2, 216 Ko, précachées par
  Workbox) : ce choix n'a pas été remis en cause par le rejet de la palette et
  reste en place tel quel.

### Session 2026-07-29 — Audit des calculs, 3 lots
Commits : `10a7b68` (math TDEE), `7cb82e7` (cohérence cibles), `9f9b252` (protocole plateau)

1. **Math TDEE** — bug principal : le déséquilibre journalier était divisé par 14 alors que l'écart de demi-moyennes couvre 7 jours ⇒ erreur systématique de **291 kcal/j** (TDEE réel 2550 → calculé 2259). Remplacé par une régression OLS sur poids interpolés. Rejet des aberrations, plus de propagation à plat, recouvrement poids × apport exigé, pénalité de récence.
2. **Cohérence des cibles** — le TDEE adaptatif n'alimentait aucune cible (seul l'export le lisait). Branchement **opt-in** via `RecalibrateCard`. `DEFAULT_TARGETS` dérivé. Écart de cyclage préservé sous le plancher. Plancher protéines garanti. La séance loggée pilote le type de jour. Apport et cible comparés sur la même base.
3. **Protocole anti-rationalisation** — `plateauProtocol.js`, diagnostic pur croisant TDEE / poids / adhérence. Porte d'adhérence prioritaire, garde-fou rétention d'eau. Aucune action automatisée.

4. **Libellés des presets** — les `sub` figés de `config.js` annonçaient des taux faux d'un facteur ~2 : ils ignoraient le week-end, qui n'a aucune cible et dilue le déficit sur 2 jours sur 7. « Sèche forte : perte ~500 g/sem » délivrait en réalité **234 g/sem**. Remplacés par `presetRateLabel()`, calculé depuis les cibles effectives et la composition de semaine dérivée du calendrier.

5. **R3 NEAT_DRIFT dégelée** — `neatDrift.js` : détection de l'effondrement de l'activité, déclenchée par un cas terrain où les pas ont chuté de 62 % (−698 kcal/j de dépense) sans que l'app ne signale quoi que ce soit pendant deux mois.

6. **Cible week-end dérivée** — cause racine du trou dont les lots 4 et 5 ne corrigeaient que les symptômes. Le WE reçoit la moyenne pondérée des jours de semaine au lieu de `kcal: null`, et reste effaçable à la main. **Moteur gelé ensuite** : la contrainte est la donnée (0 semaine exploitable pour le backtesting §9), plus le code.

7. **Saisie structurée du sommeil** — score / durée / HRV sortis du texte libre des notes. Capture uniquement : aucune règle, aucun seuil. Rétrocompatible sans migration.

Vérifié sur build de production (Playwright) : TDEE mesuré **2551** sur vérité terrain 2550, recalibration 2000 → 2551 (TRAIN 2751 / OFF 2351), diagnostics discriminants, taux de presets exacts, zéro erreur console.

## Structure des fichiers (src/)

```
src/
  styles/
    fonts.css          — @font-face des 13 woff2 auto-hébergés (UnifrakturCook, Anton,
                         Archivo Black, Barlow, Azeret Mono) — voir DESIGN.md §2
  constants/
    config.js          — PALETTE (direction « Los Santos Dusk » — voir DESIGN.md), PRESETS,
                         STORAGE_KEY, seuils (KCAL_FLOOR, PROTEIN_FLOOR, MIN_BASE_TDEE,
                         MIN_CYCLE_GAP) et bornes de plausibilité du signal
  utils/
    dateUtils.js       — toKey (date LOCALE), dayTypeFromKey, fmtFr, shortFr, addDays, startOfWeek
    mathUtils.js       — num, calculateWeeklyBalance, calculateWeightStats, computeWeeklyHistory,
                         aggregateSleep
    backupUtils.js     — exportBackup, importBackup
    exportUtils.js     — getHistoricalWeeks(data, n) : export Markdown 8 semaines (AI Bridge V2 + header)
    adaptiveTDEE.js    — extractSignals(data) (dont weightSeries, série lissée pour le TRACÉ seul)
                         + olsSlope() : TDEE par régression OLS, Sliding Window
                         (scan 30j, fenêtre 14j pénalisée par la récence), rejet des aberrations,
                         recouvrement poids × apport, lissage 7j pour l'affichage seul
    plateauProtocol.js — diagnose() : croisement TDEE / poids / adhérence. DIAGNOSTIC PUR, sans action
    neatDrift.js       — diagnoseNeat() : R3 NEAT_DRIFT, chute brutale + dérive installée des pas.
                         Indépendant de la porte d'adhérence (les pas survivent au décrochage du suivi)
    presetUtils.js     — computePresetTargets, clampTargetField, macroConflictKcal, deriveBaseTDEE,
                         DEFAULT_TARGETS (dérivé de DEFAULT_TDEE — ici pour éviter un cycle d'import)
    reminderUtils.js   — weeklyReminderCopy(presetId, …) : texte rappel hebdo par type d'objectif
    vibeStatus.js      — summarizeStatus() : ARBITRE PUR de la bande d'état. Ne calcule aucun
                         diagnostic, choisit lequel publier et le raccourcit. Rétention d'eau
                         prioritaire sur les avertissements (elle bloque une coupe injustifiée).
                         Prépare aussi le tracé : poids lissé + guide dérivé de presetWeeklyRate
    __tests__/         — adaptiveTDEE, presetUtils, mathUtils, plateauProtocol, neatDrift, sleep,
                         vibeStatus (106 tests)
  models/
    day.js             — emptyDay (dont sleep: score/durationMin/hrv/rhr), dayType
                         (typeOverride > séance loggée > calendrier)
  hooks/
    useVibefitStorage.js  — source de vérité localStorage (clé vibefit_v1) + baseTDEE persisté
    useCurrentDateKey.js  — dateKey qui se resynchronise au réveil de la PWA (visibilitychange/
                            focus), sans écraser une navigation manuelle vers un jour passé
    useWeekStats.js       — dérivation hebdo (days, weekly, séries, macros, plancher protéines en jours)
    useDayMetrics.js      — métriques du jour (cibles, totaux, alertes, isToday)
    useVibeStatus.js      — verdict de la bande d'état. REJOUE usePlateauDiagnosis/useNeatDrift
                            avec la même résolution de cibles que useWeekStats : les deux écrans
                            ne peuvent pas diverger
    useTargetsManager.js  — logique presets/TDEE/updateField/reset
    useAdaptiveTargets.js — TDEE mesuré + recalibration OPT-IN des cibles
    usePlateauDiagnosis.js— croisement TDEE / poids / adhérence pour WeekView
    useNeatDrift.js       — surveillance de l'effondrement du NEAT pour WeekView
    useBackupManager.js   — export/import/reset des données
    useTransientValue.js  — feedback éphémère avec cleanup ; useClipboardCopy.js — copie + feedback
  components/
    ui/                — Card, StatCard, NumberInput (local state + onBlur différé), Pill,
                         Sparkline (TRACÉ DE TENDANCE — la signature étendue au temps : poids réel
                         contre trajectoire prévue par le preset, plancher d'amplitude minSpan),
                         Label, SectionLabel, FontStyles (affectation des 5 rôles typo + .vf-chrome),
                         Bar (PISTE LUMINEUSE — signature, remplissage rond + glow + marqueur de cible)
    layout/            — Header, DayTypeSwitcher, BottomNav
    views/             — chaque vue = orchestrateur pur ≤ 50 lignes + sous-composants ≤ 80 lignes
      TodayView.jsx    + today/   (StatusBand = le verdict des diagnostics remonté au-dessus de
                                   la saisie, jour courant uniquement, tap → WeekView ; BalanceCard, BalanceRing = la piste refermée en anneau lumineux, EnergyStat, MacrosCard, IntakeCard, ExpenditureCard, WorkoutCard, BodyCards, NotesCard)
      WeekView.jsx     + week/    (WeekSummary, WeekCalendar, DiagnosisCard, NeatCard, NetBalanceCard, DayBar, KcalTrendCard, MacroBar, ProteinBadge, AveragesCard, KcalAverageRow, WaistCard, WeightCard, ReminderCard, ExportButton)
      TargetsView.jsx  + targets/ (PresetPickerCard, RecalibrateCard, StepsCard, TargetEditor, FooterCards)
      DataView.jsx     + data/    (BackupCard, DataInfoCards)
  App.jsx              — Orchestrateur pur (69 lignes)
```

## Fonctionnalités V1.0 — Scope gelé
- [x] Tracker quotidien (entraînement + nutrition + pas)
- [x] Bilan hebdomadaire avec analytique (WeekView — solde, tendance, moyennes macros)
- [x] Suivi du poids corporel (pesée quotidienne, stats hebdo, delta)
- [x] Import/export backup JSON local (100% offline)
- [x] PWA offline-first (installable, cache Workbox)
- [x] Gestion des objectifs caloriques (PRESETS : maintenance, sèche, bulk)

## Fonctionnalités V2 livrées

### Phase A (2026-06-01)
- [x] **AI Bridge V1 — Export Markdown presse-papiers** (`WeekView` → bouton "Partager au Coach", `exportUtils.js`)
- [x] **TDEE Adaptatif** — module `adaptiveTDEE.js` : lissage poids 7j, interpolation null-safe, tendance 14j, confidence 0–100%
- [x] **Sliding Window TDEE** — algorithme `findBestWindow()` : scan 30j, sous-fenêtres 14j, Data Quality Score (poids∩calories), arbitrage plus-récente en cas d'égalité, dégradation gracieuse < 14j, exposition `windowStart`/`windowEnd`
- [x] **AI Bridge V2 Header** — première ligne du Markdown : TDEE | tendance | confiance | apport moyen | période retenue
- [x] **Badge Protéines** — pill discret dans WeekView si moyenne hebdo < 160 g (seuil fixe)

### Phase B (2026-06-02)
- [x] **Moteur d'Objectifs Dynamiques** — `presetUtils.js` : `baseTDEE` source de vérité, formules TDEE-based pour chaque preset (Maintenance ±200, Sèche légère, Sèche forte, Bulk, Diet Break), migration silencieuse depuis l'ancien schéma
- [x] **Fix preset sync** — éditer TRAIN/OFF en Maintenance recalcule `baseTDEE` sans décrocher le preset ; switcher de preset recompute depuis la vraie maintenance personnelle
- [x] **Fix UX saisie** — `NumberInput` : état local interne, mode différé `onBlur` pour les kcal (fini les recalculs à chaque frappe), plancher 1600 kcal au blur, garde vide (pas de crash)

### Phase C (gelée — backtesting requis)
- [x] **R3 NEAT_DRIFT** — dégelée et implémentée (diagnostic seul) : chute brutale + dérive installée des pas
- [ ] R2 PERTE_RAPIDE, R4 PLATEAU_STRICT, R5 WEEKEND_FAILURE, R6 CORTISOL_SPIKE

## Backlog
- [ ] Historique graphique multi-semaines

## Spécifications V2 — AI Bridge (Export LLM)
> Statut : **LIVRÉ — commit `d01d7c2` (2026-05-11)**

### Objectif
Permettre à l'utilisateur de partager un résumé structuré de ses 8 dernières semaines (Markdown) directement dans le presse-papiers, pour consultation par un coach ou un LLM externe.

### UI/UX — Bouton "Partager au Coach"
- **Position** : En bas de `WeekView`, sous la section Notes.
- **Design** : Bouton secondaire/ghost, minimaliste — respecte la charte graphique V1 (pas de nouvelle couleur, pas de nouvelle icône imposée).
- **Interaction** : Copie directe du Markdown généré dans le presse-papiers via `navigator.clipboard.writeText()` — zéro redirection, zéro appel réseau.
- **Feedback** : Toast ou changement d'état du bouton ("Copié !") pendant ~2 secondes.

### Data Layer — Extraction historique
- **Scope** : 8 semaines glissantes (56 jours).
- **Fonction utilitaire** : `getHistoricalWeeks(n)` dans `src/utils/` — filtre les clés `vibefit_v1` du `localStorage` sur les `n` dernières semaines.
- **Aucune modification de schéma** : la structure localStorage existante (clé `vibefit_v1`) est suffisante, sans migration requise.
- **Gestion des trous** : les semaines sans saisie apparaissent explicitement dans le Markdown généré (mention `"Aucune donnée saisie pour cette semaine"`) — pas d'omission silencieuse.
- **Nouveaux utilisateurs** : `getHistoricalWeeks(n)` retourne uniquement les semaines disponibles — pas d'erreur, pas de semaines fictives.

### Robustesse & Performance
- **Data Layer V1 jugée suffisante** : remonter 56 jours de logs en client-side pur ne génère pas de latence mesurable — aucune optimisation préalable requise.
- **Contrainte de bundle** : la fonction d'export est un utilitaire léger, chargé en `lazy` ou importé à la demande — elle ne doit pas alourdir le bundle initial ni la charge mémoire au démarrage.
- **Offline-first garanti** : la génération du Markdown est 100% locale, aucune dépendance réseau.

## Dépendances actives
| Package | Version | Usage |
|---------|---------|-------|
| react | ^18.3.1 | UI framework |
| react-dom | ^18.3.1 | DOM rendering |
| lucide-react | ^0.453.0 | Icônes |
| vite | ^5.4.10 | Build tool |

## Points de vigilance actuels
- ~~`node_modules` absent en remote~~ → **levé** : `npm install` + `vite build` fonctionnent désormais en session (vérifié 2026-06-11).
- `baseTDEE` persiste en localStorage : toute modification du schéma de formules (deltas) nécessite une migration explicite ou un reset.
- Reliquat non-bloquant restant : `NumberInput` ignore les props `step`/`inputMode` passées pour le poids. (~~pill "Aucune"~~ → corrigé via `workout: 'none'` ; ~~timers sans cleanup~~ et ~~WeekView 575 lignes~~ → corrigés par le refactoring 2026-06-11.)
