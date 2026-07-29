---
type: AUTO-SAVE & UPDATE
last_updated: 2026-07-29
---

# 🗺️ Project Overview — VibeFit

## État actuel du projet
- **Phase : 🔬 Moteur de calcul corrigé et testé — TDEE adaptatif branché (opt-in), protocole anti-rationalisation implémenté**
- Branche active : `claude/vibefit-calc-audit-wut56i`
- Derniers commits : `10a7b68` (math TDEE), `7cb82e7` (cohérence cibles), `9f9b252` (protocole plateau)
- **Suite de tests : Vitest, 63 tests** — `npm test`

### Session 2026-07-29 — Audit des calculs, 3 lots
1. **Math TDEE** — bug principal : le déséquilibre journalier était divisé par 14 alors que l'écart de demi-moyennes couvre 7 jours ⇒ erreur systématique de **291 kcal/j** (TDEE réel 2550 → calculé 2259). Remplacé par une régression OLS sur poids interpolés. Rejet des aberrations, plus de propagation à plat, recouvrement poids × apport exigé, pénalité de récence.
2. **Cohérence des cibles** — le TDEE adaptatif n'alimentait aucune cible (seul l'export le lisait). Branchement **opt-in** via `RecalibrateCard`. `DEFAULT_TARGETS` dérivé. Écart de cyclage préservé sous le plancher. Plancher protéines garanti. La séance loggée pilote le type de jour. Apport et cible comparés sur la même base.
3. **Protocole anti-rationalisation** — `plateauProtocol.js`, diagnostic pur croisant TDEE / poids / adhérence. Porte d'adhérence prioritaire, garde-fou rétention d'eau. Aucune action automatisée (R2–R6 toujours gelées).

4. **Libellés des presets** — les `sub` figés de `config.js` annonçaient des taux faux d'un facteur ~2 : ils ignoraient le week-end, qui n'a aucune cible et dilue le déficit sur 2 jours sur 7. « Sèche forte : perte ~500 g/sem » délivrait en réalité **234 g/sem**. Remplacés par `presetRateLabel()`, calculé depuis les cibles effectives et la composition de semaine dérivée du calendrier.

Vérifié sur build de production (Playwright) : TDEE mesuré **2551** sur vérité terrain 2550, recalibration 2000 → 2551 (TRAIN 2751 / OFF 2351), diagnostics discriminants, taux de presets exacts, zéro erreur console.

## Structure des fichiers (src/)

```
src/
  constants/
    config.js          — PALETTE, PRESETS, STORAGE_KEY, seuils (KCAL_FLOOR, PROTEIN_FLOOR,
                         MIN_BASE_TDEE, MIN_CYCLE_GAP) et bornes de plausibilité du signal
  utils/
    dateUtils.js       — toKey (date LOCALE), dayTypeFromKey, fmtFr, shortFr, addDays, startOfWeek
    mathUtils.js       — num, calculateWeeklyBalance, calculateWeightStats, computeWeeklyHistory
    backupUtils.js     — exportBackup, importBackup
    exportUtils.js     — getHistoricalWeeks(data, n) : export Markdown 8 semaines (AI Bridge V2 + header)
    adaptiveTDEE.js    — extractSignals(data) + olsSlope() : TDEE par régression OLS, Sliding Window
                         (scan 30j, fenêtre 14j pénalisée par la récence), rejet des aberrations,
                         recouvrement poids × apport, lissage 7j pour l'affichage seul
    plateauProtocol.js — diagnose() : croisement TDEE / poids / adhérence. DIAGNOSTIC PUR, sans action
    presetUtils.js     — computePresetTargets, clampTargetField, macroConflictKcal, deriveBaseTDEE,
                         DEFAULT_TARGETS (dérivé de DEFAULT_TDEE — ici pour éviter un cycle d'import)
    reminderUtils.js   — weeklyReminderCopy(presetId, …) : texte rappel hebdo par type d'objectif
    __tests__/         — adaptiveTDEE, presetUtils, mathUtils, plateauProtocol (56 tests)
  models/
    day.js             — emptyDay, dayType (typeOverride > séance loggée > calendrier)
  hooks/
    useVibefitStorage.js  — source de vérité localStorage (clé vibefit_v1) + baseTDEE persisté
    useWeekStats.js       — dérivation hebdo (days, weekly, séries, macros, plancher protéines en jours)
    useDayMetrics.js      — métriques du jour (cibles, totaux, alertes)
    useTargetsManager.js  — logique presets/TDEE/updateField/reset
    useAdaptiveTargets.js — TDEE mesuré + recalibration OPT-IN des cibles
    usePlateauDiagnosis.js— croisement TDEE / poids / adhérence pour WeekView
    useBackupManager.js   — export/import/reset des données
    useTransientValue.js  — feedback éphémère avec cleanup ; useClipboardCopy.js — copie + feedback
  components/
    ui/                — Card, StatCard, NumberInput (local state + onBlur différé), Pill, Bar, Label, SectionLabel, FontStyles
    layout/            — Header, DayTypeSwitcher, BottomNav
    views/             — chaque vue = orchestrateur pur ≤ 50 lignes + sous-composants ≤ 80 lignes
      TodayView.jsx    + today/   (BalanceCard, BalanceRing, EnergyStat, MacrosCard, IntakeCard, ExpenditureCard, WorkoutCard, BodyCards, NotesCard)
      WeekView.jsx     + week/    (WeekSummary, WeekCalendar, NetBalanceCard, DayBar, KcalTrendCard, MacroBar, ProteinBadge, AveragesCard, WaistCard, WeightCard, ReminderCard, ExportButton)
      TargetsView.jsx  + targets/ (PresetPickerCard, StepsCard, TargetEditor, FooterCards)
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
- [ ] R2 PERTE_RAPIDE, R3 NEAT_DRIFT, R4 PLATEAU_STRICT, R5 WEEKEND_FAILURE, R6 CORTISOL_SPIKE

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
