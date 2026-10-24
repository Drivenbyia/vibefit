---
type: APPEND ONLY — ajouter les notes de session uniquement à la fin
---

# 📓 Dev Journal — VibeFit

---

## Session 2026-05-04 — Initialisation de l'environnement

### Contexte
Première session de travail sur le projet. Mise en place de l'infrastructure Claude Code.

### Actions réalisées
- Création du dossier `.vibe_brain/` avec les 4 fichiers de référence.
- Création de `CLAUDE.md` à la racine avec les protocoles de sécurité.
- Création de `.claude/rules/react-rules.md` — règles strictes React/hooks.
- Création de `.claude/commands/react-review.md` — agent d'inspection pré-commit.

### Observations
- Stack : React 18 + Vite 5 + Lucide React + Netlify. Pas de state manager externe.
- Pas de linter configuré (ESLint absent des devDependencies). À ajouter si nécessaire.
- Pas de suite de tests configurée. À documenter comme décision dans `4_business_decisions.md`.

### Décisions prises
- Aucune décision architecturale cette session, uniquement de la configuration.

---

## Session 2026-05-04 — Refactoring modulaire (Clean Architecture)

### Contexte
Découpage du monolithe `App.jsx` (1478 lignes) en architecture modulaire complète.

### Actions réalisées
- `src/constants/config.js` — PALETTE, DEFAULT_TARGETS, PRESETS, STORAGE_KEY, DEFAULT_STEPS_TARGET.
- `src/utils/dateUtils.js` — toKey, dayTypeFromKey, fmtFr, shortFr, addDays, startOfWeek.
- `src/utils/mathUtils.js` — num.
- `src/models/day.js` — emptyDay, dayType.
- `src/hooks/useVibefitStorage.js` — hook localStorage (mécanisme préservé à l'identique).
- `src/components/ui/` — FontStyles, Card, NumberInput, Pill, Bar, Label, StatCard.
- `src/components/layout/` — Header, BottomNav.
- `src/components/views/` — TodayView (+ BalanceRing), WeekView, DataView, TargetsView (+ TargetEditor).
- `src/App.jsx` — reconstruit comme orchestrateur pur (54 lignes).
- `4_business_decisions.md` — décisions Local First et architecture modulaire documentées.

### Vérification
- `npm run build` : ✅ 0 erreur, 0 warning — bundle 182 kB / 56 kB gzip.
- `window.localStorage` et fallback SSR préservés dans `useVibefitStorage`.
- Passage de props `updateDay` / `dateKey` identique à l'original.
- Aucune librairie UI externe ajoutée. PALETTE seule source de couleur.

---

## Session 2026-05-04 — Import/Export backup local (100% offline)

### Contexte
Implémentation du système de sauvegarde/restauration JSON sans aucune dépendance réseau.

### Actions réalisées
- Création de `src/utils/backupUtils.js` — deux fonctions pures exportées :
  - `exportBackup(data)` : génère un Blob JSON, déclenche le téléchargement via un `<a>` invisible, nettoie avec `revokeObjectURL`.
  - `importBackup(file, onSuccess, onError)` : lecture via `FileReader`, `JSON.parse` dans un `try/catch`, délègue la validation métier au callback `onSuccess`.
- Refactoring de `DataView.jsx` :
  - Import de `exportBackup` / `importBackup` depuis `backupUtils.js`.
  - `window.confirm` obligatoire avant tout import (protection contre l'écrasement accidentel).
  - `<input type="file">` découplé du `<label>` — piloté par `useRef` pour rester un `<button>` sémantique.
  - `minHeight: 44` sur les boutons pour la conformité mobile (cibles 44×44 px).

### Vérification
- Zéro appel réseau (`fetch`, `axios` absents de `backupUtils.js`).
- La logique de validation du format (`parsed.days`) reste dans le composant, pas dans l'utilitaire.
- Pas de régression UI : la charte PALETTE et les Cards sont inchangées.

---

## Session 2026-05-04 — Bilan Hebdomadaire (WeekView analytics)

### Contexte
Implémentation du dashboard analytique WeekView : 3 sections distinctes, zéro librairie de chart, résilience aux données manquantes.

### Actions réalisées
- `src/utils/mathUtils.js` — ajout de `calculateWeeklyBalance(daysData, targets)` :
  - Filtre les jours vides (`day.intake.kcal > 0 || expenditure.kcal > 0`).
  - Divise par `recordedDays` (non par 7) pour éviter de fausser les moyennes.
  - Retourne : `netBalance`, totaux, moyennes par macro, `avgKcalTarget` calculé sur les jours avec cible non-null.
  - Source la référence calorique depuis `DEFAULT_TARGETS` de `config.js`.
- `src/components/views/WeekView.jsx` — refonte complète en 5 blocs :
  1. **Header + calendrier** — semaine, solde net avec icône tendance (TrendingDown/Up/Minus), dot coloré par type de jour.
  2. **Bilan Net** — grid 3 colonnes : apport total, dépense totale, séances réalisées/planifiées.
  3. **Tendance calorique** — barres CSS pures (flex + height en px), couleur par état (cible/surplus/sous/vide), légende inline.
  4. **Moyennes / jour saisi** — 3 MacroBars avec jauge CSS (protéines/glucides/lipides) + kcal moyen vs cible.
  5. **Tour de taille + Rappel hebdo** — inchangés dans la logique, refactorés pour lisibilité.
- Composants internes purs (pas de hook, pas d'effet) : `SectionLabel`, `MacroBar`, `DayBar`.
- Fallbacks défensifs : `data?.days?.[k] ?? null`, `targets ?? DEFAULT_TARGETS`, guard `recordedDays === 0`.

### Vérification
- `npm run build` : ✅ 0 erreur, 0 warning — bundle 191 kB / 58 kB gzip.
- Aucune donnée `vibefit_v1` écrasée (lecture dérivée uniquement).
- Zéro librairie chart externe ajoutée.

---

## Session 2026-05-04 — Intégration PWA offline-first

### Contexte
Transformation de VibeFit en Progressive Web App installable et fonctionnelle sans réseau.

### Actions réalisées
- `npm install -D vite-plugin-pwa@1.2.0` — dépendance de build uniquement.
- `vite.config.js` — import et configuration de `VitePWA` :
  - `registerType: 'autoUpdate'` (mise à jour silencieuse du SW).
  - Manifest : `name: "VibeFit"`, `display: "standalone"`, `theme_color: #FF5A1F`, `background_color: #0E1116`.
  - Workbox `CacheFirst` pour les fonts Google (cache 1 an) — garantit le rendu hors-ligne.
  - Précache automatique de tous les assets JS/CSS/HTML/SVG.
- `public/pwa-icon.svg` — icône haltère géométrique, SVG scalable, couleurs PALETTE exclusivement.
- `index.html` — `theme-color` aligné sur `#FF5A1F` (cohérence avec le manifest installé).

### Vérification
- `npx vite build` : ✅ 0 erreur — 182 kB JS / 56 kB gzip (inchangé).
- Artefacts PWA générés : `dist/sw.js`, `dist/workbox-1d305bb8.js`, `dist/manifest.webmanifest`.
- Précache : 7 entrées / 181.71 KiB.
- Aucune dépendance CDN externe introduite.
- Conforme à la décision "Architecture Local First" — zéro donnée réseau, fonctionnement offline garanti.

---

## 2026-05-04 — Module Weight Tracking

### Objectif
Intégration du suivi du poids corporel (pesée quotidienne), en cohérence avec le tour de taille existant.

### Fichiers modifiés
- `src/models/day.js` : ajout du champ `weight: ''` dans `emptyDay()`.
- `src/utils/mathUtils.js` : nouvelle fonction `calculateWeightStats(daysData)` → retourne `{ avgWeight, weightDelta, weightSeries }`.
- `src/components/views/TodayView.jsx` : nouveau `Card` avec `NumberInput` poids (icône `Scale`, `inputMode="decimal"`, `step="0.1"`, suffix "kg"), affiché en permanence au-dessus de la carte tour de taille.
- `src/components/views/WeekView.jsx` : nouvelle carte "POIDS" avec liste des pesées, moyenne hebdo et delta (premier/dernier jour) avec code couleur `PALETTE.deep`/`PALETTE.accent`.

### Vérification
- Build Vite ✓ (733 ms, 0 erreur, 0 warning).
- Aucune dépendance externe ajoutée.
- Données stockées uniquement en localStorage via `useVibefitStorage` (conforme décision Local First).

---

## 2026-05-04 — 🔒 Clôture V1.0 Golden Master — Feature Freeze

### Décision
La phase de développement actif de VibeFit est officiellement close. Le produit entre en phase **RUN** : test terrain intensif, sans ajout de nouvelle fonctionnalité pendant 4 semaines minimum (jusqu'au 2026-06-01).

### Périmètre V1.0 validé
- **Architecture Local First** : zéro donnée réseau, `localStorage` + clé `vibefit_v1` comme unique source de vérité. Décision irréversible pour le cycle RUN.
- **PWA offline-first** : installable, cache Workbox CacheFirst, artefacts `sw.js` + `manifest.webmanifest` générés — build 182 kB / 56 kB gzip.
- **Backup JSON** : export/import 100% local, zéro appel réseau, protection `window.confirm` avant écrasement.
- **WeekView analytique** : 5 blocs (header, bilan net, tendance calorique, moyennes macros, poids) — zéro librairie chart externe.
- **Weight Tracking** : pesée quotidienne (`TodayView`), stats hebdo avec moyenne et delta (premier/dernier jour saisi) dans `WeekView`.
- **Architecture modulaire** : `App.jsx` orchestrateur pur (54 lignes), séparation stricte constants / utils / hooks / models / ui / layout / views.

### État du build au gel
- `npm run build` : ✅ 0 erreur, 0 warning — bundle stable.
- Aucune dépendance non déclarée. Aucun appel réseau implicite.

### Protocole RUN
- Aucune nouvelle fonctionnalité avant fin du cycle d'évaluation (2026-06-01 au plus tôt).
- Les bugs critiques (perte de données, crash au démarrage) restent éligibles à un patch ciblé.
- Toute décision post-RUN sera documentée dans `4_business_decisions.md`.

---

## 2026-05-10 — Spécifications V2 : AI Bridge (Export LLM)

**Mise à jour documentaire uniquement — zéro modification du code source.**

Spécifications UI/UX et techniques pour la V2 de l'export LLM (AI Bridge) intégrées à `2_project_overview.md` :
- Bouton "Partager au Coach" positionné en bas de `WeekView`, design ghost/secondaire, copie Clipboard API.
- Utilitaire `getHistoricalWeeks(n)` (scope 8 semaines / 56 jours) — filtre localStorage sans modification de schéma.
- Gestion explicite des trous de données et des nouveaux utilisateurs dans le Markdown généré.
- Contrainte de bundle : import lazy, pas d'impact sur le bundle initial ni la charge mémoire.
- Data Layer V1 validée comme suffisante pour un rendu client-side pur sans latence.

---

## Session 2026-05-11 — AI Bridge V2 : implémentation export Markdown presse-papiers

**Dérogation Feature Freeze** : levée partielle exceptionnelle — commit `d01d7c2` sur `main`.

### Fichiers créés / modifiés
- `src/utils/exportUtils.js` *(nouveau)* — `getHistoricalWeeks(n)` : lit `vibefit_v1` dans localStorage, formate les 8 dernières semaines en Markdown, fallback "Aucune donnée saisie pour cette semaine" pour les semaines vides.
- `src/components/views/WeekView.jsx` *(modifié)* — bouton ghost "Partager au Coach" (`ClipboardCopy` → `Check`) + feedback "Copié !" 2s via `useState` + `useCallback`.

### Décisions techniques
- Logique dans `utils/` (pas un hook) : fonction pure synchrone, zéro state React.
- Aucune couleur hors charte — `PALETTE.deep` / `PALETTE.muted` / `PALETTE.line` uniquement.
- Build Vite ✓ — revue react-review ✓ — zéro violation bloquante.

---

## Session 2026-05-11 — Patch bugfix : clé protéine dans exportUtils

**Bug** : `getHistoricalWeeks` affichait systématiquement `P: 0g` dans le Markdown exporté.
**Cause** : `exportUtils.js` lisait `day.intake.prot` alors que le modèle (`day.js`) utilise la clé `day.intake.protein`.
**Fix** : une ligne modifiée dans `src/utils/exportUtils.js` — `prot` → `protein`. Fallback `?? 0` conservé.

---

## [2026-06-01] Hotfix V1.1
- Sync Git vérifiée (branche main à jour avec origin/main).
- Ajout preset diet_break (2500 kcal / 160g protéines) dans src/constants/config.js.
- Alerte rouge 'Sous-alimentation critique' injectée dans TodayView.jsx (intake > 0 && intake < 1600). Zéro nouvel état créé — dérivé de la variable intake existante.

---

## [2026-06-01] Algorithme Sliding Window pour le TDEE Adaptatif

### Contexte
L'algorithme naïf utilisait `.slice(-14)` — toujours les 14 derniers jours, sans évaluation de la qualité des données. En période de logging irrégulier, la fenêtre retenue pouvait être pauvre en données alors qu'une fenêtre antérieure sur 30j aurait été bien plus dense.

### Fichiers modifiés
- `src/utils/adaptiveTDEE.js` — refactoring du moteur de sélection de fenêtre.
- `src/utils/exportUtils.js` — ajout de la période retenue dans le header AI Bridge.

### Algorithme implémenté
- `HISTORY_SCAN_DAYS = 30` : horizon de scan élargi (vs 28 fixe).
- `windowQualityScore(window)` : compte les jours avec **poids ET apport** simultanément présents.
- `findBestWindow(entries)` : évalue les N−14+1 sous-fenêtres possibles, retient le score max. En cas d'égalité, la plus récente l'emporte (scan O(n), pas de sort).
- Dégradation gracieuse : si historique total < 14j, `size = n réel`, aucun crash.
- `dailyImbalance` divisé par `size` (non par 14 hardcodé) pour cohérence en mode dégradé.
- `extractSignals()` retourne désormais `windowStart` et `windowEnd` (dates ISO).

### AI Bridge
Header Markdown enrichi : `| Période : YYYY-MM-DD → YYYY-MM-DD` expose la fenêtre retenue.

### Vérification
- Syntaxe : `acorn --ecma2020 --module` ✅ sur les deux fichiers.
- Aucune régression sur la structure de retour — `windowStart`/`windowEnd` sont des champs additionnels non-breaking.
- Commit : `618eef9` sur `claude/github-sync-status-MRUxV`, poussé sur origin.

---

## [2026-06-07] Audit cohérence Diet Break + fix message hebdo générique

### Contexte
L'utilisateur vient de basculer en preset **Diet Break** avant ses vacances et demande un check de cohérence global (jours d'entraînement, calories, app entière).

### Audit
- `computePresetTargets('diet_break', baseTDEE)` confirmé conforme : TRAIN = OFF = baseTDEE, macros (protéines/lipides) identiques des deux côtés dans `PRESETS.diet_break`, glucides dérivés identiques → aucune incohérence TRAIN/OFF.
- Flux `targets[dayType]` vérifié générique dans `TodayView`/`WeekView` — aucune référence figée à l'ancien schéma `maintenanceKcal` (seule trace : ligne de migration silencieuse dans `useVibefitStorage.js`, volontaire).
- **Incohérence trouvée** : la carte "Rappel hebdo" de `WeekView.jsx` affichait un texte codé en dur pour un contexte de sèche (`"Le déficit hebdo cible est ≈ −1900 kcal"` + logique d'alerte orientée déficit), peu importe le preset actif. En Diet Break (objectif = solde proche de 0), un solde proche de zéro — qui est justement la cible — déclenchait le message "Vérifie que tu saisis bien les calories totales Garmin", laissant penser à une erreur de saisie.

### Fix
- `weeklyReminderCopy(presetId, netBalance, recordedDays)` : nouvelle fonction pure dans `WeekView.jsx` qui adapte le texte et les seuils de feedback selon le type d'objectif du preset actif :
  - `bulk` → message + seuils orientés surplus (cible ≈ +1900 kcal)
  - `cut_light` / `cut_strong` → message + seuils orientés déficit (cible ≈ −1900 kcal, comportement original conservé)
  - `maintenance` / `diet_break` (et `custom`) → message d'équilibre ("objectif : solde proche de 0 — pas de cyclage actif"), tolérance ±700 kcal/semaine pour le feedback positif

### Vérification
- Vérification d'équilibre des accolades sur le fichier modifié — aucune erreur de structure.
- Pas de `node_modules` en environnement remote — build/lint non exécutables ; tester sur machine locale avant merge en prod.

---

## [2026-06-11] Audit complet `/react-review` — 5 correctifs de cohérence

### Contexte
Utilisateur en vacances (Diet Break actif) — audit global de l'app demandé : révéler tout ce qui est incohérent ou bloquant. Inspection via le protocole react-review sur l'intégralité de `src/`.

### Conformité react-rules.md (scan global)
- Zéro classe React ✅ — zéro mutation d'état directe ✅ (les `.push()` détectés sont sur des tableaux locaux dans les utils)
- Tous les `useEffect` ont un tableau de dépendances explicite ✅
- Props déstructurées en signature partout ✅

### 🚫 Bloquants corrigés
1. **`DataView.reset()` crashait l'app** : `setData({ days: {} })` détruisait `targets`/`presetId`/`baseTDEE`/`stepsTarget` → `Header` lisait `targets[t]` sur undefined → écran blanc jusqu'au reload. Reset désormais vers un state complet par défaut.
2. **`calculateWeeklyBalance` ignorait `typeOverride`** : la cible kcal moyenne hebdo était calculée depuis le calendrier pur — les jours basculés manuellement TRAIN/OFF/WE (Header) n'étaient pas pris en compte. Corrigé : `day?.typeOverride || dayTypeFromTargets(key)`.

### ⚠️ Incohérences corrigées
3. **Import backup partiel** : l'export JSON contient targets/presetId/baseTDEE/stepsTarget mais l'import ne restaurait que `days` → perte silencieuse des réglages sur nouvel appareil. L'import restaure désormais les réglages présents (validés par type).
4. **Tuile SÉANCES `plannedTrain || 3`** : un 0 légitime (semaine 100% OFF/WE via overrides — cas vacances) retombait sur 3 → "0/3" rouge culpabilisant. Affiche désormais le vrai planning (0/0 → vert).
5. **Dates UTC vs locales** : `adaptiveTDEE.js` et `exportUtils.js` utilisaient `toISOString()` brut (UTC) — fenêtre TDEE et rapport coach décalés d'un jour entre minuit et ~2h du matin en France. Alignés sur `toKey()`/`addDays()` (date locale, astuce midi).

### ⚠️ Signalés non corrigés (non-bloquants, à arbitrer)
- Pill "Aucune" de TodayView : condition `day.notes.includes('séance:none')` jamais vraie (rien n'écrit ce marqueur) — le pill ne s'affiche jamais actif.
- `NumberInput` ignore les props `step`/`inputMode` passées par TodayView (poids) — props silencieusement perdues, l'input hardcode `inputMode="decimal"`.
- Timers `setTimeout` de feedback (savedFlash/copied/importStatus) sans cleanup à l'unmount — bénin en React 18, mais hors règle stricte.
- `WeekView.jsx` ≈ 575 lignes — très au-delà de la règle des 80 lignes/composant ; découpage à planifier (hors scope d'un audit en feature freeze).

### Vérification
- `node --check` ✅ sur les 4 `.js` modifiés ; équilibre accolades/parenthèses ✅ sur les 2 `.jsx`.
- `node_modules` toujours absent en remote — tester build + parcours réel (reset, import, nuit > minuit) sur machine locale.

---

## [2026-06-11] Refactoring 80 lignes — découpage complet des vues

### Contexte
Demande explicite : découper tous les composants pour respecter la règle des 80 lignes (react-rules §3), sans rien casser, avec architecture propre. Autorisation explicite de déplacer du code.

### Découverte majeure
`npm install` fonctionne désormais en environnement remote → `vite build` exécutable en session. Le point de vigilance "build non vérifiable" est levé.

### Architecture livrée
- **Nouveaux hooks** (`src/hooks/`) — logique métier extraite des vues :
  - `useWeekStats.js` — toute la dérivation hebdo (days, weekly, plannedTrain, séries poids/taille, cibles macros moyennes)
  - `useDayMetrics.js` — métriques du jour (cibles, totaux, alertes macro/sous-alimentation)
  - `useTargetsManager.js` — presets dynamiques, updateField/TDEE, reset
  - `useBackupManager.js` — export/import/reset des données
  - `useTransientValue.js` — feedback éphémère générique avec timer nettoyé à l'unmount (corrige le reliquat "timers sans cleanup" de l'audit)
  - `useClipboardCopy.js` — copie presse-papiers + feedback (bâti sur useTransientValue)
- **Sous-composants par vue** : `views/week/` (10 fichiers), `views/today/` (8), `views/targets/` (5), `views/data/` (2), `layout/DayTypeSwitcher.jsx`, `ui/SectionLabel.jsx`
- **`utils/reminderUtils.js`** — `weeklyReminderCopy()` sortie de WeekView (logique métier pure)
- Les vues sont des orchestrateurs purs : WeekView 573→42 lignes, TodayView 294→36, TargetsView 231→48, DataView 179→17, Header 99→62. **Tous les composants ≤ 80 lignes.**

### Tests (réels, pas seulement syntaxiques)
- `vite build` ✅ après chaque étape (3 checkpoints) et en final.
- **Smoke test SSR** via `react-dom/server` + esbuild : rendu réel de App + les 4 vues + Header avec données Diet Break réalistes (overrides WE, semaine vide, state post-reset) → 12/12 ✅. Invariants vérifiés : Diet Break TRAIN=OFF=baseTDEE, rappel hebdo par preset (équilibre/déficit/surplus).
- Piège rencontré : `renderToString` insère des `<!-- -->` entre nœuds texte — assertions à faire sur le HTML nettoyé.

### Notes
- Aucun changement de comportement voulu — JSX/styles copiés à l'identique, seuls les emplacements et le passage de props changent.
- `package-lock.json` restauré (bruit npm 10.9 : flags `peer` retirés).

---

## [2026-06-11] Fix pill "Aucune" — repos déclaré explicite (workout: 'none')

### Contexte
Reliquat de l'audit : le pill "Aucune" de la carte SÉANCE testait `day.notes.includes('séance:none')`, marqueur que rien n'écrivait jamais → jamais actif.

### Design retenu
Nouveau state explicite `workout: 'none'` = "repos déclaré" (distinct de `null` = "rien saisi") :
- `WorkoutCard` : pill actif si `workout === 'none'`, toggleable comme Haut/Bas.
- `mathUtils.trainDone` : ne compte que 'haut'/'bas' — un repos déclaré n'est pas une séance effectuée.
- `WeekCalendar`/`exportUtils.hasData` : 'none' truthy → le jour compte comme saisi (déclarer son repos est une donnée) — comportement voulu, inchangé.
- Export AI Bridge : affiche "Séance: aucune (repos déclaré)" au lieu de "Séance: none".
- Rétrocompatible : les anciennes données ('haut'/'bas'/null) ne changent pas de comportement.

### Vérification
`vite build` ✅ + smoke SSR ciblé 5/5 (pill actif/inactif, trainDone=2 sur [haut, none, bas], rendu WeekView).

---

## [2026-07-29] Audit calculs — correction du TDEE adaptatif et protocole anti-rationalisation

### Contexte
Audit technique du moteur de calcul nutritionnel. Trois défauts structurels trouvés : le TDEE adaptatif n'alimentait aucune cible, sa formule était fausse d'environ 290 kcal/j, et le protocole anti-rationalisation n'existait qu'en spécification.

### Lot 1 — Math et hygiène du signal
- **Bug principal** : `dailyImbalance` divisait un écart de demi-moyennes par la taille de fenêtre (14 j) alors que cet écart couvre 7 jours — l'intervalle entre les centroïdes des deux moitiés. Sur une série synthétique à TDEE réel 2550, la formule retournait 2259.
- Remplacé par une régression OLS (`olsSlope`), dont la pente est en kg/jour — plus aucune division par la taille de fenêtre.
- Régression sur les poids **interpolés, pas lissés** : la moyenne mobile tronquée aux bords aplatissait les derniers points et coûtait encore 42 kcal/j. La moyenne mobile reste pour `smoothedWeight`, la valeur affichée.
- `weightTrend14d` → `weightTrendPerWeek` : l'ancien champ, un delta à ~7 j d'équivalence, était exporté sous le libellé « Tendance poids 14j » vers le bridge IA.
- Rejet des aberrations (bornes + sauts j/j par test bilatéral), suppression de la propagation à plat en tête/queue d'`interpolateWeights`, recouvrement poids × apport exigé (10 j/14), pénalité de récence sur la sélection de fenêtre.
- `extractSignals(data)` et `getHistoricalWeeks(data, n)` reçoivent le state au lieu de lire `localStorage` — testables.

### Lot 2 — Cohérence des cibles
- `useAdaptiveTargets` + `RecalibrateCard` : branchement **opt-in** du TDEE mesuré. Les cibles ne bougent jamais seules.
- `DEFAULT_TARGETS` dérivé de `DEFAULT_TDEE` (déplacé vers `presetUtils` pour éviter un cycle d'import) : le littéral 2400/1900 n'était sur la courbe d'aucun TDEE unique.
- Écart de cyclage préservé sous le plancher calorique — un TDEE bas donnait TRAIN = OFF = 1600 sans avertissement.
- `macroConflictKcal` signale les macros incohérentes au lieu de les masquer par un clamp à 0.
- Plancher protéines garanti sur tous les types de jour (`clampTargetField`) ; badge compté en jours calendaires au lieu d'une moyenne sur jours saisis.
- `dayType` : la séance loggée prime sur le calendrier.
- Apport et cible comparés sur le même sous-ensemble de jours.
- Suppression de `dayTypeFromTargets` (copie conforme de `dayTypeFromKey`) et centralisation des seuils.

### Lot 3 — Protocole anti-rationalisation
- `plateauProtocol.js` : diagnostic pur croisant TDEE, poids lissé et adhérence. **Aucune action sur les cibles** — les règles R2–R6 restent gelées jusqu'au backtesting.
- Porte d'adhérence prioritaire : un écart de saisie ne peut jamais se présenter comme un plateau.
- Garde-fou rétention d'eau : poids en hausse à tour de taille stable bloque toute conclusion de plateau.
- `toKey` produit désormais une date locale réelle (l'ancienne version restait une date UTC avec 12 h de marge).

### Bug trouvé par le smoke test navigateur
La semaine en cours, incomplète, était jugée comme une semaine finie : un mercredi, 3 jours écoulés sur 7 déclenchaient « Adhérence insuffisante » malgré un logging parfait. Chaque utilisateur l'aurait vu du lundi au jeudi. Corrigé via `elapsedDays` — le diagnostic ne porte que sur des semaines complètes.

### Vérification
- Vitest ajouté — **56 tests**, dont la validation sur séries synthétiques à TDEE connu qui a révélé le bug principal.
- `vite build` ✅
- Smoke test Playwright sur build de production : TDEE mesuré **2551** sur données de vérité terrain 2550 ; recalibration 2000 → 2551 avec TRAIN 2751 / OFF 2351 (écart 400 préservé) ; les trois scénarios de diagnostic discriminent correctement (Progression / Plateau confirmé / Adhérence insuffisante) ; aucune erreur console.

---

## [2026-07-29] Taux des presets calculés dynamiquement + clarification règle CLAUDE.md

### Contexte
Point soulevé en fin d'audit : le preset par défaut ne correspond pas au protocole décrit (TRAIN 2000 / REST 1600 = `cut_strong` @ TDEE 2200, alors que l'app démarre sur `maintenance`). En vérifiant, un défaut plus large est apparu.

### Libellés de presets faux d'un facteur ~2
Les `sub` figés de `config.js` annonçaient des taux ignorant le week-end. Le WE n'ayant aucune cible (`kcal: null`), il est mangé au TDEE et dilue le déficit sur 2 jours sur 7 :

| Preset | Annoncé | Réel (TDEE 2200) |
|---|---|---|
| Sèche légère | −200 kcal/j, ~250 g/sem | −114 kcal/j, 104 g/sem |
| Sèche forte | −400 kcal/j, ~500 g/sem | −257 kcal/j, 234 g/sem |
| Prise de masse | +300 kcal/j, ~300 g/sem | +243 kcal/j, 221 g/sem |

Même racine que le bug `avgKcalTarget` corrigé plus tôt : **le trou du week-end**. Impact : croire perdre 500 g/sem quand on en perd 234, soit ~3 kg d'écart sur 3 mois — écart ensuite attribuable à tort à un « plateau métabolique ».

### Correctif
- `presetWeeklyRate(presetId, baseTDEE)` et `presetRateLabel()` dans `presetUtils.js` : taux calculé depuis les cibles effectives, les jours sans cible étant supposés mangés au TDEE.
- Composition de la semaine **dérivée de `dayTypeFromKey`**, jamais re-codée — pas de troisième source de vérité pour le split.
- Les `sub` de `config.js` deviennent purement qualitatifs ; les chiffres viennent du calcul.
- `KCAL_PER_KG` centralisé dans `config.js` (était privé à `adaptiveTDEE.js`).
- Seuil `RATE_NOISE_KCAL = 50` : en deçà, affiché comme « Maintien » — sous la résolution de toute estimation de TDEE.

### Décision de process
`CLAUDE.md` reformulé pour `2_project_overview.md` : la mention « sans auto-commit » entrait en conflit mécanique avec le hook de fin de session, et n'avait jamais été suivie (12 commits sur 36 touchent ce fichier). L'historique montre que l'intention réelle était « pas de commit séparé pour ce fichier », pas « ne jamais le commiter » — la règle dit désormais explicitement de le fondre dans le commit de travail de fin de session.

### Vérification
`npm test` 63/63 ✅ · `vite build` ✅ · Playwright sur build de production : les 5 taux affichés correspondent au calcul indépendant, zéro erreur console.

---

## [2026-07-29] R3 NEAT_DRIFT dégelée et implémentée

### Contexte
Analyse d'un export terrain couvrant juin–juillet 2026, après ~2 mois sans suivi. Le diagnostic posé à l'époque — « TDEE de base erroné car aucune perte de poids » — ne tenait pas : seuls **3 jours d'apport** avaient été saisis sur toute la période, et la série de poids comportait un −1.5 kg en 24 h (bruit hydrique).

L'explication réelle était dans les données de montre :

| | Juin | Juillet | Écart |
|---|---|---|---|
| Pas / jour | 16 097 | 6 080 | −62 % |
| Dépense Garmin | 2 856 kcal/j | 2 158 kcal/j | −698 kcal/j |

Apport moyen 2 128 vs dépense 2 158 = **−30 kcal/j**. Aucune perte de poids n'était mathématiquement attendue. Le tour de taille (87.5 → 90 cm) confirmait une lente prise de gras, pas un plateau métabolique. L'app n'a rien signalé alors que R3 était spécifiée pour exactement ça.

### Implémentation
- `src/utils/neatDrift.js` — module pur, même forme que `plateauProtocol.js`. Diagnostic seul, aucune modification de cible.
- **Deux détections** au lieu d'une : le trigger d'origine (chute semaine à semaine < 85 %) ne voit pas une érosion lente. Ajout d'une comparaison à une ligne de base de 4 semaines (< 80 %).
- **Indépendant de la porte d'adhérence** : les pas viennent de la montre et restent disponibles quand le suivi alimentaire décroche. Vérifié en conditions réelles — l'alerte NEAT s'affiche pendant que le diagnostic de plateau annonce « 0 jour croisant poids et apport ».
- Impact chiffré en kcal/j via `KCAL_PER_STEP_PER_KG` (0.0005 kcal/pas/kg, conservateur). Non chiffré si le poids est inconnu, plutôt qu'estimé au hasard.
- `computeWeeklyHistory` expose `avgSteps` / `stepsDays`, moyennés sur les jours où les pas sont réellement renseignés.

### Deux défauts trouvés par les tests
1. **Fausse alerte après une semaine exceptionnelle.** Redescendre de 18 000 à 14 000 pas déclenchait « chute d'activité » alors qu'on est à son niveau habituel. La détection brutale est désormais conditionnée à être sous sa propre ligne de base.
2. **Statut périmé.** Si la dernière semaine complète manquait de données de montre, le code jugeait silencieusement la semaine d'avant et affichait « Activité stable » sur des chiffres obsolètes. Un contrôle explicite renvoie maintenant `INSUFFICIENT_DATA`.

### Vérification
`npm test` 75/75 ✅ · `vite build` ✅ · Playwright sur build de production, schéma terrain rejoué : *« Activité en baisse installée — 6 229 pas/j contre 14 554 en moyenne sur les 4 semaines précédentes (−57 %). Soit environ 331 kcal/j de dépense en moins. »*

---

## [2026-07-29] Cible week-end dérivée — dernier trou du modèle de calcul

### Contexte
Décision produit prise après arbitrage : le week-end ne reste plus sans cible calorique. C'était la cause racine dont les deux sessions précédentes n'avaient corrigé que les symptômes (libellés de presets faux d'un facteur ~2, comparaison apport/cible biaisée).

Argument retenu : si la nourriture est le levier de pilotage principal, laisser 29 % de la semaine sans repère est l'incohérence la plus coûteuse qui reste.

### Design
`WE.kcal = max(KCAL_FLOOR, moyenne pondérée des jours de semaine)`. Le week-end se place **entre** TRAIN et OFF — plus souple qu'un jour de repos, sans sortir du protocole. Lipides sur la même moyenne, glucides en résidu.

La pondération vient de `nominalWeek()`, dérivée de `dayTypeFromKey` — pas de recodage du split.

Effet sur les taux annoncés (TDEE 2200) :

| Preset | Avant (WE sans cible) | Après |
|---|---|---|
| Sèche légère | −114 kcal/j · 104 g/sem | **−160 kcal/j · 145 g/sem** |
| Sèche forte | −257 kcal/j · 234 g/sem | **−360 kcal/j · 327 g/sem** |
| Prise de masse | +243 kcal/j · 221 g/sem | **+340 kcal/j · 309 g/sem** |

Le champ reste effaçable : un jour sans cible est alors exclu **des deux côtés** de la comparaison apport/cible, ce qui préserve la correction d'origine (test dédié).

### Vestige corrigé au passage
`useWeekStats.macroTargets` moyennait TRAIN et OFF en ignorant le week-end, et recodait implicitement la composition du split. Remplacé par une moyenne sur les jours **réels** de la semaine affichée, via `dayType`.

### Vérification
`npm test` 79/79 ✅ · `vite build` ✅ · Playwright sur build de production : WE = 2040 kcal (moyenne pondérée de 2200/1800), lipides 72, glucides 188 ; les 5 taux de presets affichent les nouvelles valeurs ; zéro erreur console.

### Décision : gel du moteur
Fin des développements sur le moteur expert. La contrainte n'est plus le code mais la donnée : 3 jours d'apport en historique, 0 semaine exploitable pour le backtesting exigé par la spec §9 (8 semaines minimum, 80 % de déclenchements pertinents). R2, R4, R5 et R6 restent gelées jusqu'à disposer de vraies données.

---

## [2026-07-30] Saisie structurée du sommeil

### Contexte
Les scores de sommeil étaient notés en texte libre dans `notes`, sous des formats variables : « Nuit de 7h00 score 71 », « 6h49 score de sommeil 84 / svf 41 », « Score sommeil 70 7h09 », « 8h16 score 88 ». Ordre, libellés et présence du HRV changeaient d'une entrée à l'autre.

Cette donnée est loin d'être anecdotique : elle explique une partie du bruit de la série de poids. Les notes de mai annotent explicitement les deux points les plus hauts (« ventre très ballonné », « pas allé à la selle depuis 3 jours, tour de taille lié à inflammation »). Sans elles, ces points ressembleraient à une prise de gras.

### Périmètre — capture, pas inférence
**Le gel du moteur est respecté** : on structure une saisie, on n'ajoute aucune règle, aucun seuil, aucun jugement. R2, R4, R5 et R6 restent gelées.

- `models/day.js` — `sleep: { score, durationMin, hrv }`. `durationMin` est la valeur canonique ; l'UI présente heures/minutes, l'analyse a besoin d'un scalaire.
- `today/SleepCard.jsx` — 4 champs (score, HRV, heures, minutes). Les champs de durée sont en mode `onBlur` : en mode immédiat, taper « 55 » minutes passait par « 5 » puis « 55 » et faisait sauter visuellement le champ heures.
- `exportUtils.formatSleep()` — le sommeil part dans l'export Markdown, exploitable par un LLM.
- `mathUtils.aggregateSleep()` — moyennes hebdo, extraites du hook pour rester testables et garder `useWeekStats` sous les 85 lignes.
- `week/SleepAverageRow.jsx` — affichage dans la carte Moyennes. Une métrique saisie mais jamais affichée finit par ne plus être saisie.

### Rétrocompatibilité
Aucune migration. `updateDay` fusionne `{ ...emptyDay(), ...jourStocké, ...patch }` : les jours antérieurs récupèrent le champ par défaut via le spread. Vérifié en conditions réelles avec un jour à l'ancien format — zéro erreur.

### Vérification
`npm test` 93/93 ✅ · `vite build` ✅ · Playwright sur build de production : saisie 6h + 55min → `durationMin: "415"`, affichage hebdo « 6h55 · score 85 · HRV 42 ms · 1 nuit renseignée », zéro erreur console.

---

## [2026-07-30] Sommeil — VFC, FC au repos et correctif d'affichage

### Corrections issues des captures Garmin
1. **La VFC est bien sur l'écran Score de sommeil**, plus bas dans « Métriques de sommeil » — j'avais affirmé à tort qu'elle vivait sur un écran séparé. Aucune navigation supplémentaire, donc relevé quotidien réaliste. Libellé du champ aligné : `HRV` → **VFC** (clé de stockage `hrv` inchangée, terme standard côté code).
2. **Ajout de la fréquence cardiaque au repos** (`rhr`, libellé « FC repos »). C'est le meilleur complément à la VFC : en déficit elle baisse légèrement, alors qu'une hausse à poids stable et tour de taille stable signe un stress ou une rétention d'eau plutôt qu'une prise de gras. Exactement le croisement visé par R6.

Métriques écartées volontairement, malgré leur disponibilité sur le même écran : Body Battery (composite dérivé de VFC + stress + sommeil, redondant), périodes de sommeil agité (trop bruité), SpO₂ et respiration (dépistage d'apnée, sans lien avec la recomposition), variation de température cutanée (bruité au quotidien). Chaque champ est une taxe quotidienne, et l'abandon du log est le point faible historique de l'utilisateur.

Le statut « Équilibrée » (moyenne VFC 7 jours) n'a pas de champ : il compare la moyenne à une ligne de base personnelle qu'on pourra recalculer nous-mêmes une fois 4 semaines de VFC en base. Stocker la valeur brute en ms suffit.

### Défaut d'intégration trouvé par le test navigateur
`SleepAverageRow` était à l'intérieur du bloc conditionné par `weekly.recordedDays > 0`. Saisir uniquement le sommeil — situation normale le matin, avant le premier repas — n'affichait rien du tout. La métrique était capturée puis invisible le jour même de son relevé, soit précisément le mécanisme d'abandon qu'on cherchait à éviter. La ligne sommeil est désormais rendue hors du bloc nutrition, et le message « Aucun jour saisi » ne s'affiche que si ni nutrition ni sommeil ne sont renseignés.

### Vérification
`npm test` 96/96 ✅ · `vite build` ✅ · Playwright sur build de production, chiffres réels de l'écran Garmin : saisie 85 / 46 ms / 52 bpm / 6h55 → stocké `{"score":"85","durationMin":"415","hrv":"46","rhr":"52"}`, affichage hebdo « 6h55 · score 85 · VFC 46 ms · FC 52 bpm · 1 nuit renseignée », zéro erreur console.

---

## Session 2026-07-30 — Direction artistique : re-direction visuelle « Millimétré »

### Ce qui a déclenché la session
Une passe de setup design. Le constat de départ n'était pas celui attendu : il ne
s'agissait pas d'installer une charte sur une app qui n'en avait pas, mais de
**corriger une charte qui violait frontalement deux interdits explicites** :

- `config.js` → `paper: '#F6F2EC'` (crème) + `accent: '#FF5A1F'` (orange), soit à
  un cheveu du pairing crème/terracotta refusé ;
- `FontStyles.jsx` → `.vf-body { font-family: 'Inter Tight' }`, Inter étant banni.

Troisième problème trouvé en chemin, non demandé mais lié : les polices venaient
du CDN Google Fonts, ce qui troue le principe « offline-first » du project bible
— au premier lancement sans réseau, l'app retombait sur la police système, elle
aussi bannie.

### Pourquoi c'était peu coûteux
Le système était déjà tokenisé : `PALETTE` consommé par 46 des 50 `.jsx`, toute
la typo derrière 3 classes dans un seul fichier. Changer de direction = changer
des valeurs, pas réécrire des composants. C'est le refactoring modulaire de
2026-05-04 qui a rendu cette session courte.

### Le seul point réellement délicat
`accent` et `accentDark` signifiaient **deux choses à la fois** : emphase
décorative (marque, nav active, icônes) *et* « hors cible ». Un remplacement
global aurait teint le logo en rouge d'alerte. Les 37 sites ont donc été routés
un par un, ce qui a imposé de trancher une règle qui n'existait pas avant :

- `deep` → dans la cible / atteint / marque
- `warn` → **manque** (pas en retard, séance non faite, apport sous la cible)
- `alert` → **hors bornes** (dépassement, erreur de saisie, perte de données)

Conséquence non triviale : `BalanceRing` avait l'ancien mapping inversé (orange
pour « sous la cible », ambre pour « au-dessus »). Il suit maintenant la règle.

### Deux défauts que seule la capture d'écran a révélés
1. **L'arc de valeur du cadran recouvrait intégralement les graduations.** Avec la
   règle et l'arc au même rayon, la signature s'annulait : on retombait sur un
   donut ordinaire. Corrigé en séparant les rayons — règle à l'extérieur
   (`R_RULE = 64`), valeur à l'intérieur (`R_ARC = 47`).
2. **`ochre #8A5A2B` (lipides) se confondait avec `alert #C6321E`** sur un filet
   de 4 px : « lipides » et « glucides en dépassement » devenaient le même objet
   à l'écran. La teinte n'était pas le problème (ΔH = 23°), la **saturation**
   l'était (ΔS = 0.16). Remplacé par `umber #5F5348`, désaturé (ΔS = 0.61).

### Un piège d'accessibilité trouvé par l'audit
`NumberInput` avait son padding vertical sur le **conteneur**, pas sur
l'`<input>`. Le champ paraissait faire 45 px alors que la zone réellement
cliquable n'en faisait que 25 : taper la marge ne focalisait rien. Padding
déplacé sur l'input — même hauteur visuelle, cible tactile réelle. Le même audit
a fait remonter la chrome du header (40 px) et le `DayTypeSwitcher` (30 px),
corrigés aussi. Zéro élément interactif sous 44 px désormais.

### Vérification
`npm test` 96/96 ✅ (aucun test ne référence couleur ni police, ils servent de
garde sur les imports) · `vite build` ✅ · contraste WCAG AA calculé sur les 19
paires porteuses d'information, toutes conformes, dont `tick`/`surface` 3.55:1
pour les graduations (WCAG 1.4.11) · 8 woff2 précachés dans `sw.js`, zéro
référence CDN dans le `dist` · Playwright sur build de production : les 3
familles auto-hébergées rendent effectivement (`document.fonts.check` vrai),
zéro erreur console, zéro cible tactile sous 44 px.

### Note de direction
La règle graduée donne à l'état vide une valeur qu'il n'avait pas : l'écran sans
données affiche l'échelle complète avec son encoche de cible et une valeur à
zéro — l'instrument est calibré et en attente. L'échelle vide *est* le message.
C'est documenté comme contrainte dans `DESIGN.md` pour éviter qu'une session
future la remplace par un « aucune donnée » textuel.

---

## Session 2026-07-30 (suite) — Rejet de « Millimétré », re-direction « Signal » (Whoop)

### Le retour
Premier rendu de « Millimétré » montré au développeur : jugé « triste et
froide », « aucun fun », pas une application moderne. Référence donnée :
Whoop. Point notable — c'est le développeur lui-même qui avait orienté vers
« Instrument de mesure » / palette froide au moment du choix de direction.
Le retour n'était donc pas une incompréhension de brief mais un jugement porté
sur le résultat *rendu*, que le round de questions textuelles en amont
(3 directions décrites en préview markdown) n'avait pas permis d'anticiper.
Leçon pour une prochaine fois : quand la preview d'une direction est du texte
ASCII plutôt qu'un rendu réel, le risque de décalage entre l'intention validée
et le résultat vécu reste entier tant que rien n'a tourné dans un navigateur.

### Ce qui a été jeté et ce qui est resté
`DESIGN.md` a été réécrit en totalité, pas complété — la nouvelle direction
n'est pas une variante de couleurs de l'ancienne, c'est un vocabulaire visuel
opposé point par point : bouts de tracé `butt` → `round`, rayons `0/2/3` →
`12–20/999`, graduations physiques → glow, fond clair → presque noir. Un seul
élément a survécu intact : le **marqueur de cible**. Ni Whoop ni aucun wearable
de recovery n'en a besoin (leur anneau suit un score continu sans cible fixe),
mais VibeFit suit des macros et des calories *contre* une cible — c'est ce qui
rend l'app différente d'un clone Whoop plutôt qu'un décalque.

### Le piège qu'un remplacement en masse aurait raté
`PALETTE.ink` et `PALETTE.surface` changent de luminance entre les deux
directions (ink : quasi-noir → quasi-blanc ; surface : quasi-blanc →
quasi-sombre). Neuf sites utilisaient `color: PALETTE.surface` comme
raccourci pour « texte clair sur fond sombre » dans l'ancienne palette
(boutons pleins, cellule « aujourd'hui », pills actives). Un renommage
mécanique aurait rendu ce texte illisible (texte sombre sur fond désormais
sombre lui aussi) sans qu'aucun test ne le révèle — les tests ne couvrent ni
couleur ni rendu. Chaque site a été réaudité individuellement et routé vers
`inkSoft` (nouveau token : texte quasi-noir posé sur un remplissage saturé).

### Vérification
`npm test` 96/96 ✅ · `vite build` ✅ · contraste WCAG AA recalculé sur toute
la nouvelle palette, y compris les paires texte-sur-remplissage-saturé
(`inkSoft` sur `deep`/`warn`/`alert`/`slate` : 10 à 12.6:1 ; piège identifié et
évité : `ink` — quasi-blanc — sur `alert` échoue à 2.94:1, d'où le choix
d'`inkSoft` et non `ink` pour ce rôle) · cibles tactiles ≥44px reconfirmées
après le passage aux nouveaux rayons · Playwright sur build de production,
TodayView/WeekView/TargetsView : zéro erreur console, glow visible et
cohérent avec l'état affiché (vert atteint, ambre sous la cible, rouge hors
bornes) sur les trois écrans.

---

## Session 2026-07-30 (suite 2) — Troisième direction : « Los Santos Dusk »

### Le brief
Pas un rejet cette fois — le développeur a validé que l'app était un terrain
de test pour voir jusqu'où la direction artistique peut aller, et a donné sa
propre référence personnelle plutôt qu'une catégorie de produit : GTA San
Andreas, la Californie des années 90, l'architecture, le hip-hop, les couleurs
du cinéma 80s, le streetwear actuel. Un mot du brief (« pornographie ») ne
correspondait à rien dans le reste de la demande ni dans le produit (un
tracker nutritionnel) ; traité comme faisant partie de l'univers culturel
évoqué en vrac plutôt que comme une demande de contenu littéral, et exclu
explicitement dans `DESIGN.md` §0 pour que ce ne soit pas ambigu pour la
prochaine session.

### La traduction, pas la citation
Le risque évident d'un brief aussi référencé (« GTA SA ») est de produire un
décor plaqué sur l'app plutôt qu'un système qui reste un tracker. Le point de
levier a été de repérer que les couleurs de gang du jeu mappent *sans forcer*
sur la sémantique déjà en place : Grove Street (vert, la faction du joueur)
= « dans la cible », Vagos (gold) = « manque », un rouge néon coucher-de-
soleil = « hors bornes ». Rien n'a été sacrifié à la référence : le Ballas
purple réel du jeu (`#9354D9`) échouait l'AA en texte (4.04:1) et a été
éclairci à `#B27CE8` (6.22:1) — la fidélité culturelle s'arrête là où elle
casserait l'accessibilité, et ce n'est pas négociable même sous un brief
très expressif.

### Ce qui ne s'est PAS reproduit
Au tour précédent (« Millimétré » → « Signal »), renommer `PALETTE.paper` en
`PALETTE.bg` et inverser la luminance de `ink`/`surface` avait forcé un audit
ligne par ligne coûteux (9 sites où `color: PALETTE.surface` servait de
raccourci sémantique qui a changé de sens). Cette fois, **tous les noms de
tokens sont restés identiques** — seules les valeurs hex ont changé. Aucun
audit de ce type n'a été nécessaire. Leçon appliquée directement : un système
de tokens protège des changements de valeur, jamais des changements de sens
d'un même nom.

### Ce qui est nouveau structurellement (pas juste de la couleur)
- `Header.jsx` gagne un composant `Skyline` (SVG inline, silhouette d'immeubles
  + palmiers) et un fond en dégradé (`SUNSET`, nouveau token décoratif). Vérifié
  au calcul de contraste que le dégradé échoue l'AA pour du texte passé sa
  bande sombre du haut (2.29:1 sur le stop orange) — décision de layout prise
  en conséquence : tout le texte du header reste dans la bande sombre, le
  dégradé s'ouvre vers le bas en zone strictement décorative.
- Nouvelle fonte auto-hébergée, Anton (poster condensé, 1 graisse), nouveau
  rôle typographique `.vf-hero` réservé au wordmark et aux gros chiffres —
  s'ajoute aux 3 rôles existants, n'en remplace aucun.
- Nouveau helper `sticker(hex, offset)` — ombre dure décalée sans flou, la
  technique du patch sérigraphié plutôt que la carte à ombre floue (toujours
  interdite). Combiné au `glow()` existant sur les pills actives de
  `DayTypeSwitcher` seulement — délibérément pas étendu aux grandes cards,
  où l'effet tournerait au bruit visuel.
- Grain VHS (`body::after`, `feTurbulence` en data URI, opacité 0.035,
  `mix-blend-mode: overlay`) — texture ciné 80s, volontairement sous le seuil
  de perception consciente.

### Vérification
`npm test` 96/96 ✅ · `vite build` ✅ (17 entrées précachées, +2 vs la session
précédente pour les 2 fichiers Anton) · Anton confirmée chargée via
`document.fonts.check` sur build de production · cibles tactiles ≥44px
reconfirmées après l'ajout du sticker · zéro erreur console sur les 3 écrans
(Playwright) · contraste AA vérifié sur toute la nouvelle palette, y compris
le dégradé décoratif (d'où la contrainte de layout ci-dessus).

---

## Session 2026-07-30 (suite 3) — Refonte typographique : sortie d'IBM Plex, entrée du blackletter

### Le retour, et ce que l'audit a confirmé
Le développeur a validé la DA « Los Santos Dusk » mais estimé qu'on pouvait
aller beaucoup plus loin sur les polices pour ressentir l'ADN hip-hop LA. Il
avait raison, et de façon plus embarrassante que « on peut faire mieux » :
`.vf-body` et `.vf-mono` étaient **encore IBM Plex**. Un reliquat de la
première direction (« instrument de labo ») qui avait traversé DEUX
re-directions complètes sans que je le voie. La police corporate d'IBM,
dessinée pour des interfaces d'entreprise, composait tout le texte réellement
lu de l'app. Anton habillait 20 % de l'écran (les gros chiffres) et je
comptais ça comme « la typo est faite ».

Leçon : quand on change de direction, on audite les *rôles* typographiques un
par un comme on auditerait des tokens de couleur. Un rôle qui n'a pas été
touché depuis deux directions est suspect par défaut, pas neutre par défaut.

### Ce que j'ai refusé
Pas de police graffiti/tag. C'est l'option évidente sur un brief « hip-hop
LA » et c'est un piège : illisible en français accentué, et surtout ça crie
l'intention — ça fait déguisement plutôt que direction artistique. Le
blackletter porte la même culture (tatouage chicano, plaques de clubs, *The
Chronic*) avec une vraie histoire typographique derrière, et il reste lisible
si on le contient. Dit au développeur avant de commencer, pas après.

### Le découpage en 5 rôles, et pourquoi c'est ce qui rend le blackletter viable
Le blackletter n'est utilisable QUE si quelque chose d'autre porte la lecture.
D'où 5 rôles au lieu de 4 : `.vf-gothic` (UnifrakturCook) reste cérémoniel —
trois emplacements, casse mixte, ≥16px — pendant que Barlow prend tout le
texte courant. En capitales le blackletter est un mur (« VIBEFIT » en textura
est illisible), donc le wordmark est devenu « VibeFit » en casse mixte, ce qui
est de toute façon plus fidèle au lettrage d'album et de tatouage.

### Deux pièges techniques qui ne se voient ni au build ni aux tests
1. **Faux gras synthétique.** Anton et Archivo Black n'ont qu'une graisse
   réelle (400). Les 11 sites convertis portaient un `fontWeight: 900` inline
   — et un style inline gagne sur la classe, donc le navigateur aurait
   synthétisé un gras par-dessus une fonte déjà noire (ça bave). Il a fallu
   retirer chaque `fontWeight` explicitement, pas juste poser la classe. Un
   `sed` a raté un site (`fontWeight: 900 }}` sans virgule finale là où les
   autres avaient `fontWeight: 900,`) — rattrapé par un grep de contrôle,
   qui est la seule raison pour laquelle je l'ai vu.
2. **Débordement par changement de largeur.** Archivo Black est nettement plus
   large qu'IBM Plex. La légende centrale de `BalanceRing` (« SOUS LA CIBLE »,
   le libellé le plus long possible) est passée à 101 px pour 92 px de passage
   libre au centre de l'anneau, et mordait sur l'arc — visible seulement à la
   capture. Mesurée au `getBBox()` dans le navigateur plutôt qu'estimée, puis
   redimensionnée à 82.9 px. Substituer une fonte display, c'est changer les
   métriques de tous les libellés contraints : il faut mesurer, pas supposer.

### Le chrome
`.vf-chrome` = dégradé argent clippé sur le texte, appliqué au « Vibe » du
wordmark. Le chrome sur coucher de soleil, c'est la plaque de club lowrider.
Piège évité : `color: transparent` + `background-clip: text` non supporté =
wordmark **invisible**. Encadré par un `@supports`, couleur pleine en défaut.
Contraste vérifié sur les 4 stops du dégradé contre la bande haute du header,
le plus sombre passe à 5.61:1 (au-delà du seuil gros-texte requis) et le
fallback à 13.43:1.

### Vérification
`npm test` 96/96 ✅ · `vite build` ✅ (20 entrées précachées, 13 woff2, 276 Ko
pour 5 familles — +8 Ko seulement vs 4 familles, en sortant Plex et Archivo
variable) · les 5 familles confirmées chargées via `document.fonts.check` et
`getComputedStyle(body).fontFamily === 'Barlow, sans-serif'` · pire cas
blackletter mesuré (« Diet Break (Vacances) », 216 px, tient sur une ligne) ·
zéro erreur console · cibles tactiles ≥44px reconfirmées · garde-fous ajoutés
au passage : grep sur `fontWeight` posé sur `.vf-hero`/`.vf-display`, et grep
sur `uppercase` posé sur `.vf-gothic`.

---

## Session 2026-07-30 (suite 4) — La question de la page d'accueil

Le développeur ouvre l'app sur le jour à renseigner, trouve ça pratique, mais
voudrait « une page d'accueil montrant les tendances ou mon état de forme
actuel » — en demandant explicitement qu'on lui dise si c'est une mauvaise
idée. C'est la bonne façon de poser la question, et la réponse honnête est :
l'intuition est juste, la solution ne l'est pas.

### Pourquoi la page d'accueil est le mauvais objet
Trois arguments, dans l'ordre de force :

1. **VibeFit est une app d'écriture.** `TodayView` est le seul écran où l'on
   produit de la donnée. Une home en amont coûte un tap sur 100 % des
   ouvertures pour servir une info consultée une fois par semaine.
2. **Le contenu existe déjà, en entier.** `WeekView` a `DiagnosisCard`,
   `NeatCard`, `KcalTrendCard`, `WeightCard`, `AveragesCard`. Une home
   « tendances » serait un troisième endroit affichant le même delta de poids.
3. Et surtout, ça ne règle pas le vrai problème.

### Le vrai problème
L'app **sait des choses qu'elle ne dit pas**. `plateauProtocol.js`,
`neatDrift.js`, `adaptiveTDEE.js` — le plus cher à écrire du projet — ne
vivent que dans un onglet qu'il faut penser à ouvrir. Or le cas terrain
fondateur de R3, celui qui a justifié de dégeler la règle, est exactement
celui qu'on n'ouvre pas : les pas ont chuté de 62 % pendant deux mois sans
que rien ne le signale. Un diagnostic qui attend qu'on vienne le chercher
n'est pas un diagnostic. C'est ça que l'intuition avait senti — pas « il
manque une page », mais « l'app ne me parle pas ».

### Ce qui a été fait
Une bande d'état en haut de `TodayView`, sur le jour courant : titre de
verdict, une phrase, une ligne `−0,48 kg/sem · TDEE 2 690 kcal · conf. 100 %`.
Un tap ouvre `WeekView` pour le détail. Zéro tap ajouté, le jour reste
l'atterrissage.

La discipline qui compte est dans `useVibeStatus` : il **rejoue** les hooks de
`WeekView` avec la même résolution de cibles (`targets ?? DEFAULT_TARGETS`)
au lieu de recalculer. La bande et l'onglet Semaine ne *peuvent pas* diverger
— c'est exactement le risque que je reprochais à la page d'accueil, il fallait
donc l'éliminer par construction et pas par vigilance. Corollaire assumé :
`extractSignals` tourne 3× par rendu au lieu de 2× dans `WeekView`. Balayage
de 30 jours en mémoire, non mesurable ; mutualiser aurait demandé de réécrire
deux hooks existants pour rien.

`summarizeStatus()` est un pur arbitre : il ne calcule aucun diagnostic, il
choisit lequel publier et le raccourcit. Le seul point d'ordre non évident est
la **rétention d'eau, placée avant les avertissements**. Son rôle est
d'empêcher une coupe calorique injustifiée ; la faire passer derrière un
signal plus alarmant produirait exactement la décision qu'elle interdit.

Deux silences volontaires, qui sont la moitié de l'intérêt de la chose : la
bande disparaît quand on feuillette un jour passé (elle parle de MAINTENANT,
elle mentirait) et disparaît entièrement sur installation neuve (aucun chiffre
à montrer ⇒ `null`, plutôt qu'un cadre vide au-dessus de la saisie).

### Ce que les tests n'auraient pas vu
Comme au tour précédent avec `BalanceRing`, la régression était une largeur.
Au premier rendu la ligne de mesure passait sur deux lignes, orphelinant
« 100 % » et faisant grossir la bande de 13 px. Mesurée dans le navigateur —
et ma première mesure était fausse : un `<div>` bloc fait toujours la largeur
de son conteneur, il faut mesurer le **texte** via un `Range` et compter ses
`getClientRects()`, qui sont les lignes réelles. Corrigée en abrégeant
« confiance » → « conf. », en resserrant les séparateurs et en descendant à
10 px : 316 px → 283 px. Vérifié à 390 px **et à 360 px** (Galaxy S), le
format où la version 11 px cassait sans qu'on le voie à 390.

### Vérification
`npm test` 106/106 ✅ (10 ajoutés) · `vite build` ✅ (20 entrées précachées,
inchangé) · rendu Playwright sur build de production, 2 scénarios (dérive NEAT
du cas terrain, sèche qui progresse) × 2 viewports (360/390 px) · ligne de
mesure sur 1 ligne dans les 4 cas · titre le plus large 177 px pour 282 px de
passage · fonte confirmée Archivo Black @400 (pas de faux gras) · tap →
Semaine ✅ · bande masquée en J-1 et sur installation neuve ✅ · zéro erreur
console · hauteur de la cible tactile 58–98 px (≥44 requis).

---

## Session 2026-07-30 (suite 5) — « Assure-toi que le design est vraiment cohérent »

Demande de vérifier la cohérence de la bande d'état avec la DA, quitte à créer
des graphiques qui n'existaient pas. L'audit donne raison à la demande, et
assez durement : **la bande que je venais de livrer était l'élément le moins
VibeFit de l'application.**

### Le constat
Un rectangle à bordure colorée, icône + trois lignes de texte. La signature du
projet — piste/anneau lumineux à bouts ronds, glow dans la couleur d'état,
marqueur de cible — en était totalement absente. Et surtout : j'affichais
« −0,48 kg/sem » **en texte** dans une application où chaque valeur, sans
exception, est un tracé qui glowe contre sa cible. Typographiquement conforme,
visuellement étranger.

### Ce que j'ai ajouté, et pourquoi ce n'est pas de la décoration
Le réflexe aurait été d'ajouter du glow et une ombre sticker sur la bande. Ça
aurait été du vernis. La signature de VibeFit n'est pas un effet, c'est un
**mécanisme** : une valeur contre une cible.

Le poids était la seule métrique du produit à y échapper — non pas parce
qu'elle n'a pas de cible, mais parce que sa cible n'était nulle part exprimée.
Or `presetWeeklyRate()` existait déjà et donne le rythme que l'objectif en
cours prédit. D'où le tracé : poids lissé 30 jours, contre la trajectoire du
preset en ligne de guide. Le marqueur de cible devient une ligne, et **l'écart
entre les deux courbes est littéralement la perte de poids qui manque**. Le
guide vient de la même fonction que le libellé de `PresetPickerCard` : il ne
peut pas annoncer un rythme différent de l'écran Cibles.

Le meilleur cas de test le montre bien : « PLATEAU CONFIRMÉ » avec une courbe
réelle plate pendant que le guide tireté s'échappe vers le bas.

### Deux erreurs que je n'aurais pas vues sans mesurer
1. **L'échelle auto-ajustée ment.** Au premier rendu, un guide « maintenance »
   écarté de 0,12 kg occupait 40 % de la hauteur du tracé et se lisait comme
   une divergence grave. Sans axe chiffré, rien ne dit au lecteur si l'écart
   vaut 0,1 kg ou 5 kg — une sparkline qui s'ajuste toujours à son contenu
   amplifie le bruit jusqu'à lui donner l'allure d'une tendance. Corrigé par un
   plancher d'amplitude (`minSpan`, 1 kg dans la bande) : au-dessus on ajuste,
   en dessous on centre dans une fenêtre fixe et un petit écart a enfin l'air
   petit. C'est le paramètre le plus important du composant.
2. **Deux gris indiscernables, invisibles à l'œil.** J'allais tracer la courbe
   en `muted` sur la tonalité neutre, avec le guide en `tick`. Le validateur de
   palette donne ΔE 7.5 en vision **normale** — sous le seuil dur de 15, donc
   illisible pour tout le monde, pas seulement en daltonisme, et qu'aucun
   encodage secondaire ne rachète. Passé à `ink` : ΔE 36. Je n'aurais jamais
   attrapé ça en regardant l'écran, les deux gris « semblaient » différents.
   La paire `alert`/`tick` reste à ΔE 6.0 en protanopie, tolérable uniquement
   parce que le guide est tireté.

### Détails qui se paient au rendu si on ne les prévoit pas
- **Le point d'arrivée ne peut pas être un `<circle>`.** Le viewBox est étiré
  en x (`preserveAspectRatio="none"` pour occuper toute la largeur), un cercle
  y devient une ellipse. Un sous-tracé de longueur nulle à bout rond avec
  `vector-effect="non-scaling-stroke"` se dessine dans l'espace écran : rond à
  n'importe quelle largeur.
- **Le tireté est un anti-pattern sur une grille**, parce qu'il fait lire
  « projection » là où il n'y a qu'un repère. Ici la ligne *est* une
  projection : c'est le seul cas où il dit la vérité. Il sert au passage
  d'encodage secondaire — les deux séries restent séparables sans couleur.
- **Un seul axe**, les deux séries étant la même mesure (kg).
- **Pas d'infobulle**, contrairement au défaut pour un graphique HTML : la
  bande entière est une cible tactile unique vers `WeekView`, où `WeightCard`
  liste déjà les mêmes pesées en tableau. Le drill-down existe, il est juste
  d'un cran au-dessus.
- La ligne de mesure **cède** la tendance au tracé. La répéter en texte à 3 cm
  de la courbe aurait été exactement la duplication que je refusais à une page
  d'accueil au tour précédent.

### Vérification
`npm test` 111/111 ✅ (5 ajoutés) · `vite build` ✅ · rendu Playwright sur build
de production, **3 scénarios × 2 viewports** (360/390 px) : dérive NEAT du cas
terrain, sèche qui progresse (courbe sous un guide plat), et plateau sous sèche
(guide en pente contre courbe plate — le cas le plus parlant) · guide confirmé
plat en maintenance et en pente en `cut_strong` · ligne de mesure sur 1 ligne
partout · zéro erreur console · garde-fous grep du projet repassés (aucun
`fontWeight` sur `.vf-hero`/`.vf-display`, aucune capitale sur `.vf-gothic`,
aucune ombre floue générique).

---

## [2026-08-01] Fix décalage de date PWA — `dateKey` figé au réveil de l'app

### Contexte
Signalé avec captures d'écran : téléphone samedi 1er août 6h33, la PWA installée
affichait encore vendredi 31 juillet en écran d'atterrissage (`TodayView`).

### Fausse piste écartée
`toKey()` (`dateUtils.js`) a déjà été audité deux fois (`93168da`, `9f9b252`) et
produit une vraie date **locale** — aucun décalage UTC possible en France sur ce
créneau horaire (6h33 heure d'été = 4h33 UTC, même jour calendaire des deux
côtés). Le bug n'est pas dans le calcul de la date, il est dans le moment où il
s'exécute.

### Cause racine
`App.jsx` : `const [dateKey, setDateKey] = useState(() => toKey(new Date()))` ne
s'évalue qu'**au montage**. Une PWA installée sur iOS/Android n'est pas
rechargée à chaque réouverture — l'OS suspend le contexte JS en arrière-plan et
le restaure tel quel. Téléphone verrouillé vendredi soir, rouvert samedi matin
sans reload complet ⇒ `dateKey` restait la valeur calculée au dernier montage
réel (vendredi).

### Fix
Nouveau hook `hooks/useCurrentDateKey.js` : mêmes garanties de `useState`, plus
un effet qui réécoute `visibilitychange`/`focus` et recalcule `toKey(new
Date())`. Ne fait avancer `dateKey` que s'il pointait encore sur l'ancien
« aujourd'hui » (`todayRef`) — une navigation manuelle vers un jour passé dans
`WeekView` (qui réutilise le même `setDateKey`) n'est jamais écrasée par le
réveil de l'app. `App.jsx` passe de `useState` brut à ce hook, import `toKey`
retiré (plus utilisé directement dans le fichier).

### Vérification
`npm test` 111/111 ✅ (aucun test existant ne couvrait ce chemin — pas de test
ajouté, la logique dépend d'événements DOM `visibilitychange`/`focus` que jsdom
ne simule pas de façon représentative d'un vrai cycle de suspension PWA ;
vérifié manuellement par lecture du hook et par le raisonnement `todayRef`) ·
`vite build` ✅ (20 précaches, inchangé).

---

## Session 2026-08-03 — Sommeil diagnostiqué, chantier structuré, import non destructif

Session partie d'une question produit (« connecter VibeFit à Garmin ? »), qui a
dérivé sur l'audit des instructions du Coach Expert, lequel a mis au jour quatre
défauts de l'app. Les quatre sont traités ici.

### 1. Le sommeil était collecté mais muet

`SleepCard` structure 4 champs depuis juillet (score, durée, VFC, FC repos).
Vérifié par grep : ils n'apparaissent que dans `aggregateSleep` (affichage) et
`formatSleep` (export). **Aucun diagnostic ne les lisait** — ni `extractSignals`,
ni `plateauProtocol`, ni `neatDrift`, ni `vibeStatus`. Une métrique saisie chaque
matin sans jamais rien conclure est une corvée, pas un instrument.

`utils/sleepDiagnosis.js`, calqué sur `neatDrift.js` :
- **DETTE** — durée moyenne < `SLEEP_DEBT_MIN` (390 min). Seuil **absolu** et non
  relatif à une habitude : s'habituer à dormir peu n'en annule pas le coût.
- **TENSION** — VFC < 85 % de sa ligne de base, ou FC repos > baseline + 5 bpm,
  sur la dernière semaine complète. Seuils **relatifs** ici, à l'inverse : une
  VFC ne se compare qu'à elle-même, 38 ms n'est « bas » que si l'habitude est 49.
- Ligne de base sur 4 semaines, exige ≥ 2 semaines de recul avant de parler de
  tension ; une seule semaine ne distingue pas une chute d'une valeur normale.
- Non soumis à la porte d'adhérence, comme le NEAT — et l'argument est plus fort
  encore ici : un mauvais sommeil dégrade le contrôle alimentaire, donc les
  semaines où la saisie s'effondre sont les moins bien placées pour rester
  muettes sur leur cause probable.

**Ordre d'arbitrage dans `summarizeStatus`** — le point non évident : `STRAIN`
est placée **avant** le plateau confirmé. Même raisonnement que la rétention
d'eau placée avant les avertissements : un plateau annoncé sur un organisme mal
récupéré appelle une coupe calorique, qui est exactement la mauvaise réponse.
L'ordre encode une règle de sécurité, pas une hiérarchie de gravité. `DEBT` reste
en avertissement, derrière la chute d'activité aiguë (datée, plus urgente).

### 2. Le chantier vivait en texte libre

`models/day.js` gagne `heavyWork: false`. Même argument que pour le sommeil deux
sessions plus tôt : en texte libre, l'information n'est exploitable qu'à la
lecture. Or elle conditionne l'interprétation du TDEE — la fenêtre de 14 jours
contient 4 jours de week-end, et selon qu'ils aient été chantier ou repos la
dépense mesurée se décale de plusieurs centaines de kcal.

**Séparé de `workout` à dessein** : une séance loggée bascule le type du jour
(donc sa cible calorique) ; un chantier ne doit pas, sinon un samedi de travaux
servirait la cible d'un jour d'entraînement programmé. Test dédié sur ce point.

`extractSignals` expose `heavyWorkDays` (comptage sur la fenêtre retenue). Ne
corrige **rien** au calcul : c'est une mesure de représentativité, pas un
facteur. Deux fenêtres de même qualité formelle ne décrivent pas la même vie.

Couleur du pill : `umber`, pris à la rampe **catégorielle** (DESIGN.md §1) et non
aux couleurs d'état — un chantier qualifie la nature d'une journée, il n'est ni
un manque (`warn`) ni un dépassement (`alert`).

### 3. L'export ne disait pas le protocole

`formatProtocol()` : preset, cibles TRAIN/OFF/WE, plancher protéines, objectif de
pas. Les cibles sont **lues** depuis `data.targets`, jamais recalculées — la
source de vérité reste le state. Cas concret que ça règle : le preset Sèche forte
impose 170 g de protéines et non 160, écart invisible pour quiconque lisait le
rapport avec des chiffres mémorisés.

### 4. L'import perdait des données en silence

`useBackupManager` fusionnait via `{ ...prev.days, ...parsed.days }` — remplacement
au niveau du JOUR. Correct pour restaurer une sauvegarde, destructeur pour un
apport partiel : un fichier ne portant que dépense/pas/sommeil effaçait les macros
saisies à la main.

`backupUtils.mergeDays` + `fillBlanks` : fusion récursive qui ne remplit que ce
qui est vide. **Arbitrage explicite** — en cas de désaccord entre valeur importée
et valeur saisie, c'est la saisie qui gagne. C'est le seul choix sûr :
l'utilisateur peut corriger une valeur qu'il voit, jamais en retrouver une qu'il
n'a pas vu disparaître. Un jour absent est créé sur la forme d'`emptyDay()` et
jamais recopié tel quel — un objet partiel priverait les vues des clés qu'elles
déstructurent.

Deux chemins d'import distincts dans l'UI (« Restaurer » / « Fusionner »), avec
leur conséquence écrite sous le libellé. La fusion est **sans confirmation** :
rien n'est écrasé, il n'y a rien à confirmer. `BackupCard` dépassait les 80
lignes avec un troisième bouton → `BackupButton.jsx` extrait.

### Régression trouvée en écrivant les tests

Le test de non-vacuité de la semaine (`hasAnyData`) et celui du jour avaient
divergé : la version semaine ignorait le sommeil **et** la dépense en kcal. Une
semaine où seules les nuits étaient renseignées s'annonçait « Aucune donnée
saisie pour cette semaine » alors que le rapport contenait ses relevés. Prédicat
unique désormais, partagé par les deux appels.

### Vérification

`npm test` **149/149** ✅ (111 → 149, +38) · `vite build` ✅ · **contrôle au
rendu** en Chromium 390 px avec un jeu de 36 jours déclenchant la tension :
verdict correct dans la bande, carte Semaine présente, pill chantier mesurée à
44 px de haut (cible tactile DESIGN.md §5), trois boutons de backup lisibles,
**zéro erreur console, zéro débordement horizontal**. Le repo a deux précédents
de régressions invisibles au build et trouvées seulement au rendu — d'où le
contrôle systématique.

---

## Session 2026-10-24 — Reprise : audit, sauvegarde, schéma v2

### Contexte
Aucune saisie du 20/08 au 23/10/2026. Arrêt médical depuis le 29/08 (effort
interdit, marche autorisée) jusqu'à l'épreuve d'effort du 01/03/2027. Garmin
remplacée par une Apple Watch le 19/10. Session menée en audit d'abord, puis une
étape à la fois avec validation entre chaque.

### Audit — constats principaux
- « Intégration Garmin » = saisie manuelle uniquement, aucune source stockée.
- TDEE aujourd'hui `null` (confiance 0 %) — juste, mais **par accident** : le
  19/08 est sorti de l'horizon de 30 jours. Rien n'empêchait l'interpolation de
  traverser un trou, et le seuil est 10 jours croisés, pas 14.
- Les cibles suivent le calendrier lun/mer/ven = TRAIN même sans séance.
- `baseTDEE` stocké : **2000** (défaut), pas les ~2330 de mémoire.
- La restauration aurait perdu tout nouveau champ racine.

### Étape 0 — sauvegarde et inventaire (hors dépôt)
Copies en lecture seule + SHA-256. Inventaire `export.xml` : Garmin (« Connect »)
présent jusqu'au **28/09** seulement (synchro interrompue, montre pourtant
portée) ; Garmin n'écrit **aucune VFC** dans Santé ; iPhone seul ≈ 49 % des pas
Garmin ; l'Apple Watch écrit SDNN **et** RMSSD. Rien importé.

### Étape 1 — schéma v2
`models/protocol.js` (pur) : `migrateData`, `sanitizeProtocol`,
`restorableProtocol`, `isExcluded`, `periodAt`, `phaseAt`, `deviceAt`,
`measureSource`. Branché au chargement, à la restauration et au reset ; export
horodaté à la minute (`backupFileName`) avec `exportedAt` ; rapport enrichi
(`formatContext`, source des pas/sommeil, marque de coupure).

**Écart corrigé en cours de route** : ajouter `source` à `emptyDay()` cassait
4 tests de forme. Le champ reste optionnel (absent ⇒ déduit) plutôt que de
réécrire ces tests — la forme d'un jour vide n'a pas à changer.

### Vérification
`npm test` **172/172** (149 → 172) · `vite build` ✅ · test sur **copie** des
données réelles : 56 jours et réglages strictement identiques après migration et
restauration du fichier de protocole, `extractSignals` identique, aller-retour
JSON stable. ESLint : aucune config dans le dépôt, non exécutable.

### Étape 2 — la coupure dans les calculs nutritionnels
- `adaptiveTDEE.bySegment` : rejet des aberrants, interpolation et lissage
  appliqués **par segment** continu hors coupure. Sans coupure, un seul segment
  ⇒ résultat strictement identique (testé).
- `findBestWindow` écarte toute fenêtre contenant un jour coupé et renvoie
  `null` s'il n'en reste aucune : la dégradation « fenêtre tronquée » aurait
  publié un TDEE sur 3 jours de reprise.
- `computeWeeklyHistory` : nutrition vidée sur les jours coupés, pas/sommeil
  intacts (leur exclusion relèvera de la source, étape 6), `excludedDays`.
- `diagnose()` : seules les semaines après la dernière semaine coupée.
- **Défaut trouvé au rejeu sur copie** : à J10 de la reprise, le diagnostic
  annonçait « 0 jours croisant poids et apport » (aucune fenêtre ⇒ overlap 0)
  alors que 10 jours étaient saisis. Message dédié dans `diagnose()` et
  `useAdaptiveTargets`.
- **Effet de bord voulu** : le TDEE ne peut plus paraître avant 14 jours
  calendaires après la coupure (avant : dès 10 jours croisés). La règle stricte
  « 14 jours croisés » reste l'objet de l'étape 4.

Vérification : `npm test` **182/182** · `vite build` ✅ · contre-épreuve :
4 tests de coupure échouent sur l'ancien moteur · rejeu sur copie réelle au
19/08 (identique avec/sans coupure), 10/09, 24/10, et sur une reprise FICTIVE
de 14 jours (J10 : pas de TDEE ; J14 : 2050, fenêtre 24/10 → 06/11).

### Étape 3 — phase « Arrêt médical » et cible unique
- `config.PHASE_TYPES` (règles `cycling`/`training`), `REST_DAY_TYPE`.
- `protocol.isCyclingSuspended` / `isTrainingSuspended`.
- `dayType(key, day, phases)` : `rest` en priorité absolue pendant la phase.
- `presetUtils.computeSingleTarget`, `resolveTargets`, taux `{ cycling: false }`.
- `mathUtils.nutritionScope` partagé par l'historique et `useWeekStats` :
  le solde de l'onglet Semaine ne compte que les jours hors coupure
  (demandé le 2026-10-24), dénominateur « x / y jours saisis ».
- UI : `PhaseBadge`, `PhaseRestCard`, `PhaseCard` (+ `usePhase`,
  `usePhaseManager`, clôture confirmée à partir de la fin prévue).

**Défaut trouvé au rendu** : l'onglet Semaine affichait « 1 / 7 jours saisis »
sur la semaine du 19/10, dont 5 jours sont dans la coupure. Corrigé.

Vérification : `npm test` **204/204** (+22) · `vite build` ✅ · rendu Chromium
390 px sur copie réelle + protocole : badge, carte « Séances suspendues »,
carte de phase, taux des presets en cible unique, zéro erreur console, zéro
débordement, jours intacts en localStorage ; 19/08 : sélecteur TRAIN/OFF
présent ; 01/12/2026 : pas de bouton de clôture ; 02/03/2027 : bouton,
confirmation, `endedAt` écrit.

### Étape 4 — calibration du TDEE et corrections de phase
- `config.CALIBRATION_REQUIRED_DAYS = 14`, champ `calibration` dans le schéma.
- `adaptiveTDEE` : `crossedValues`, `calibrationState` (compte cumulé,
  monotone), jours < `start` neutralisés, `adaptiveTDEE` et `hasEnoughData`
  forcés à null/false tant que la calibration est active.
- `plateauProtocol` : `DIAGNOSIS.CALIBRATING` en tête ; semaines commencées
  avant `start` jamais jugées. `vibeStatus` : `STATUS_KIND.CALIBRATING`.
- `useAdaptiveTargets`, export : message de calibration avec TDEE de départ.
- Phase (demande du 2026-10-24) : « Clore la phase » disponible à tout moment,
  confirmation rappelant la fin prévue ; fin prévue éditable (input date,
  refus si antérieure au début, vide = sans date).
- Fichier de données hors dépôt : protocole v2 (TDEE 2050, cibles
  Maintenance recalculées, calibration au 24/10). La v1 est conservée.

Vérification : `npm test` **217/217** (+13) · `vite build` ✅ · rendu
Chromium 390 px sur copie + protocole v2 : badge « cible unique 2050 », bande
« Calibration en cours 1/14 », carte TDEE idem, édition de la fin prévue
(15/03/2027 écrite, 01/08/2026 refusée), clôture anticipée annulée sans
effet, jours intacts, zéro erreur, zéro débordement.

### Étape 5 — suspensions pendant la phase
- `plateauProtocol.diagnose` : paramètre `trainingSuspended` (alimenté par
  `isTrainingSuspended(aujourd'hui)` dans `usePlateauDiagnosis`). Placé APRÈS
  les portes de données et d'adhérence et la rétention d'eau, qui ne
  supposent pas d'entraînement ; remplace plateau ET progression.
- `vibeStatus` : `STATUS_KIND.PLATEAU_SUSPENDED`, ton neutre — jamais d'alerte.
- `reminderUtils.phaseReminderCopy` + `ReminderCard({ phase })` : compare
  l'apport moyen des jours saisis (hors coupure) à la cible unique, seuil
  ±100 kcal. Le rappel ordinaire est conservé hors phase.
- Spec § 7 : R2, R4, R5 et le plateau non applicables en phase
  `medical_stop` ; tout dégel futur doit tester `isTrainingSuspended`.

Vérification : `npm test` **228/228** (+11) · `vite build` ✅ · rendu sur copie
+ protocole v2 : rappel du 24/10 (« 2040 kcal/j sur 1 jour saisi, −10 kcal,
dans la cible ») ; reprise FICTIVE au 25/11 : bande « Plateau non évalué »,
carte Diagnostic idem, zéro erreur, zéro débordement.

### Étape 6 — sources, références Apple, calories montre hors calcul
- `config` : `WATCH_SOURCES`, `SLEEP_STRAIN_MIN_BASELINE_WEEKS = 4`, libellé
  « iPhone seul — sous-estimé ».
- `protocol` : périodes `partial` (scope `recovery`), `isReferenceMeasure`.
- `mathUtils` : pas/sommeil de l'historique filtrés par montre de référence ;
  `targetGap` ; `watchStepsAverage`, `proteinAverage` ; `hrvSdnn` agrégé.
- `sleepDiagnosis` : `strainEnabled`, `minStrainBaselineWeeks` (le hook passe
  `!phase` et 4) ; dette conservée.
- UI : `StepsSourceToggle` (bouton « Pas iPhone seul »), RMSSD + SDNN dans
  `SleepCard`, « DÉPENSE MONTRE · INFO », en-tête « ÉCART CIBLE », séances
  masquées en phase, rappel avec leviers protéines / pas montre en tête.
- Export : SDNN, jours partiels groupés, marque « mesure montre partielle ».
- Tests modifiés (attentes, pas de suppression) : libellé iPhone dans
  `protocol.test.js`, forme de `aggregateSleep` (+ `hrvSdnn: null`).

**Contre-épreuve** : 15 000 pas Garmin puis 9 000 pas Apple ⇒ `SUSTAINED_DRIFT`
sans sources, `STABLE` avec. **Incident outillage** : un `pgrep -f` de nettoyage
a tué son propre shell (motif présent dans la ligne de commande) — sans effet
sur le code, à éviter (filtrer sur `[v]ite/bin`).

Vérification : `npm test` **246/246** (+18) · `vite build` ✅ · rendu sur copie
+ protocole v3 + vraies mesures Apple Watch 19–24/10 de l'inventaire (copie
seulement) : source « Apple Watch » déduite, bascule iPhone seul aller-retour,
« ÉCART CIBLE −10 », rappel « ⚠ Protéines 148 g/j… sous le plancher » puis
« Pas montre 8 427/j sur 4 jours », zéro erreur, zéro débordement.

### Étape 7 — saisie Apple (option A)
- `AppleEntryGuide` (`<details>` replié) : pas, durée, RMSSD nuit, SDNN,
  FC repos ; rappel du bouton « Pas iPhone seul ». Affiché les jours où la
  chronologie dit Apple Watch. Libellés des écrans Santé non cités : à
  confirmer sur l'iPhone plutôt qu'inventés.
- `protocol.formatInfoActivities`, `InfoActivitiesCard`, ligne d'export
  « Activités (info) ». Champ hors `emptyDay()` : forme d'un jour inchangée.
- Fichiers d'import (scratchpad, hors dépôt) : Apple 19–24/10 (pas 24/10
  exclus, journée en cours ; nuits attribuées à la date de réveil ; VFC =
  moyenne des échantillons pendant le sommeil) et activités du 12/10.
- Vérification hors phase (demandée) : 12/08 et après clôture affichent
  `targetGapReminderCopy` ; `weeklyReminderCopy` n'est plus appelée.

**Défaut de test trouvé** : mon script de rendu ciblait le premier
`input[type=file]` (Restaurer, confirm refusé ⇒ rien importé). Le second est
Fusionner. Corrigé dans l'outillage, pas dans l'app.

Vérification : `npm test` **252/252** (+6) · `vite build` ✅ · fusion par
l'UI sur copie : 6 jours ajoutés, jours d'origine intacts, carte « Activités
enregistrées · info », guide présent, zéro erreur, zéro débordement.

### Nettoyage
- `weeklyReminderCopy(presetId, targetGap, comparableDays)` réécrite à la
  demande du développeur (ne pas supprimer) : objectif propre au preset,
  conséquence seulement hors ±100 kcal/j, plus aucune mention de Garmin, du
  solde ni des calories montre. Rebranchée dans `ReminderCard` hors phase,
  à côté de `targetGapReminderCopy` (le chiffre). Le test d'étape 5 qui
  figeait l'ancien texte est remplacé par un test du nouveau contrat.
- `WeekDiagnostics.jsx` extrait de `WeekView.jsx` (88 → 77 lignes).
- Amélioration future notée : cibles non historisées.

**Procédure finale rejouée** dans Chromium à partir de la sauvegarde brute
(`vibefit_v1` v1) : migration (jours identiques) → Restaurer protocole v3
(TDEE 2050, 1 phase, 6 périodes, calibration 24/10, jours identiques) →
Fusionner Apple 19–24/10 (6 jours ajoutés) → Fusionner 12/10 (1 jour ajouté)
→ 0 jour d'origine modifié, 63 jours. Badge « cible unique 2050 », bande
« Calibration en cours 0/14 », rappel avec pas montre 8 427/j sur 4 jours.

Vérification : `npm test` **252/252** · `vite build` ✅ · zéro erreur console,
zéro débordement.


## Session 2026-10-24 (suite) — Backlog priorisé, PR n°3 : CI

Après le merge de la PR #16, backlog d'améliorations priorisé (impact pour le
suivi / effort), validé par le développeur et inscrit dans
`2_project_overview.md`. Ordre : CI → protection des données → visibilité de
la calibration → historique des cibles ; les deux derniers avant le 06/11
(premier TDEE mesuré possible). Linter reporté à une PR séparée.

### n°3 — CI
- `.github/workflows/ci.yml` : `npm ci`, `npm test`, `npm run build`, sur
  chaque PR et chaque push sur `main`. Node 20, aligné sur `netlify.toml`.
  Permissions en lecture seule, annulation des runs dépassés.
- Constat : aucune CI ni aucun linter jusqu'ici ; `npm run lint`, cité dans
  `CLAUDE.md`, n'existe pas.

Vérification locale des mêmes étapes : `npm ci` ✅ · `npm test` **252/252** ·
`vite build` ✅.

## Session 2026-10-24 (suite) — PR n°1 : protection des données

PR #17 (CI) mergée sur instruction du développeur ; backlog vérifié sur `main`.

- **Stockage persistant** : `useStoragePersistence` demande
  `navigator.storage.persist()` au lancement (après `persisted()`), statut
  `pending` / `persisted` / `denied` / `unsupported`, cleanup par drapeau
  `cancelled`. Affiché dans la carte PROTECTION de Données.
- **Date du dernier export** : champ racine `lastBackupAt`. `exportBackup`
  prend la date en paramètre : fichier, nom de fichier et state portent le
  même instant. Restauration : `latestInstant(prev, exportedAt)` — un vieux
  fichier ne fait pas oublier un export récent. Fusion : intacte.
- **Rappel** : `backupStatus` (pur, jours calendaires depuis `todayKey`) ;
  `BackupReminderCard` sur Aujourd'hui, jour courant, si > 7 jours ou jamais.
  `warn` (un manque), bouton plein « Exporter maintenant ».
- Décision ajoutée dans `4_business_decisions.md`.

**Faux défaut au rendu** : première capture terne — c'était `vf-fadein`
(200 ms) photographié en cours, toute la page atténuée. Recapturé à +600 ms.

Vérification : `npm test` **263/263** (+11) · `vite build` ✅ · Chromium
390 et 360 px sur build de prod : rappel « il y a 9 jours » affiché, export
téléchargé (`vibefit-…_12h48.json`), rappel disparu, `lastBackupAt` écrit,
carte PROTECTION « aujourd'hui (24 octobre) », zéro erreur console, zéro
débordement. Stockage « non garanti » en headless (refus attendu du
navigateur sans engagement), à constater sur l'iPhone.

## Session 2026-10-24 (suite) — PR n°2 : visibilité de la calibration

PR #18 mergée par le développeur ; limite « export annulé » acceptée.

- **Ce qui manque, pas seulement le compte** : `calibrationState` boucle du
  début de calibration à aujourd'hui (et non plus sur les seules entrées
  existantes) pour voir aussi les jours JAMAIS saisis. `incompleteDays` ne
  contient que des jours passés : aujourd'hui est en cours, le signaler
  comme manque dès le matin serait faux.
- **Date la plus proche** : `today + restant − 1`, ou `+ restant` si
  aujourd'hui compte déjà. Cas réel vérifié : tout saisi depuis le 24/10 ⇒
  06/11, la date fixée par le développeur. Rattraper un jour passé avance
  la date — c'est le levier que le texte rend visible.
- **Calendrier** : la forme porte le sens (coche / balance / couverts),
  car la case sélectionnée passe tout en `inkSoft` ; `warn` pour un manque,
  `muted` pour aujourd'hui pas encore complet. Le point du type de jour est
  conservé tel quel.
- Textes centralisés (`calibrationCopy.js`) : bande, diagnostic et carte
  TDEE ne peuvent pas annoncer deux dates différentes.
- Test d'étape 4 modifié (attente, pas suppression) : le détail du
  diagnostic gagne « — 14/14 au plus tôt le 06/11 ».

**Retouche au rendu** : « +1 » orphelin en fin de bande à 360 px, illisible
hors contexte ⇒ « et 1 autre ».

Vérification : `npm test` **273/273** (+10) · `vite build` ✅ · Chromium
390 et 360 px sur build de prod (calibration au 20/10, 4 cas de jour) :
bande « 1/14 … au plus tôt le 05/11. À compléter : 23/10 (apport), 22/10
(pesée + apport) et 1 autre. », 5 cases annotées pour lecteur d'écran,
légende, zéro erreur console, zéro débordement.
