import {
  KCAL_PER_KG,
  WEIGHT_MIN_KG,
  WEIGHT_MAX_KG,
  INTAKE_MIN_KCAL,
  INTAKE_MAX_KCAL,
  MAX_DAILY_WEIGHT_JUMP_KG,
} from '../constants/config.js';
import { toKey, addDays } from './dateUtils.js';
import { isExcluded } from '../models/protocol.js';

const SMOOTHING_WINDOW = 7;
const HISTORY_SCAN_DAYS = 30;  // horizon de scan pour la fenêtre glissante
const WINDOW_SIZE = 14;        // taille cible de la sous-fenêtre TDEE
const MIN_OVERLAP_DAYS = 10;   // jours poids ET apport requis sur la fenêtre
// 4 jours d'ancienneté coûtent 1 point de qualité : à densité comparable,
// une fenêtre récente l'emporte sur une fenêtre dense mais périmée.
const RECENCY_PENALTY_PER_DAY = 0.25;

const round2 = (v) => parseFloat(v.toFixed(2));

/**
 * Pente des moindres carrés (régression linéaire ordinaire).
 * @param {{x: number, y: number}[]} points — x = index du jour, y = valeur
 * @returns {number|null} pente en unité/jour, ou null si indéterminable
 */
export function olsSlope(points) {
  const n = points.length;
  if (n < 2) return null;

  const meanX = points.reduce((a, p) => a + p.x, 0) / n;
  const meanY = points.reduce((a, p) => a + p.y, 0) / n;

  let num = 0;
  let den = 0;
  for (const p of points) {
    num += (p.x - meanX) * (p.y - meanY);
    den += (p.x - meanX) ** 2;
  }

  return den === 0 ? null : num / den;
}

/**
 * Écarte les poids aberrants : un point est rejeté s'il est en désaccord avec
 * TOUS ses voisins connus (écart > MAX_DAILY_WEIGHT_JUMP_KG × jours écoulés).
 *
 * Le test bilatéral est volontaire — un vrai changement de palier reste cohérent
 * avec son successeur et survit, alors qu'un pic isolé (erreur de saisie) est
 * en désaccord des deux côtés. Un test unilatéral rejetterait en cascade toute
 * la série suivant une première valeur erronée.
 */
function rejectWeightOutliers(entries) {
  const known = entries
    .map((e, i) => ({ i, w: e.weight }))
    .filter((p) => p.w !== null);

  const disagrees = (a, b) =>
    Math.abs(a.w - b.w) > MAX_DAILY_WEIGHT_JUMP_KG * Math.abs(a.i - b.i);

  const flagged = new Set();
  for (let k = 0; k < known.length; k++) {
    const cur = known[k];
    const sides = [];
    if (known[k - 1]) sides.push(disagrees(cur, known[k - 1]));
    if (known[k + 1]) sides.push(disagrees(cur, known[k + 1]));
    if (sides.length > 0 && sides.every(Boolean)) flagged.add(cur.i);
  }

  return entries.map((e, i) => (flagged.has(i) ? { ...e, weight: null } : e));
}

/**
 * Interpolation linéaire des poids manquants — UNIQUEMENT entre deux valeurs
 * connues. Les têtes et queues sans mesure restent `null`.
 *
 * Aucune propagation de la dernière valeur connue : remplir à plat amortirait
 * la tendance (arrêter de se peser 5 jours tirerait la pente vers zéro, donc
 * le TDEE vers l'apport moyen). Mieux vaut moins de points qu'un signal biaisé.
 */
function interpolateWeights(entries) {
  const result = entries.map((e) => ({ ...e, interpolated: false }));
  const known = [];
  for (let i = 0; i < result.length; i++) {
    if (result[i].weight !== null) known.push(i);
  }

  for (let k = 0; k < known.length - 1; k++) {
    const a = known[k];
    const b = known[k + 1];
    if (b - a <= 1) continue;

    const span = b - a;
    for (let j = a + 1; j < b; j++) {
      result[j].weight =
        result[a].weight + ((result[b].weight - result[a].weight) * (j - a)) / span;
      result[j].interpolated = true;
    }
  }

  return result;
}

/**
 * Moyenne mobile sur SMOOTHING_WINDOW jours (fenêtre centrée ±3j).
 * Opère sur la série déjà interpolée — les null résiduels sont ignorés.
 */
function movingAverage7(entries) {
  const half = Math.floor(SMOOTHING_WINDOW / 2);
  return entries.map((e, i) => {
    const slice = entries.slice(Math.max(0, i - half), Math.min(entries.length, i + half + 1));
    const known = slice.filter((s) => s.weight !== null);
    const smoothed =
      known.length > 0 ? known.reduce((sum, s) => sum + s.weight, 0) / known.length : null;
    return { ...e, smoothed };
  });
}

/**
 * Applique `fn` à chaque SEGMENT continu de jours non exclus, séparément.
 *
 * Une coupure (période non suivie) n'est pas un trou de saisie ordinaire :
 * l'interpolation, le rejet des aberrants et le lissage ne doivent jamais la
 * traverser. Relier une pesée d'août à une pesée d'octobre fabriquerait deux
 * mois de poids que personne n'a mesurés — exactement les données inventées
 * que la coupure doit empêcher. Les jours exclus sont rendus tels quels.
 *
 * Sans coupure, il n'y a qu'un segment : `fn` reçoit la série entière et le
 * résultat est strictement celui d'avant.
 */
function bySegment(entries, fn) {
  const out = new Array(entries.length);
  let start = 0;
  const flush = (end) => {
    if (end > start) fn(entries.slice(start, end)).forEach((e, i) => { out[start + i] = e; });
  };
  for (let i = 0; i < entries.length; i++) {
    if (entries[i].excluded) {
      flush(i);
      out[i] = entries[i];
      start = i + 1;
    }
  }
  flush(entries.length);
  return out;
}

/**
 * Data Quality Score d'une sous-fenêtre : nombre de jours où l'utilisateur
 * a saisi SIMULTANÉMENT un poids ET un apport calorique.
 *
 * Le recouvrement est la bonne métrique : l'équation de bilan énergétique
 * croise les deux signaux, un jour où un seul est présent ne l'alimente pas.
 */
function windowQualityScore(window) {
  return window.filter((e) => e.weight !== null && e.intake !== null).length;
}

/**
 * Moteur de fenêtre glissante : évalue chaque sous-fenêtre de WINDOW_SIZE jours
 * et retourne les indices de la meilleure, score = recouvrement − pénalité d'âge.
 * En cas d'égalité, la fenêtre la plus récente est retenue.
 * Dégradation gracieuse si l'historique total est inférieur à WINDOW_SIZE.
 */
function findBestWindow(entries) {
  const n = entries.length;

  if (n <= WINDOW_SIZE) {
    return { startIdx: 0, endIdx: n - 1, size: n };
  }

  let bestScore = -Infinity;
  let bestStart = n - WINDOW_SIZE; // défaut : fenêtre la plus récente
  let found = false;

  for (let start = 0; start <= n - WINDOW_SIZE; start++) {
    const endIdx = start + WINDOW_SIZE - 1;
    // Une fenêtre qui contient un jour exclu chevauche une coupure : sa pente
    // relierait deux périodes que rien ne relie. Elle n'est pas candidate.
    if (entries.slice(start, start + WINDOW_SIZE).some((e) => e.excluded)) continue;
    found = true;
    const overlap = windowQualityScore(entries.slice(start, start + WINDOW_SIZE));
    const score = overlap - (n - 1 - endIdx) * RECENCY_PENALTY_PER_DAY;
    // >= pour que la fenêtre la plus récente l'emporte en cas d'égalité
    if (score >= bestScore) {
      bestScore = score;
      bestStart = start;
    }
  }

  // Aucune fenêtre complète hors coupure (reprise de moins de 14 jours) :
  // pas de fenêtre du tout, plutôt qu'une fenêtre tronquée qui publierait un
  // TDEE sur 3 jours.
  if (!found) return null;

  return { startIdx: bestStart, endIdx: bestStart + WINDOW_SIZE - 1, size: WINDOW_SIZE };
}

/**
 * Extrait les signaux physiologiques clés sur la fenêtre optimale (≤30 jours).
 *
 * @param {{days: Object}} data — state applicatif (injecté, pas de lecture localStorage)
 *
 * Retourne :
 *   smoothedWeight      — poids lissé 7j (kg, 2 décimales) ou null
 *   adaptiveTDEE        — TDEE sur la fenêtre optimale (kcal/j) ou null si données < seuil
 *   weightTrendPerWeek  — pente de poids lissée (kg/semaine) ou null
 *   avgIntake           — apport moyen journalier sur la fenêtre (kcal) ou null
 *   confidence          — recouvrement poids × apport, 0–100 %
 *   hasEnoughData       — true si recouvrement ≥ MIN_OVERLAP_DAYS sur la fenêtre
 *   overlapDays         — jours avec poids ET apport sur la fenêtre
 *   interpolatedCount   — poids reconstruits par interpolation sur la fenêtre
 *   windowStart/End     — dates ISO de la fenêtre retenue
 *   windowAgeDays       — ancienneté de windowEnd par rapport à aujourd'hui
 *                         (null si aucune fenêtre complète hors coupure)
 *   excludedDays        — jours de l'horizon neutralisés par une coupure
 */
export function extractSignals(data) {
  const days = data?.days ?? {};
  const periods = data?.periods ?? [];

  // Historique brut sur HISTORY_SCAN_DAYS jours (J-29 → J0).
  // toKey/addDays produisent une date locale, alignée sur les clés de saisie.
  const today = toKey(new Date());
  const rawEntries = [];
  for (let i = HISTORY_SCAN_DAYS - 1; i >= 0; i--) {
    const key = addDays(today, -i);
    const day = days[key] ?? null;

    const w = day?.weight != null ? parseFloat(day.weight) : NaN;
    const kc = day?.intake?.kcal != null ? parseFloat(day.intake.kcal) : NaN;
    // Jour de coupure nutritionnelle : neutralisé AVANT tout calcul, même si
    // une valeur y a été saisie — elle n'entre ni dans le TDEE, ni dans la
    // confiance, ni dans la tendance.
    const excluded = isExcluded(key, periods, 'nutrition');

    rawEntries.push({
      date: key,
      weight: !excluded && !isNaN(w) && w >= WEIGHT_MIN_KG && w <= WEIGHT_MAX_KG ? w : null,
      intake: !excluded && !isNaN(kc) && kc >= INTAKE_MIN_KCAL && kc <= INTAKE_MAX_KCAL ? kc : null,
      heavyWork: !excluded && !!day?.heavyWork,
      excluded,
    });
  }

  const entries = bySegment(rawEntries, rejectWeightOutliers);

  // Sélection de la fenêtre optimale par Data Quality Score. `null` ⇒ aucune
  // fenêtre complète hors coupure : tout le reste se dégrade en « pas de TDEE ».
  const best = findBestWindow(entries);
  const { startIdx, endIdx, size } = best ?? { startIdx: 0, endIdx: -1, size: 0 };
  const bestWindow = entries.slice(startIdx, endIdx + 1);
  const windowStart = bestWindow[0]?.date ?? null;
  const windowEnd = bestWindow[bestWindow.length - 1]?.date ?? null;
  const windowAgeDays = best ? entries.length - 1 - endIdx : null;

  // Qualité = recouvrement poids × apport sur la fenêtre
  const overlapDays = windowQualityScore(bestWindow);
  // Jours d'effort lourd hors séance contenus dans la fenêtre retenue. Ne
  // corrige RIEN au calcul — c'est une mesure de représentativité : deux
  // fenêtres de même qualité formelle ne décrivent pas la même vie si l'une
  // contient quatre jours de chantier et l'autre zéro.
  const heavyWorkDays = bestWindow.filter((e) => e.heavyWork).length;
  const confidence = size > 0 ? Math.round((overlapDays / size) * 100) : 0;
  const hasEnoughData = size > 0 && overlapDays >= Math.min(MIN_OVERLAP_DAYS, size);

  // Lissage sur l'historique complet pour une baseline plus robuste
  const interpolated = bySegment(entries, interpolateWeights);
  const smoothedEntries = bySegment(interpolated, movingAverage7);

  // Poids lissé courant = moyenne des 7 derniers jours smoothed
  // Limité au segment courant : le poids « actuel » ne mélange pas l'avant et
  // l'après d'une coupure. Les jours exclus n'ont pas de `smoothed` (undefined).
  const lastCut = entries.map((e) => e.excluded).lastIndexOf(true);
  const recent7 = smoothedEntries
    .slice(Math.max(lastCut + 1, smoothedEntries.length - 7))
    .filter((e) => e.smoothed != null);
  const smoothedWeight =
    recent7.length > 0
      ? round2(recent7.reduce((s, e) => s + e.smoothed, 0) / recent7.length)
      : null;

  // Tendance : pente des moindres carrés sur les poids INTERPOLÉS, pas lissés.
  //
  // Pré-lisser avant de régresser biaise la pente : la moyenne mobile est tronquée
  // aux bords de série, ce qui aplatit les derniers points et sous-estime la pente
  // (mesuré : −42 kcal/j sur données parfaites). L'OLS est déjà un estimateur
  // optimal du bruit sous hypothèse iid — le lissage préalable n'apporte rien et
  // introduit de l'autocorrélation. La moyenne mobile reste utilisée pour
  // `smoothedWeight`, la valeur AFFICHÉE à l'utilisateur.
  //
  // L'index x est l'index réel dans la fenêtre — filtrer avant de l'affecter
  // décalerait la pente en présence de trous.
  const tdeeWindow = interpolated.slice(startIdx, endIdx + 1);
  const slopeKgPerDay = olsSlope(
    tdeeWindow.map((e, i) => ({ x: i, y: e.weight })).filter((p) => p.y !== null)
  );
  const weightTrendPerWeek = slopeKgPerDay !== null ? round2(slopeKgPerDay * 7) : null;
  const interpolatedCount = tdeeWindow.filter((e) => e.interpolated).length;

  // Apport moyen sur la fenêtre (jours saisis uniquement)
  const intakeDays = bestWindow.filter((e) => e.intake !== null);
  const avgIntake =
    intakeDays.length > 0
      ? Math.round(intakeDays.reduce((s, e) => s + e.intake, 0) / intakeDays.length)
      : null;

  // TDEE adaptatif : apport moyen − déséquilibre énergétique journalier.
  // La pente OLS est déjà en kg/JOUR — aucune division par la taille de fenêtre.
  let adaptiveTDEE = null;
  if (hasEnoughData && slopeKgPerDay !== null && avgIntake !== null) {
    adaptiveTDEE = Math.round(avgIntake - slopeKgPerDay * KCAL_PER_KG);
  }

  // Série lissée destinée au TRACÉ seul (bande d'état). `x` est l'index réel
  // dans l'horizon de scan, jamais l'index après filtrage : un trou de pesée
  // doit s'afficher comme un segment plus long, pas comprimer le temps.
  //
  // Seul le DERNIER segment est tracé : une courbe qui joindrait l'avant et
  // l'après d'une coupure dessinerait une évolution jamais mesurée.
  const weightSeries = smoothedEntries
    .map((e, x) => ({ x, y: e.smoothed ?? null }))
    .filter((p) => p.x > lastCut && p.y !== null);

  return {
    smoothedWeight,
    weightSeries,
    adaptiveTDEE,
    weightTrendPerWeek,
    avgIntake,
    confidence,
    hasEnoughData,
    overlapDays,
    heavyWorkDays,
    interpolatedCount,
    windowStart,
    windowEnd,
    windowAgeDays,
    excludedDays: entries.filter((e) => e.excluded).length,
  };
}
