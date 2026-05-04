---
type: AUTO-SAVE & UPDATE
last_updated: 2026-05-04
---

# 🗺️ Project Overview — VibeFit

## État actuel du projet
- Phase : Développement actif — features analytics
- Branche active : `main`
- Dernier commit : `c3ded25` — feat: intégration PWA offline-first

## Structure des fichiers (src/)

```
src/
  constants/
    config.js          — PALETTE, DEFAULT_TARGETS, PRESETS, STORAGE_KEY
  utils/
    dateUtils.js       — toKey, dayTypeFromKey, fmtFr, shortFr, addDays, startOfWeek
    mathUtils.js       — num, calculateWeeklyBalance
    backupUtils.js     — exportBackup, importBackup
  models/
    day.js             — emptyDay, dayType
  hooks/
    useVibefitStorage.js — source de vérité localStorage (clé vibefit_v1)
  components/
    ui/                — Card, StatCard, NumberInput, Pill, Bar, Label, FontStyles
    layout/            — Header, BottomNav
    views/
      TodayView.jsx    — Tracker quotidien (kcal, macros, séance, pas)
      WeekView.jsx     — Bilan hebdomadaire (solde, tendance, moyennes, tour de taille)
      DataView.jsx     — Import/export backup JSON
      TargetsView.jsx  — Gestion des objectifs caloriques (PRESETS + override)
  App.jsx              — Orchestrateur pur (54 lignes)
```

## Fonctionnalités implémentées
- [x] Tracker quotidien (entraînement + nutrition + pas)
- [x] Bilan hebdomadaire avec analytique (WeekView 3 sections)
- [x] Import/export backup JSON local
- [x] PWA offline-first (installable, cache Workbox)
- [x] Gestion des objectifs (PRESETS : maintenance, sèche, bulk)
- [ ] Historique graphique multi-semaines

## Fonctionnalités en cours
_Aucune en cours._

## Dépendances actives
| Package | Version | Usage |
|---------|---------|-------|
| react | ^18.3.1 | UI framework |
| react-dom | ^18.3.1 | DOM rendering |
| lucide-react | ^0.453.0 | Icônes |
| vite | ^5.4.10 | Build tool |

## Points de vigilance actuels
_Aucun identifié au démarrage._
