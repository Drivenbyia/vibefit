# Spécifications du Système Expert VibeFit (V2) — Blueprint Consolidé

> **Statut :** V2 Phase A — DÉPLOIEMENT STAGING
> **Auteur :** Généré via Claude Code — 2026-06-01
> **Scope Phase A :** `extractSignals()` + TDEE Adaptatif + AI Bridge V2 Header + Badge Protéines
> **Gel :** R2, R4, R5, R6 — non implémentées (backtesting requis en amont)
> **Implémentées, en diagnostic seul :** R1, R3 — aucune ne modifie de cible

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

> Signature : `extractSignals(data)` — le state est **injecté**, la fonction ne lit plus `localStorage` (testabilité).

| Champ | Type | Description |
|---|---|---|
| `smoothedWeight` | `number \| null` | Poids lissé (moyenne mobile 7j sur les 7 derniers jours du scan 30j), kg, 2 décimales |
| `adaptiveTDEE` | `number \| null` | TDEE calculé sur la fenêtre optimale (kcal/j). `null` si données insuffisantes |
| `weightTrendPerWeek` | `number \| null` | Pente de poids en **kg/semaine** (OLS). `null` si < 2 points |
| `avgIntake` | `number \| null` | Apport moyen journalier sur la fenêtre optimale, jours saisis uniquement (kcal) |
| `confidence` | `number` | Recouvrement poids × apport 0–100 % : `overlapDays / size` |
| `hasEnoughData` | `boolean` | `true` si `overlapDays ≥ 10` sur la fenêtre |
| `overlapDays` | `number` | Jours avec poids **ET** apport saisis sur la fenêtre |
| `interpolatedCount` | `number` | Poids reconstruits par interpolation sur la fenêtre |
| `windowStart` | `string \| null` | Date ISO de début de la fenêtre retenue (ex: `"2026-05-10"`) |
| `windowEnd` | `string \| null` | Date ISO de fin de la fenêtre retenue (ex: `"2026-05-23"`) |
| `windowAgeDays` | `number` | Ancienneté de `windowEnd` par rapport à aujourd'hui |

### Algorithme mathématique — Sliding Window

```
1. Scan de l'historique sur HISTORY_SCAN_DAYS = 30 jours (J-29 → J0)
2. Rejet des valeurs aberrantes :
   - Bornes de plausibilité : poids ∈ [30, 300] kg, apport ∈ [500, 8000] kcal
   - Saut j/j impossible : |Δpoids| > 2 kg × joursÉcoulés → rejeté
   - Test BILATÉRAL : un point n'est écarté que s'il est en désaccord avec TOUS
     ses voisins connus. Un vrai changement de palier reste cohérent avec son
     successeur et survit ; un test unilatéral rejetterait en cascade.
3. Sélection de la fenêtre optimale par Data Quality Score :
   - Pour chaque sous-fenêtre de 14j : overlap = count(poids ≠ null ET intake ≠ null)
   - score = overlap − ancienneté(jours) × 0.25   (pénalité de récence)
   - Retient le score maximum ; en cas d'égalité → fenêtre la plus récente
   - Dégradation gracieuse : si total < 14j → size = n réel (pas de crash)
4. Interpolation des poids manquants (sur l'historique complet 30j) :
   - Gap ENTRE DEUX valeurs connues → interpolation linéaire
   - Têtes et queues sans mesure → restent `null`. AUCUNE propagation à plat :
     remplir à plat amortit la tendance et tire le TDEE vers l'apport moyen.
5. Moyenne mobile 7j (fenêtre centrée ±3j) — sert UNIQUEMENT à `smoothedWeight`,
   la valeur affichée. Poids lissé courant = moyenne des 7 derniers (J-6 → J0).
6. Tendance sur la fenêtre optimale — régression des moindres carrés :
   - olsSlope sur les poids INTERPOLÉS (pas lissés), x = index réel dans la fenêtre
   - Pré-lisser avant de régresser biaise la pente : la moyenne mobile est tronquée
     aux bords, aplatit les derniers points et sous-estime la pente de ~42 kcal/j.
   - weightTrendPerWeek = slopeKgPerDay × 7
7. TDEE adaptatif :
   - adaptiveTDEE = avgIntake − slopeKgPerDay × 7700
   - La pente est en kg/JOUR : aucune division par la taille de fenêtre.
   - 1 kg de masse corporelle ≈ 7700 kcal (hypothèse tissus mixtes)
8. Confidence = overlapDays / size × 100
```

> ⚠️ **Régression historique à ne jamais réintroduire.** L'implémentation initiale
> calculait la tendance par différence de demi-moyennes puis divisait par `size`
> (14). L'écart entre les centroïdes des deux moitiés vaut `size / 2` = 7 jours :
> le déséquilibre journalier était donc divisé par deux. Sur une série synthétique
> à TDEE réel 2550 kcal/j, la formule retournait **2259** — une erreur systématique
> de 291 kcal/j. Couvert par `src/utils/__tests__/adaptiveTDEE.test.js`.

### Seuils de fiabilité

| Condition | Comportement |
|---|---|
| `overlapDays < 10` | `adaptiveTDEE = null`, `hasEnoughData = false` |
| Aucune pesée à portée du lissage (±3j) | `smoothedWeight = null` |
| `windowAgeDays > 7` | TDEE publié mais fenêtre signalée comme ancienne dans l'export |
| Toutes valeurs nulles | Tous les signaux `null`, `confidence = 0`, aucune exception |

> Le recouvrement remplace les deux compteurs indépendants de 7. L'équation de
> bilan énergétique croise poids et apport : deux séries de 7 jours disjointes ne
> valident rien, et extrapoler `avgIntake` (calculé sur les jours saisis) à toute
> la fenêtre reproduit exactement le biais de sous-déclaration que le protocole
> anti-rationalisation doit empêcher.

---

## 3. AI Bridge V2 — Format Header (Phase A)

La première ligne du Markdown exporté par `getHistoricalWeeks()` doit être :

```
⚡ TDEE adaptatif : {tdee} kcal | Tendance poids : {weightTrendPerWeek} kg/sem | Confiance : {confidence}% ({overlapDays} j croisés) | Apport moyen : {avgIntake} kcal | Période : {windowStart} → {windowEnd}
```

- Si `adaptiveTDEE` est `null` → afficher `N/A (recouvrement poids × apport insuffisant)`
- Si `weightTrendPerWeek` est `null` → afficher `N/A`
- Si `windowAgeDays > 7` → suffixer la période par `⚠ fenêtre vieille de {n} j`
- Si `windowStart`/`windowEnd` sont `null` → afficher `N/A`
- Ligne vide après le header pour séparation visuelle

---

## 4. Badge Protéines — Phase A

### Fichier : `src/components/views/WeekView.jsx`

- **Condition :** `daysUnderProtein > 0 || daysNotLogged > 0`, comptés sur les **7 jours
  calendaires** de la semaine — pas sur les jours saisis.
- **Seuil :** `PROTEIN_FLOOR` = 160 g/j, appliqué TOUS les jours (week-end compris) via
  `clampTargetField`.
- **Texte :** `⚠ Protéines · 3 j < 160 g · 2 j non loggés`
- **Style :** Pill discret, couleur `PALETTE.warn`

> ⚠️ **Régression à ne jamais réintroduire.** La version initiale comparait
> `weekly.avgProt` (moyenne divisée par les jours SAISIS) au seuil. Logger 3 jours à
> 180 g et oublier les 4 autres masquait le badge — le système récompensait le
> logging sélectif. Et un plancher QUOTIDIEN ne se contrôle pas par une moyenne :
> 220 g puis 100 g font 160 de moyenne et deux jours hors protocole.

---

## 5. Moteur d'Objectifs Dynamiques

> **Principe :** Les cibles caloriques ne sont plus des constantes absolues codées en dur. Elles sont indexées sur `data.baseTDEE`, que l'utilisateur peut **recalibrer explicitement** sur `signals.adaptiveTDEE`.

### 5.1 Branchement OPT-IN — `useAdaptiveTargets`

Décision produit : le TDEE mesuré **n'écrase jamais les cibles automatiquement**.
`RecalibrateCard` affiche le TDEE mesuré, sa confiance et sa fenêtre ; un bouton
applique la recalibration (`baseTDEE ← adaptiveTDEE`, puis `computePresetTargets`).

La recalibration est bloquée, avec motif affiché, si :

| Condition | Motif |
|---|---|
| `!hasEnoughData` | Recouvrement poids × apport insuffisant |
| `adaptiveTDEE === baseTDEE` | Cibles déjà alignées |
| `\|delta\| > 600 kcal` | Écart invraisemblable — saisie douteuse plutôt que dérive métabolique |

```
base = data.baseTDEE            (DEFAULT_TDEE = 2000 au premier lancement)
recalibrer() → base = signals.adaptiveTDEE
```

> `DEFAULT_TARGETS` est **dérivé** de `DEFAULT_TDEE` via `computePresetTargets`, et
> vit dans `presetUtils.js` (le placer dans `config.js` créerait un cycle d'import).
> L'ancien littéral train 2400 / off 1900 n'était sur la courbe d'aucun TDEE unique.

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

### 5.3bis Cible du week-end — DÉRIVÉE, plus jamais nulle

Le week-end recevait `kcal: null`. Il était donc mangé au TDEE et diluait le
déficit sur 2 jours sur 7, ce qui :

- rendait les taux annoncés des presets faux d'un facteur ~2 (« Sèche forte :
  perte ~500 g/sem » pour 234 g réels) ;
- faussait la comparaison apport/cible (l'apport du week-end était confronté à
  une moyenne de cibles qui l'excluait) ;
- laissait 29 % de la semaine sans repère.

```
WE.kcal = max(KCAL_FLOOR, moyenne pondérée des jours de semaine)
        = (nTrain × TRAIN + nOff × OFF) / (nTrain + nOff)
WE.fat  = même moyenne pondérée
WE.carbs = résidu calorique
```

La pondération vient de `nominalWeek()`, **dérivée de `dayTypeFromKey`** — jamais
re-codée. Le week-end se place ainsi entre TRAIN et OFF : plus souple qu'un jour
de repos, sans sortir du protocole.

Le champ reste **effaçable à la main** (`allowEmpty` sur l'éditeur WE). Un jour
dont la cible est vidée est alors exclu **des deux côtés** de la comparaison
apport/cible, ce qui préserve la correction d'origine.

### 5.4 Seuils Absolus Non Négociables

Constantes centralisées dans `src/constants/config.js` — aucun littéral dispersé.

| Seuil | Constante | Valeur | Contexte |
|---|---|---|---|
| Plancher calorique | `KCAL_FLOOR` | `1600` | Appliqué à OFF, **puis TRAIN relevé du même montant** pour préserver l'écart de cyclage |
| Plancher protéines | `PROTEIN_FLOOR` | `160` | `clampTargetField` — TOUS les types de jour, week-end compris |
| TDEE de base minimal | `MIN_BASE_TDEE` | `1800` | `= KCAL_FLOOR + 200`. Remplace l'ancien `1400`, injustifié |
| Écart de cyclage | `MIN_CYCLE_GAP` | `400` | TRAIN − OFF ; `0` pour Diet Break uniquement |
| Alerte sous-alimentation | `KCAL_FLOOR` | `1600` | `TodayView` si `intake > 0 && intake < KCAL_FLOOR` |
| Fallback TDEE manquant | `DEFAULT_TDEE` | `2000` | Premier lancement, sans historique |

> ⚠️ **Régression à ne jamais réintroduire.** Clamper TRAIN et OFF indépendamment
> faisait s'effondrer le cyclage : un TDEE de 1400 donnait `TRAIN = OFF = 1600`,
> supprimant la prémisse centrale du protocole sans aucun avertissement. Le
> plancher s'applique à OFF, puis TRAIN est relevé pour conserver l'écart nominal
> du preset. Couvert par `presetUtils.test.js` sur toute la plage 1000–3000 kcal.

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

> ⚠️ Les règles R2, R4, R5 et R6 restent GELées jusqu'au backtesting complet.
>
> 🩺 **Phase sans entraînement (arrêt médical, depuis le 2026-10-24).** Les règles
> qui supposent de l'entraînement sont **non applicables** pendant une phase
> `medical_stop` (`PHASE_TYPES.training === false`), dégelées ou non :
> R2 (recharge des jours TRAIN), R4 (coupe des jours OFF), R5 (échec du
> week-end — pas de week-end distinct en cible unique) et le plateau du
> protocole anti-rationalisation (§ 11), qui renvoie `PLATEAU_SUSPENDED`.
> R1, R3 et R6 ne supposent pas d'entraînement et restent hors de cette
> suspension. Tout dégel futur doit tester `isTrainingSuspended` avant de se
> déclencher.
> R1 et R3 sont implémentées, en mode **diagnostic seul** — aucune ne modifie de cible.

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

### R3 — NEAT_DRIFT [Priority: 6] — ✅ IMPLÉMENTÉE (`src/utils/neatDrift.js`)

Dégelée en priorité : sur le terrain, une chute de NEAT non signalée a coûté deux
mois de diagnostic erroné (pas divisés par 2.6, dépense −698 kcal/j, aucune alerte).

- **Trigger 1 — chute brutale :** `stepsThisWeek < stepsLastWeek × 0.85` (seuil d'origine),
  **conditionné à être sous sa propre ligne de base**. Sans ce garde-fou, redescendre
  à son niveau habituel après une semaine exceptionnelle déclenchait une fausse alerte.
- **Trigger 2 — dérive installée :** `stepsThisWeek < moyenne(4 semaines précédentes) × 0.80`.
  Le trigger d'origine ne voyait qu'une chute franche : une érosion de 12 %/semaine
  (16 000 → 14 000 → 12 250 → 10 700) ne le déclenche jamais et finit à −33 %.
- **Action :** diagnostic affiché (`NeatCard`), avec l'impact chiffré en kcal/j via
  `KCAL_PER_STEP_PER_KG` (0.0005 kcal/pas/kg). **Aucune modification de cible.**
- **Indépendant de la porte d'adhérence**, contrairement au protocole de plateau :
  les pas viennent de la montre et restent disponibles quand le suivi alimentaire
  décroche — c'est justement là que l'alerte est la plus utile.
- **Garde-fou :** si la dernière semaine complète a moins de `NEAT_MIN_DAYS = 4`
  jours de pas, le statut est `INSUFFICIENT_DATA`. Sans ça, l'app jugeait la semaine
  précédente et affichait un statut rassurant sur des chiffres périmés.

| Constante | Valeur |
|---|---|
| `NEAT_DROP_RATIO` | `0.85` |
| `NEAT_DRIFT_RATIO` | `0.80` |
| `NEAT_BASELINE_WEEKS` | `4` |
| `NEAT_RECOVERY_RATIO` | `1.15` |
| `NEAT_MIN_DAYS` | `4` |

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

R3 est évaluée INDÉPENDAMMENT : elle repose sur les pas (montre), disponibles
même quand le suivi alimentaire décroche. La bloquer derrière R1 la rendrait
muette exactement dans le cas où elle est la plus utile.
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

## 11. Protocole Anti-Rationalisation — `src/utils/plateauProtocol.js`

> **Périmètre strictement DIAGNOSTIQUE.** Ce module publie un statut et ne modifie
> aucune cible. Les actions R2–R6 restent gelées jusqu'au backtesting (§9).

`diagnose({ signals, weeklyHistory })` — fonction pure. `weeklyHistory` vient de
`computeWeeklyHistory(data, targets, n)` (`mathUtils.js`), de la plus ancienne à
la plus récente.

### Ordre d'évaluation

```
1. Porte de DONNÉES     → INSUFFICIENT_DATA           (reprend R1, priorité 100)
2. Porte d'ADHÉRENCE    → LOW_ADHERENCE
3. Rétention d'eau      → WATER_RETENTION_SUSPECTED   (reprend R6, bloque le plateau)
4. Croisement triple    → PLATEAU_CONFIRMED
5. Sinon                → PROGRESSING
```

**La porte d'adhérence est le cœur du protocole** : un écart de saisie ne doit
jamais pouvoir se présenter comme un plateau métabolique. Elle bloque avant tout
diagnostic si `confidence < 70 %` ou si une semaine évaluée est sous 5 j saisis.

Un plateau n'est confirmé que si les **trois** signaux sont stables simultanément :
poids lissé, TDEE hebdomadaire implicite, et adhérence.

### Seuils et justification

| Constante | Valeur | Justification |
|---|---|---|
| `ADHERENCE_MIN_DAYS` | `5` j/7 | En deçà, la moyenne hebdo n'est plus représentative |
| `ADHERENCE_MIN_CONFIDENCE` | `70` % | Recouvrement poids × apport sur la fenêtre TDEE |
| `PLATEAU_MIN_WEEKS` | `3` | Durée minimale pour que les variations d'eau se moyennent |
| `PLATEAU_WEIGHT_NOISE_KG` | `0.3` kg/sem | Bruit de rétention hydrique normal |
| `PLATEAU_TDEE_DRIFT_KCAL` | `100` | Marge d'erreur résiduelle de l'OLS sur 14 points |
| `WAIST_NOISE_CM` | `1` | Le tour de taille se mesure à ±0.5 cm près |

> Remplace le trigger R4 `waistBlockedWeeks >= 3`, qui ne croisait que le tour de
> taille, n'était calculé nulle part, n'était justifié par rien, et agissait
> (−100 kcal) sans vérifier l'adhérence.

### Semaine en cours

`computeWeeklyHistory` expose `elapsedDays`. `diagnose` **écarte la semaine
courante** (`elapsedDays < 7`). Sans cela, un mercredi (3 jours écoulés sur 7)
déclenchait `LOW_ADHERENCE` malgré un logging parfait — visible du lundi au jeudi
par tout utilisateur. Couvert par `plateauProtocol.test.js`.

---

*Ce fichier est une spécification vivante. Mettre à jour la section backtesting après validation.*
