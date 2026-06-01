import { STORAGE_KEY } from '../constants/config.js';

// 1 kg de masse corporelle ≈ 7700 kcal (hypothèse tissus mixtes — adipeux + maigre)
const KCAL_PER_KG = 7700;
const SMOOTHING_WINDOW = 7;
const MIN_POINTS_FOR_TDEE = 7; // minimum par métrique sur 14j

/**
 * Interpolation linéaire des poids manquants dans une série chronologique.
 * - Gaps entre deux valeurs connues → interpolation linéaire
 * - Queue finale sans valeur → propagation de la dernière valeur connue
 * - Tête initiale sans valeur → propagation de la première valeur connue
 * - Aucune valeur connue → toutes entrées restent null
 */
function interpolateWeights(entries) {
  const result = entries.map(e => ({ ...e }));
  const n = result.length;

  let i = 0;
  while (i < n) {
    if (result[i].weight !== null) {
      i++;
      continue;
    }

    let prev = i - 1;
    while (prev >= 0 && result[prev].weight === null) prev--;
    let next = i;
    while (next < n && result[next].weight === null) next++;

    if (prev >= 0 && next < n) {
      const span = next - prev;
      for (let j = prev + 1; j < next; j++) {
        result[j].weight =
          result[prev].weight +
          ((result[next].weight - result[prev].weight) * (j - prev)) / span;
      }
      i = next + 1;
    } else if (prev >= 0) {
      for (let j = prev + 1; j < n; j++) result[j].weight = result[prev].weight;
      break;
    } else if (next < n) {
      for (let j = 0; j < next; j++) result[j].weight = result[next].weight;
      i = next + 1;
    } else {
      break;
    }
  }
  return result;
}

/**
 * Moyenne mobile sur SMOOTHING_WINDOW jours (fenêtre centrée ±3j).
 * Opère sur la série déjà interpolée — les null résiduels sont ignorés dans la moyenne.
 */
function movingAverage7(entries) {
  const half = Math.floor(SMOOTHING_WINDOW / 2);
  return entries.map((e, i) => {
    const slice = entries.slice(Math.max(0, i - half), Math.min(entries.length, i + half + 1));
    const known = slice.filter(s => s.weight !== null);
    const smoothed =
      known.length > 0
        ? known.reduce((sum, s) => sum + s.weight, 0) / known.length
        : null;
    return { ...e, smoothed };
  });
}

/**
 * Extrait les signaux physiologiques clés sur les 28 derniers jours.
 *
 * Retourne :
 *   smoothedWeight   — poids lissé 7j (kg, 2 décimales) ou null
 *   adaptiveTDEE     — TDEE calculé sur 14j (kcal/j) ou null si données < seuil
 *   weightTrend14d   — variation de poids lissée sur 14j (kg) ou null
 *   avgIntake        — apport moyen journalier sur 14j (kcal) ou null
 *   confidence       — densité de données 0–100 %
 *   hasEnoughData    — true si ≥ 7 entrées poids ET ≥ 7 jours d'apport sur 14j
 */
export function extractSignals() {
  let stored = { days: {} };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) stored = JSON.parse(raw);
  } catch (_) {
    // localStorage indisponible ou JSON corrompu — fallback silencieux
  }
  const days = stored.days ?? {};

  // Fenêtre glissante de 28 jours (J-27 → J0)
  const today = new Date().toISOString().slice(0, 10);
  const entries = [];
  for (let i = 27; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const day = days[key] ?? null;
    const rawWeight = day?.weight != null ? parseFloat(day.weight) : null;
    const rawIntake = day?.intake?.kcal != null ? parseFloat(day.intake.kcal) : null;
    entries.push({
      date: key,
      weight: rawWeight !== null && !isNaN(rawWeight) ? rawWeight : null,
      intake: rawIntake !== null && !isNaN(rawIntake) && rawIntake > 0 ? rawIntake : null,
    });
  }

  // Métriques de densité sur les 14 derniers jours
  const last14 = entries.slice(-14);
  const weightPoints = last14.filter(e => e.weight !== null).length;
  const intakeDays14 = last14.filter(e => e.intake !== null);
  const intakePoints = intakeDays14.length;

  // Confidence : (poids renseignés + apports renseignés) / 28 max attendus
  const confidence = Math.min(100, Math.round(((weightPoints + intakePoints) / 28) * 100));

  const hasEnoughData =
    weightPoints >= MIN_POINTS_FOR_TDEE && intakePoints >= MIN_POINTS_FOR_TDEE;

  // Lissage : interpolation puis moyenne mobile 7j
  const interpolated = interpolateWeights(entries);
  const smoothedEntries = movingAverage7(interpolated);

  // Poids lissé courant = moyenne des 7 derniers jours smoothed
  const recent7 = smoothedEntries.slice(-7).filter(e => e.smoothed !== null);
  const smoothedWeight =
    recent7.length > 0
      ? parseFloat(
          (recent7.reduce((s, e) => s + e.smoothed, 0) / recent7.length).toFixed(2)
        )
      : null;

  // Tendance 14j : première moitié vs seconde moitié de la fenêtre lissée
  const window14 = smoothedEntries.slice(-14);
  const firstHalf = window14.slice(0, 7).filter(e => e.smoothed !== null);
  const secondHalf = window14.slice(7).filter(e => e.smoothed !== null);

  let weightTrend14d = null;
  if (firstHalf.length > 0 && secondHalf.length > 0) {
    const avgFirst = firstHalf.reduce((s, e) => s + e.smoothed, 0) / firstHalf.length;
    const avgLast = secondHalf.reduce((s, e) => s + e.smoothed, 0) / secondHalf.length;
    weightTrend14d = parseFloat((avgLast - avgFirst).toFixed(2));
  }

  // Apport moyen 14j (jours saisis uniquement)
  const avgIntake =
    intakePoints > 0
      ? Math.round(intakeDays14.reduce((s, e) => s + e.intake, 0) / intakePoints)
      : null;

  // TDEE adaptatif : fiable uniquement si assez de données
  // dailyImbalance = (Δpoids_kg × 7700 kcal) / 14 jours
  // TDEE = apport_moyen - déséquilibre_journalier
  let adaptiveTDEE = null;
  if (hasEnoughData && weightTrend14d !== null && avgIntake !== null) {
    const dailyImbalance = (weightTrend14d * KCAL_PER_KG) / 14;
    adaptiveTDEE = Math.round(avgIntake - dailyImbalance);
  }

  return {
    smoothedWeight,
    adaptiveTDEE,
    weightTrend14d,
    avgIntake,
    confidence,
    hasEnoughData,
  };
}
