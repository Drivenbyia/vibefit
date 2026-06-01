# Spécifications du Système Expert VibeFit (V2) — Blueprint Consolidé

> **Statut :** V2 Phase A — DÉPLOIEMENT STAGING
> **Auteur :** Généré via Claude Code — 2026-06-01
> **Scope Phase A :** `extractSignals()` + TDEE Adaptatif + AI Bridge V2 Header + Badge Protéines
> **Gel Phase A :** R2, R3, R4, R5, R6 — non implémentées (backtesting requis en amont)

---

## 1. Architecture Globale

- **Paradigme :** Moteur déterministe 100% Local First (lecture exclusive du `localStorage`, aucune dépendance réseau).
- **State Preparation :** Fonction `extractSignals()` dans `src/utils/adaptiveTDEE.js` — extraction et normalisation des données brutes (scan 30j, fenêtre optimale 14j par Sliding Window) avant évaluation. Produit un objet d'état structuré et typé.
- **Idempotence :** Fonction `evaluateWeekly()` (Phase B) strictement IDEMPOTENTE — calcul unique par semaine ISO, résultat mis en cache (clé : `expert_result_<isoWeek>`). Aucun déclenchement multiple possible pour une même semaine.
- **Validation :** Plan de Backtesting obligatoire sur les logs historiques existants avant activation des règles R2–R6.

---

## 2. Module `extractSignals()` — Phase A

### Fichier : `src/utils/adaptiveTDEE.js`

### Contrat de sortie (objet retourné)

| Champ | Type | Description |
|---|---|---|
| `smoothedWeight` | `number \| null` | Poids lissé (moyenne mobile 7j sur les 7 derniers jours du scan 30j), kg, 2 décimales |
| `adaptiveTDEE` | `number \| null` | TDEE calculé sur la fenêtre optimale (kcal/j). `null` si données insuffisantes |
| `weightTrend14d` | `number \| null` | Variation de poids lissée sur la fenêtre optimale (kg). `null` si < 7j de données |
| `avgIntake` | `number \| null` | Apport moyen journalier sur la fenêtre optimale, jours saisis uniquement (kcal) |
| `confidence` | `number` | Densité de données 0–100 % `(weightPoints + intakePoints) / (2 × size)` |
| `hasEnoughData` | `boolean` | `true` si ≥ 7 entrées poids ET ≥ 7 jours d'apport sur la fenêtre |
| `windowStart` | `string \| null` | Date ISO de début de la fenêtre retenue (ex: `"2026-05-10"`) |
| `windowEnd` | `string \| null` | Date ISO de fin de la fenêtre retenue (ex: `"2026-05-23"`) |

### Algorithme mathématique — Sliding Window

```
1. Scan de l'historique sur HISTORY_SCAN_DAYS = 30 jours (J-29 → J0)
2. Sélection de la fenêtre optimale par Data Quality Score :
   - Pour chaque sous-fenêtre de 14j (N-14+1 candidats) :
       score = count(jours où poids ≠ null ET intake ≠ null)
   - Retient le score maximum ; en cas d'égalité → fenêtre la plus récente
   - Dégradation gracieuse : si total < 14j → size = n réel (pas de crash)
3. Interpolation des poids manquants (sur l'historique complet 30j) :
   - Gap entre deux valeurs connues → interpolation linéaire
   - Queue sans valeur connue → propagation de la dernière valeur connue
   - Si aucune valeur → null (pas de signal)
4. Moyenne mobile 7j (fenêtre centrée ±3j) sur la série interpolée 30j
5. Poids lissé courant = moyenne des 7 derniers smoothed (J-6 → J0)
6. Tendance sur la fenêtre optimale :
   - Première moitié vs seconde moitié des entrées lissées de la fenêtre
   - weightTrend14d = avgSecondHalf - avgFirstHalf
7. TDEE adaptatif :
   - dailyImbalance = (weightTrend14d × 7700) / size
   - adaptiveTDEE = avgIntake - dailyImbalance
   - 1 kg de masse corporelle ≈ 7700 kcal (hypothèse tissus mixtes)
8. Confidence = (weightPoints + intakePoints) / (2 × size) × 100
```

### Seuils de fiabilité

| Condition | Comportement |
|---|---|
| `weightPoints < 7` | `adaptiveTDEE = null`, `confidence < 50` |
| `intakePoints < 7` | `adaptiveTDEE = null` |
| `< 14j de données totales` | Fallback sur estimation de base — `hasEnoughData = false` |
| Toutes valeurs nulles | `smoothedWeight = null`, `weightTrend14d = null` |

---

## 3. AI Bridge V2 — Format Header (Phase A)

La première ligne du Markdown exporté par `getHistoricalWeeks()` doit être :

```
⚡ TDEE adaptatif : {tdee} kcal | Tendance poids 14j : {weightTrendChange} kg | Confiance : {confidence}% | Apport moyen : {avgIntake} kcal | Période : {windowStart} → {windowEnd}
```

- Si `adaptiveTDEE` est `null` → afficher `N/A (données < 14j)`
- Si `weightTrend14d` est `null` → afficher `N/A`
- Si `windowStart`/`windowEnd` sont `null` → afficher `N/A`
- Ligne vide après le header pour séparation visuelle

---

## 4. Badge Protéines — Phase A

### Fichier : `src/components/views/WeekView.jsx`

- **Condition :** `weekly.avgProt < 160 && weekly.recordedDays > 0`
- **Seuil :** 160 g/j (fixe, correspond à `resolvedTargets.train.protein`)
- **Style :** Pill discret, couleur `PALETTE.warn`, visible uniquement si condition vraie
- **Texte :** `Protéines < 160 g` (+ valeur actuelle optionnelle)
- **Contrainte :** N'altère pas le hotfix 1600 kcal ni la logique TRAIN/OFF

---

## 5. Moteur d'Objectifs Dynamiques

> **Principe :** Les cibles caloriques ne sont plus des constantes absolues codées en dur. Elles sont calculées dynamiquement à partir de `signals.adaptiveTDEE` au moment où l'utilisateur sélectionne un preset.

### 5.1 Fallback de Sécurité

```
Si signals.adaptiveTDEE === null
  → base = 2000  (kcal/j — fallback universel, utilisateur sans historique)
Sinon
  → base = signals.adaptiveTDEE
```

### 5.2 Formules par Preset

| Preset | Jour TRAIN | Jour OFF | Remarques |
|---|---|---|---|
| **Maintenance** | `base + 200` | `base - 200` | Cyclage modéré autour du TDEE |
| **Sèche Légère** | `base` | `Math.max(1600, base - 400)` | Plancher 1600 kcal — protège contre la sous-alimentation |
| **Diet Break (Vacances)** | `base` | `base` | Pas de cyclage — cible identique TRAIN et OFF |

### 5.3 Comportement Attendu

- Le choix d'un preset **résout nativement le bug de désélection** : la cible est recalculée à chaque sélection depuis `signals.adaptiveTDEE` courant, sans stocker de valeur absolue persistante en dur.
- Si `adaptiveTDEE` évolue (nouvelles données), il suffit de re-sélectionner le preset pour recalculer les cibles — aucune migration requise.
- Les protéines cibles restent fixes par preset (non indexées sur le TDEE) : voir `src/constants/config.js`.

### 5.4 Seuils Absolus Non Négociables

| Seuil | Valeur | Contexte |
|---|---|---|
| Plancher calorique | `1600 kcal` | Appliqué via `Math.max(1600, …)` dans Sèche Légère OFF |
| Alerte sous-alimentation | `< 1600 kcal saisis` | Affichée dans `TodayView` si `intake > 0 && intake < 1600` |
| Fallback TDEE manquant | `2000 kcal` | Activé si `signals.adaptiveTDEE === null` |

---

## 6. Structure Canonique d'une Règle (Phase B)

Toute règle du moteur doit respecter l'interface suivante :

| Champ | Type | Description |
|---|---|---|
| `id` | `string` | Identifiant unique (ex: `"R1_DATA_QUALITY"`) |
| `priority` | `number` | Poids — en cas de conflit, la plus haute l'emporte |
| `cooldown_days` | `number` | Délai minimal avant re-déclenchement |
| `trigger` | `() => boolean` | Condition pure évaluée sur l'état produit par `extractSignals()` |
| `context` | `string[]` | Champs requis pour l'évaluation |
| `action` | `object` | Payload de notification/modification |
| `rationale` | `string` | Justification métier |

---

## 7. Définition des Règles Métiers (Phase B — GEL)

> ⚠️ Les règles R2 à R6 sont GELées jusqu'au backtesting complet. Seule R1 est éligible Phase A.

### R1 — DATA_QUALITY [Priority: 100]

- **Trigger :** `!waistLoggedThisWeek && weightEntries < 4`
- **Cooldown :** 3 jours
- **Context :** `waistLoggedThisWeek`, `weightEntries`
- **Action :** Notification de rappel de saisie — blocage des autres règles (priorité maximale).
- **Rationale :** Évite un SPOF de données. Si les deux signaux principaux (tour de taille + poids) sont insuffisants, toute recommandation nutritionnelle serait non fiable.

---

### R2 — PERTE_RAPIDE [Priority: 8] — ⛔ GEL Phase B

- **Trigger :** `weightLossThisWeek > 800` (grammes)
- **Action :** `macros_train_only` — +165 kcal / +30g glucides les jours d'entraînement.

### R3 — NEAT_DRIFT [Priority: 6] — ⛔ GEL Phase B

- **Trigger :** `stepsThisWeek < stepsLastWeek * 0.85`
- **Action :** Alerte prioritaire "Augmente ton NEAT".

### R4 — PLATEAU_STRICT [Priority: 5] — ⛔ GEL Phase B

- **Trigger :** `waistBlockedWeeks >= 3`
- **Action :** `macros_off_only` — -100 kcal les jours off.

### R5 — WEEKEND_FAILURE [Priority: 4] — ⛔ GEL Phase B

- **Trigger :** `weekendKcalAvg < kcalTarget * 0.8`
- **Action :** Alerte sous-alimentation weekend.

### R6 — CORTISOL_SPIKE [Priority: 9] — ⛔ GEL Phase B

- **Trigger :** `weightReboundKg > 1 && waistStable && notes?.match(/(fatigue|sommeil|stress)/i)`
- **Action :** Blocage baisse calorique — rétention eau probable.

---

## 8. Ordre d'Évaluation et Gestion des Conflits (Phase B)

```
R1 (100) → R6 (9) → R2 (8) → R3 (6) → R4 (5) → R5 (4)
```

- Si R1 déclenche → R2–R6 non évaluées
- Si R6 déclenche → toute action de réduction calorique de R4 est annulée

---

## 9. Plan de Backtesting (Obligatoire avant Phase B)

1. Exporter l'historique complet du `localStorage` (backup JSON V1).
2. Rejouer `evaluateWeekly()` sur chaque semaine disponible (minimum 8 semaines).
3. Vérifier manuellement la pertinence de chaque déclenchement.
4. Taux d'acceptabilité minimum : **80 % de déclenchements pertinents** avant activation.
5. Documenter les faux positifs par règle (section à compléter post-backtesting).

---

## 10. Null Safety — Règle Absolue

```js
// ❌ Dangereux
notes.toLowerCase().includes("chantier")

// ✅ Sécurisé
notes?.toLowerCase().includes("chantier") ?? false
(notes ?? "").toLowerCase().includes("chantier")
```

---

*Ce fichier est une spécification vivante. Mettre à jour la section backtesting après validation.*
