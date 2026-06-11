---
type: AUTO-SAVE & UPDATE
last_updated: 2026-06-11
---

# 🗺️ Project Overview — VibeFit

## État actuel du projet
- **Phase : 🛡️ V2 Phase B consolidée — audit de cohérence complet (utilisateur en Diet Break / vacances)**
- Branche active : `claude/github-sync-status-MRUxV` (PRs #2–#4 mergées dans `main`)
- Dernier commit : `f61878f` — fix(week): rappel hebdo cohérent avec le preset actif
- Session 2026-06-11 : audit react-review global → 5 correctifs (crash reset DataView, typeOverride dans le bilan hebdo, import backup complet, tuile séances, dates UTC→locales)

## Structure des fichiers (src/)

```
src/
  constants/
    config.js          — PALETTE, DEFAULT_TARGETS, PRESETS, STORAGE_KEY
  utils/
    dateUtils.js       — toKey, dayTypeFromKey, fmtFr, shortFr, addDays, startOfWeek
    mathUtils.js       — num, calculateWeeklyBalance
    backupUtils.js     — exportBackup, importBackup
    exportUtils.js     — getHistoricalWeeks(n) : export Markdown 8 semaines (AI Bridge V2 + header TDEE)
    adaptiveTDEE.js    — extractSignals() : TDEE adaptatif Sliding Window (30j scan, fenêtre 14j optimale), lissage poids 7j, tendance, confidence, windowStart/windowEnd
  models/
    day.js             — emptyDay, dayType
  hooks/
    presetUtils.js       — computePresetTargets(presetId, baseTDEE), deriveBaseTDEE() — formules TDEE-based
    useVibefitStorage.js — source de vérité localStorage (clé vibefit_v1) + baseTDEE persisté
  components/
    ui/                — Card, StatCard, NumberInput (local state + onBlur différé), Pill, Bar, Label, FontStyles
    layout/            — Header, BottomNav
    views/
      TodayView.jsx    — Tracker quotidien (kcal, macros, séance, pas)
      WeekView.jsx     — Bilan hebdomadaire (solde, tendance, moyennes, tour de taille)
      DataView.jsx     — Import/export backup JSON
      TargetsView.jsx  — Gestion des objectifs caloriques (presets dynamiques indexés sur baseTDEE)
  App.jsx              — Orchestrateur pur (54 lignes)
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
- `node_modules` absent en environnement remote — build/runtime non vérifiable en session. Tester sur machine locale avant merge en production.
- `baseTDEE` persiste en localStorage : toute modification du schéma de formules (deltas) nécessite une migration explicite ou un reset.
- Reliquats non-bloquants signalés à l'audit 2026-06-11 (voir journal) : pill "Aucune" jamais active (marqueur `séance:none` jamais écrit), `NumberInput` ignore les props `step`/`inputMode`, timers de feedback sans cleanup, `WeekView.jsx` ≈ 575 lignes (>> règle 80 lignes).
