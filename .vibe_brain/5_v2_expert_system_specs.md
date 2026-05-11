# Spécifications du Système Expert VibeFit (V2)

> **Statut :** Spécification — Feature Freeze V1 non impacté.
> **Auteur :** Généré via Claude Code — 2026-05-08

---

## 1. Architecture Globale

- **Paradigme :** Moteur déterministe 100% Local First (lecture exclusive du `localStorage`, aucune dépendance réseau).
- **State Preparation :** Fonction `extractSignals()` responsable de l'extraction et de la normalisation des données brutes avant évaluation. Produit un objet d'état structuré et typé.
- **Idempotence :** Fonction `evaluateWeekly()` strictement IDEMPOTENTE — calcul unique par semaine ISO, résultat mis en cache (clé : `expert_result_<isoWeek>`). Aucun déclenchement multiple possible pour une même semaine.
- **Guard Global :** `evaluateWeekly()` DOIT vérifier la présence d'au minimum **8 semaines de logs historiques complets** avant de générer toute recommandation. En deçà de ce seuil, la fonction retourne un état vide (`{ triggered: false, reason: "INSUFFICIENT_HISTORY" }`) sans évaluer aucune règle. Ce guard protège en priorité la règle R4 (PLATEAU_STRICT) et R3 (NEAT_DRIFT), dont les triggers comparatifs (`waistBlockedWeeks >= 3`, `stepsLastWeek`) produiraient des faux positifs sur un historique court.
- **Validation :** Plan de Backtesting obligatoire sur les logs historiques existants avant toute mise en production. Les règles doivent être validées sur au minimum 8 semaines de données réelles.

---

## 2. Structure Canonique d'une Règle

Toute règle du moteur doit respecter l'interface suivante (documentation, pas d'implémentation ici) :

| Champ | Type | Description |
|---|---|---|
| `id` | `string` | Identifiant unique de la règle (ex: `"R1_DATA_QUALITY"`). |
| `priority` | `number` | Poids de priorité — en cas de conflit entre règles, la plus haute l'emporte. |
| `cooldown_days` | `number` | Délai minimal (en jours) avant que la règle puisse se déclencher à nouveau. |
| `trigger` | `() => boolean` | Condition booléenne pure, sans effet de bord, évaluée sur l'état préparé par `extractSignals()`. |
| `context` | `string[]` | Liste des champs de données requis pour l'évaluation (documentation des dépendances). |
| `action` | `object` | Modification d'état ou payload de notification à déclencher si `trigger === true`. |
| `rationale` | `string` | Explication logique métier — pourquoi cette règle existe et ce qu'elle protège. |

---

## 3. Définition des Règles Métiers

### R1 — DATA_QUALITY [Priority: 100]

- **Trigger :** `!waistLoggedThisWeek && weightEntries < 4`
- **Cooldown :** 3 jours
- **Context :** `waistLoggedThisWeek`, `weightEntries`
- **Action :** Notification de rappel de saisie — blocage des autres règles (priorité maximale).
- **Rationale :** Évite un SPOF de données. Si les deux signaux principaux (tour de taille + poids) sont insuffisants, toute recommandation nutritionnelle serait non fiable. Fallback croisé : si l'un manque, l'autre peut partiellement compenser, mais sous le seuil de 4 entrées poids + 0 taille, le moteur s'abstient.

---

### R2 — PERTE_RAPIDE [Priority: 8]

- **Trigger :** `weightLossThisWeek > 800` (en grammes)
- **Cooldown :** 7 jours
- **Context :** `weightLossThisWeek`
- **Action :** `macros_train_only` — ajustement : +165 kcal / +30g glucides sur les jours d'entraînement uniquement.
- **Rationale :** Une perte > 800g/semaine sur une durée prolongée est corrélée à une perte musculaire significative chez un athlète naturel. L'ajout ciblé de glucides péri-entraînement protège la masse maigre sans compromettre le déficit global.

---

### R3 — NEAT_DRIFT [Priority: 6]

- **Trigger :** `stepsThisWeek < stepsLastWeek * 0.85`
- **Cooldown :** 7 jours
- **Context :** `stepsThisWeek`, `stepsLastWeek`
- **Action :** Alerte prioritaire "Augmente ton NEAT" — bloquer tout ajustement diététique à la baisse tant que le seuil de 8 000 pas/jour n'est pas atteint.
- **Rationale :** Une baisse du NEAT (Non-Exercise Activity Thermogenesis) de plus de 15% explique souvent un plateau apparent. Réduire les calories dans ce contexte aggraverait l'adaptation métabolique. La priorité est de restaurer l'activité quotidienne, pas de creuser le déficit.

---

### R4 — PLATEAU_STRICT [Priority: 5]

- **Trigger :** `waistBlockedWeeks >= 3` (ou `weightBlockedWeeks >= 3` si `waist` non disponible)
- **Cooldown :** 14 jours
- **Context :** `waistBlockedWeeks`, `weightBlockedWeeks`, `waistAvailable`
- **Action :** `macros_off_only` — ajustement : -100 kcal sur les jours off (repos) uniquement.
- **Rationale :** Un plateau de 3 semaines consécutives sans mouvement du tour de taille (signal prioritaire sur le poids brut) indique une adaptation calorique. La réduction ciblée sur les jours off est la moins impactante sur la récupération et la performance.

---

### R5 — WEEKEND_FAILURE [Priority: 4]

- **Trigger :** `(weekendKcalAvg < kcalTarget * 0.8) || (weekendKcalAvg < 2800 && notes?.toLowerCase().includes("chantier"))`
- **Cooldown :** 7 jours
- **Context :** `weekendKcalAvg`, `kcalTarget`, `notes`
- **Action :** Alerte double risque : sous-alimentation chronique en weekend → risque métabolique et catabolique. Recommandation : augmenter les apports le weekend même hors entraînement.
- **Rationale :** Le weekend est souvent un point de défaillance inverse (sous-manger par oubli ou activité physique non planifiée intense comme des travaux). Un déficit trop profond sur 2 jours consécutifs peut déclencher une réponse adaptative négative.

---

### R6 — CORTISOL_SPIKE [Priority: 9]

- **Trigger :** `weightReboundKg > 1 && waistStable && (hrvStatus === 'FATIGUÉ' || sleepScore < 60 || notes?.match(/(fatigue|sommeil|stress|épuisé)/i))`
- **Cooldown :** 5 jours
- **Context :** `weightReboundKg`, `waistStable`, `notes`, `hrvStatus` *(Enum : ÉQUILIBRÉ | TENDU | FATIGUÉ — Null Safe, absent si pas de montre connectée)*, `sleepScore` *(0–100 — Null Safe, absent si pas de montre connectée)*
- **Action :** Alerte rétention d'eau probable (cortisol/glycogène) — **blocage explicite de toute baisse calorique** jusqu'à normalisation.
- **Rationale :** Un rebond de poids brut > 1kg avec tour de taille stable et au moins un signal de stress récupératif (HRV dégradé, score de sommeil < 60, ou notes évoquant fatigue/stress) est un pattern typique de rétention hydrique liée au cortisol ou à la surcompensation glycogénique. Réduire les calories dans ce contexte serait une erreur d'interprétation du signal. Un score de sommeil < 60 est un indicateur fort de rétention hydrique liée au cortisol.

---

## 4. Contraintes Techniques et Gestion des Risques

### 4.1 Null Safety — Règle Absolue

Le moteur **doit** gérer gracieusement les valeurs `null`, `undefined` ou les chaînes vides. Exemples critiques :

```
// ❌ Dangereux — crash si notes est null
notes.toLowerCase().includes("chantier")

// ✅ Sécurisé — chaînage optionnel + valeur par défaut
notes?.toLowerCase().includes("chantier") ?? false

// ✅ Sécurisé — Guard explicite
(notes ?? "").toLowerCase().includes("chantier")
```

Tout champ `notes`, `waist`, ou tout autre champ optionnel doit être traité comme potentiellement absent dans chaque `trigger`.

### 4.2 Disponibilité des Données (Data Layer V1)

Les champs suivants **existent déjà** dans la structure de données de la V1 :

| Champ | Présence | Notes |
|---|---|---|
| `waist` | Optionnel par entrée | Peut être `null` si non saisi ce jour |
| `notes` | Optionnel par entrée | String libre, peut être `""` ou `null` |
| `weight` | Présent par entrée | Requis à la saisie |
| `calories` | Présent par entrée | Requis à la saisie |
| `steps` | Optionnel par entrée | Peut être `null` |
| `hrvStatus` | Optionnel (V2) | Statut hebdomadaire Garmin Connect — saisie manuelle le lundi. Enum : `ÉQUILIBRÉ`, `TENDU`, `FATIGUÉ`. `null` si l'utilisateur n'a pas de montre connectée. |
| `sleepScore` | Optionnel (V2) | Moyenne hebdomadaire du score de sommeil, ou score de la nuit précédant la pesée — saisie manuelle. Entier 0–100. `null` si l'utilisateur n'a pas de montre connectée. |

> **RÉSOLUTION :** Le marqueur **Body Battery** est officiellement retiré des spécifications afin d'éviter la redondance des signaux. `hrvStatus` et `sleepScore` couvrent le même périmètre sémantique avec une meilleure précision et une saisie plus standardisée.

**Aucune refonte de la Data Layer n'est nécessaire.** Ce développement V2 s'appuie exclusivement sur les données existantes enrichies de deux champs optionnels à saisie manuelle. Le Feature Freeze V1 n'est pas impacté.

### 4.3 Plan de Backtesting (Obligatoire avant déploiement)

Le plan de validation se déroule en deux phases distinctes :

#### Phase 1 — Crash Test de juin (Intégrité du code — 4 semaines d'historique)

> **Calendrier :** Exécution prévue courant juin 2026, à l'issue du cycle RUN V1.0 (≥ 2026-06-01).
> **Périmètre :** Validation de l'intégrité du code uniquement — pas de validation des recommandations.

À ce stade, l'historique disponible sera de ~4 semaines. Le Guard Global se déclenchera systématiquement (`INSUFFICIENT_HISTORY`). Le Crash Test vérifie :

1. Que `evaluateWeekly()` ne crashe pas sur des données réelles partielles.
2. Que le Guard Global retourne bien `{ triggered: false, reason: "INSUFFICIENT_HISTORY" }` et bloque toutes les règles.
3. Que la Null Safety fonctionne sur tous les champs optionnels (`notes`, `waist`, `steps`, `hrvStatus`, `sleepScore`).
4. Que le cache d'idempotence (`expert_result_<isoWeek>`) est correctement écrit et relu.

**Critère de succès :** Zéro crash, zéro recommandation générée (guard actif), zéro exception non gérée.

#### Phase 2 — Backtesting qualité (Pertinence des recommandations — 8 semaines minimum)

> **Calendrier :** Exécution possible à partir de fin juillet 2026 (8 semaines de RUN accumulées).

Avant mise en production des recommandations actives, chaque règle est validée selon ce protocole :

1. Exporter l'historique complet du `localStorage` (via la feature backup JSON existante).
2. Rejouer `evaluateWeekly()` sur chaque semaine historique disponible (minimum 8 semaines — Guard levé).
3. Pour chaque déclenchement détecté, vérifier manuellement la pertinence de la recommandation générée.
4. Taux d'acceptabilité minimum : **80% de déclenchements jugés pertinents** avant activation en production.
5. Documenter les faux positifs par règle dans ce fichier (section à compléter post-backtesting).

---

## 5. Ordre d'Évaluation et Gestion des Conflits

L'ordre d'évaluation suit la `priority` décroissante :

```
R1 (100) → R6 (9) → R2 (8) → R3 (6) → R4 (5) → R5 (4)
```

**Règle de conflit :** Si R1 se déclenche, les règles R2–R6 **ne sont pas évaluées** (données insuffisantes). Si R6 se déclenche, toute action de type réduction calorique provenant de R4 est **annulée**.

---

*Ce fichier est une spécification vivante. Mettre à jour la section backtesting après validation.*
