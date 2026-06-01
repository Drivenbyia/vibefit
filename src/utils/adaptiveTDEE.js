import { STORAGE_KEY } from '../constants/config.js';

// 1 kg de masse corporelle ≈ 7700 kcal (hypothèse tissus mixtes — adipeux + maigre)
const KCAL_PER_KG = 7700;
const SMOOTHING_WINDOW = 7;
const MIN_POINTS_FOR_TDEE = 7; // minimum par métrique sur la fenêtre
const HISTORY_SCAN_DAYS = 30;  // horizon de scan pour la fenêtre glissante
const WINDOW_SIZE = 14;        // taille cible de la sous-fenêtre TDEE

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
 * Data Quality Score d'une sous-fenêtre : nombre de jours où l'utilisateur
 * a saisi SIMULTANÉMENT un poids ET un apport calorique.
 */
function windowQualityScore(window) {
  return window.filter(e => e.weight !== null && e.intake !== null).length;
}

/**
 * Moteur de fenêtre glissante : scanne les `entries` (max HISTORY_SCAN_DAYS),
 * évalue chaque sous-fenêtre de WINDOW_SIZE jours et retourne les indices de
 * la fenêtre au Data Quality Score maximal.
 * En cas d'égalité de score, la fenêtre la plus récente est retenue.
 * Dégradation gracieuse si l'historique total est inférieur à WINDOW_SIZE :
 * toutes les entrées disponibles sont utilisées sans crash.
 */
function findBestWindow(entries) {
  const n = entries.length;

  if (n <= WINDOW_SIZE) {
    return { startIdx: 0, endIdx: n - 1, size: n };
  }

  let bestScore = -1;
  let bestStart = n - WINDOW_SIZE; // défaut : fenêtre la plus récente

  for (let start = 0; start <= n - WINDOW_SIZE; start++) {
    const score = windowQualityScore(entries.slice(start, start + WINDOW_SIZE));
    // >= pour que la fenêtre la plus récente l'emporte en cas d'égalité
    if (score >= bestScore) {
      bestScore = score;
      bestStart = start;
    }
  }

  return { startIdx: bestStart, endIdx: bestStart + WINDOW_SIZE - 1, size: WINDOW_SIZE };
}

/**
 * Extrait les signaux physiologiques clés sur la fenêtre optimale (≤30 jours).
 *
 * Retourne :
 *   smoothedWeight   — poids lissé 7j (kg, 2 décimales) ou null
 *   adaptiveTDEE     — TDEE calculé sur la fenêtre optimale (kcal/j) ou null si données < seuil
 *   weightTrend14d   — variation de poids lissée sur la fenêtre optimale (kg) ou null
 *   avgIntake        — apport moyen journalier sur la fenêtre optimale (kcal) ou null
 *   confidence       — densité de données 0–100 %
 *   hasEnoughData    — true si ≥ 7 entrées poids ET ≥ 7 jours d'apport sur la fenêtre
 *   windowStart      — date ISO de début de la fenêtre retenue
 *   windowEnd        — date ISO de fin de la fenêtre retenue
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

  // Historique brut sur HISTORY_SCAN_DAYS jours (J-29 → J0)
  const today = new Date().toISOString().slice(0, 10);
  const entries = [];
  for (let i = HISTORY_SCAN_DAYS - 1; i >= 0; i--) {
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

  // Sélection de la fenêtre optimale par Data Quality Score
  const { startIdx, endIdx, size } = findBestWindow(entries);
  const bestWindow = entries.slice(startIdx, endIdx + 1);
  const windowStart = bestWindow[0].date;
  const windowEnd = bestWindow[bestWindow.length - 1].date;

  // Métriques de qualité sur la fenêtre optimale
  const weightPoints = bestWindow.filter(e => e.weight !== null).length;
  const intakeDays = bestWindow.filter(e => e.intake !== null);
  const intakePoints = intakeDays.length;
  const confidence = Math.min(100, Math.round(((weightPoints + intakePoints) / (2 * size)) * 100));
  const hasEnoughData =
    weightPoints >= MIN_POINTS_FOR_TDEE && intakePoints >= MIN_POINTS_FOR_TDEE;

  // Lissage sur l'historique complet pour une baseline plus robuste
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

  // Tendance sur la fenêtre optimale (valeurs lissées)
  const smoothedWindow = smoothedEntries.slice(startIdx, endIdx + 1);
  const half = Math.floor(smoothedWindow.length / 2);
  const firstHalf = smoothedWindow.slice(0, half).filter(e => e.smoothed !== null);
  const secondHalf = smoothedWindow.slice(half).filter(e => e.smoothed !== null);

  let weightTrend14d = null;
  if (firstHalf.length > 0 && secondHalf.length > 0) {
    const avgFirst = firstHalf.reduce((s, e) => s + e.smoothed, 0) / firstHalf.length;
    const avgLast = secondHalf.reduce((s, e) => s + e.smoothed, 0) / secondHalf.length;
    weightTrend14d = parseFloat((avgLast - avgFirst).toFixed(2));
  }

  // Apport moyen sur la fenêtre optimale (jours saisis uniquement)
  const avgIntake =
    intakePoints > 0
      ? Math.round(intakeDays.reduce((s, e) => s + e.intake, 0) / intakePoints)
      : null;

  // TDEE adaptatif : fiable uniquement si assez de données
  // dailyImbalance = (Δpoids_kg × 7700 kcal) / taille_fenêtre
  // TDEE = apport_moyen − déséquilibre_journalier
  let adaptiveTDEE = null;
  if (hasEnoughData && weightTrend14d !== null && avgIntake !== null) {
    const dailyImbalance = (weightTrend14d * KCAL_PER_KG) / size;
    adaptiveTDEE = Math.round(avgIntake - dailyImbalance);
  }

  return {
    smoothedWeight,
    adaptiveTDEE,
    weightTrend14d,
    avgIntake,
    confidence,
    hasEnoughData,
    windowStart,
    windowEnd,
  };
}
