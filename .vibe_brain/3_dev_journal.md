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
