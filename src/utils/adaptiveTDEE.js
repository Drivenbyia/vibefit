import {
  KCAL_PER_KG,
  WEIGHT_MIN_KG,
  WEIGHT_MAX_KG,
  INTAKE_MIN_KCAL,
  INTAKE_MAX_KCAL,
  MAX_DAILY_WEIGHT_JUMP_KG,
} from '../constants/config.js';
import { toKey, addDays } from './dateUtils.js';
import { isExcluded, sanitizeProtocol } from '../models/protocol.js';
import { checkTDEE, TDEE_CHECK } from './plausibility.js';
import { slopeWithError, tdeeCi95, isReadable, sanitizeScaleResolution } from './trendUncertainty.js';
import { TREND_WINDOW_SIZES } from '../constants/config.js';

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

/** Poids et apport valides (bornes de plausibilité) d'un jour, ou null. */
function crossedValues(day) {
  const w = day?.weight != null ? parseFloat(day.weight) : NaN;
  const kc = day?.intake?.kcal != null ? parseFloat(day.intake.kcal) : NaN;
  return {
    weight: !isNaN(w) && w >= WEIGHT_MIN_KG && w <= WEIGHT_MAX_KG ? w : null,
    intake: !isNaN(kc) && kc >= INTAKE_MIN_KCAL && kc <= INTAKE_MAX_KCAL ? kc : null,
  };
}

/** Statut d'un jour au regard de la calibration. */
export const CALIBRATION_DAY = {
  COUNTED: 'counted',       // poids ET apport : le jour compte
  NO_WEIGHT: 'no_weight',   // apport saisi, pesée manquante
  NO_INTAKE: 'no_intake',   // pesée saisie, apport manquant
  EMPTY: 'empty',           // ni l'un ni l'autre
};

/**
 * Statut d'un jour pour la calibration, ou null s'il n'y participe pas
 * (avant son début, dans le futur, ou neutralisé par une coupure).
 */
export function calibrationDayStatus(key, day, periods, calibration, today) {
  if (!calibration || key < calibration.start || key > today) return null;
  if (isExcluded(key, periods, 'nutrition')) return null;
  const { weight, intake } = crossedValues(day);
  if (weight !== null && intake !== null) return CALIBRATION_DAY.COUNTED;
  if (weight === null && intake === null) return CALIBRATION_DAY.EMPTY;
  return weight === null ? CALIBRATION_DAY.NO_WEIGHT : CALIBRATION_DAY.NO_INTAKE;
}

/**
 * État de la calibration : jours croisés poids × apport depuis son début,
 * sur TOUT l'historique (pas seulement l'horizon de 30 jours), coupures exclues.
 * Le compte est monotone : une fois atteint, le seuil reste atteint.
 *
 * Expose aussi ce qui MANQUE, pour que le compte se pilote au lieu de se
 * subir : les jours passés incomplets (à rattraper) et la date la plus proche
 * à laquelle le seuil peut être atteint si chaque jour à venir est complet.
 * Aujourd'hui n'est jamais « incomplet » : la journée n'est pas finie.
 */
function calibrationState(days, periods, calibration, today) {
  if (!calibration) return null;
  let crossedDays = 0;
  const incompleteDays = [];
  let todayStatus = null;
  for (let key = calibration.start; key <= today; key = addDays(key, 1)) {
    const status = calibrationDayStatus(key, days[key], periods, calibration, today);
    if (status === null) continue;
    if (status === CALIBRATION_DAY.COUNTED) crossedDays += 1;
    if (key === today) todayStatus = status;
    else if (status !== CALIBRATION_DAY.COUNTED) incompleteDays.push({ key, status });
  }
  const remaining = calibration.requiredDays - crossedDays;
  const active = remaining > 0;
  // Si aujourd'hui compte déjà, le prochain jour possible est demain.
  const todayCounted = todayStatus === CALIBRATION_DAY.COUNTED;
  return {
    start: calibration.start,
    seedTDEE: calibration.seedTDEE,
    requiredDays: calibration.requiredDays,
    crossedDays,
    active,
    incompleteDays,
    todayStatus,
    earliestCompletion: active ? addDays(today, todayCounted ? remaining : remaining - 1) : null,
  };
}

/**
 * État de la calibration au jour réel, sans le reste des signaux — pour le
 * calendrier de la Semaine. Même calcul que `extractSignals().calibration`.
 */
export function calibrationProgress(data, today = toKey(new Date())) {
  const { calibration } = sanitizeProtocol(data ?? {});
  return calibrationState(data?.days ?? {}, data?.periods ?? [], calibration, today);
}

/**
 * Extrait les signaux physiologiques clés sur la fenêtre optimale (≤30 jours).
 *
 * @param {{days: Object}} data — state applicatif (injecté, pas de lecture localStorage)
 *
 * Retourne :
 *   smoothedWeight      — poids lissé 7j (kg, 2 décimales) ou null
 *   adaptiveTDEE        — TDEE sur la fenêtre optimale (kcal/j) ou null si données < seuil
 *                         ou si la mesure est physiologiquement incohérente
 *   measuredTDEE        — calcul brut, publié même hors plage (explication seule)
 *   tdeeCheck           — plausibilité : { status, bmr, minKcal, lowKcal, maxKcal } ou null
 *   weightTrendPerWeek  — pente de poids lissée (kg/semaine) ou null
 *   avgIntake           — apport moyen journalier sur la fenêtre (kcal) ou null
 *   confidence          — complétude : recouvrement poids × apport, 0–100 %
 *   tdeeCi95            — ±kcal à 95 % sur le TDEE (pente + quantification)
 *   trendReadable       — intervalle ≤ ±300 kcal (sinon : pas de recalibration)
 *   windowSize          — 14, 21 ou 28 j (allongée tant que la tendance est illisible)
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
  const { calibration: calib } = sanitizeProtocol(data ?? {});

  // Historique brut sur HISTORY_SCAN_DAYS jours (J-29 → J0).
  // toKey/addDays produisent une date locale, alignée sur les clés de saisie.
  const today = toKey(new Date());
  const calibration = calibrationState(days, periods, calib, today);
  const rawEntries = [];
  for (let i = HISTORY_SCAN_DAYS - 1; i >= 0; i--) {
    const key = addDays(today, -i);
    const day = days[key] ?? null;

    const { weight, intake } = crossedValues(day);
    // Jour de coupure nutritionnelle : neutralisé AVANT tout calcul, même si
    // une valeur y a été saisie — elle n'entre ni dans le TDEE, ni dans la
    // confiance, ni dans la tendance. Même traitement pour les jours
    // antérieurs au début d'une calibration : le TDEE repart de zéro, il ne
    // doit pas mélanger l'avant (entraînement, chantiers) et l'après.
    const excluded = isExcluded(key, periods, 'nutrition')
      || (calibration !== null && key < calibration.start);

    rawEntries.push({
      date: key,
      weight: excluded ? null : weight,
      intake: excluded ? null : intake,
      heavyWork: !excluded && !!day?.heavyWork,
      excluded,
    });
  }

  const entries = bySegment(rawEntries, rejectWeightOutliers);

  // Sélection de la fenêtre optimale par Data Quality Score. `null` ⇒ aucune
  // fenêtre complète hors coupure : tout le reste se dégrade en « pas de TDEE ».
  const best = findBestWindow(entries);
  const { startIdx, endIdx } = best ?? { startIdx: 0, endIdx: -1 };

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

  const resolutionKg = sanitizeScaleResolution(data?.scaleResolutionKg);

  // Estimation sur une fenêtre [start, end] : pente, apport, incertitude.
  //
  // Tendance : pente des moindres carrés sur les poids INTERPOLÉS, pas lissés.
  // Pré-lisser avant de régresser biaise la pente : la moyenne mobile est tronquée
  // aux bords de série, ce qui aplatit les derniers points et sous-estime la pente
  // (mesuré : −42 kcal/j sur données parfaites). La moyenne mobile reste utilisée
  // pour `smoothedWeight`, la valeur AFFICHÉE à l'utilisateur.
  //
  // L'index x est l'index réel dans la fenêtre — filtrer avant de l'affecter
  // décalerait la pente en présence de trous.
  //
  // Incertitude : erreur standard de la pente sur les seules pesées MESURÉES,
  // bruit de quantification de la balance inclus, convertie en ±kcal à 95 %.
  const estimate = (start, end) => {
    const win = entries.slice(start, end + 1);
    const size = win.length;
    const overlap = windowQualityScore(win);
    const tdeeWindow = interpolated.slice(start, end + 1);
    const slope = olsSlope(tdeeWindow.map((e, i) => ({ x: i, y: e.weight })).filter((p) => p.y !== null));
    const fit = slopeWithError(win.map((e, i) => ({ x: i, y: e.weight })).filter((p) => p.y !== null), resolutionKg);
    const intakeDays = win.filter((e) => e.intake !== null);
    return {
      start, end, size, win, overlap, slope,
      ci95: tdeeCi95(fit),
      // 10 jours croisés sur 14, au prorata sur 21 ou 28.
      hasEnough: size > 0 && overlap >= Math.min(Math.ceil((MIN_OVERLAP_DAYS * size) / WINDOW_SIZE), size),
      interpolatedCount: tdeeWindow.filter((e) => e.interpolated).length,
      avgIntake: intakeDays.length > 0
        ? Math.round(intakeDays.reduce((s, e) => s + e.intake, 0) / intakeDays.length)
        : null,
    };
  };

  // Fenêtre retenue : 14 jours ; si la tendance n'y est pas lisible, on
  // remonte le début à 21 puis 28 jours, même fin, tant que la fenêtre
  // allongée reste hors coupure (et après le début de calibration) et
  // suffisamment saisie. Faute de mieux, la plus longue tentée reste.
  let est = best ? estimate(startIdx, endIdx) : null;
  if (est && !isReadable(est.ci95)) {
    for (const len of TREND_WINDOW_SIZES.filter((l) => l > est.size)) {
      const s0 = endIdx - len + 1;
      if (s0 < 0 || entries.slice(s0, endIdx + 1).some((e) => e.excluded)) break;
      const longer = estimate(s0, endIdx);
      if (!longer.hasEnough) break;
      est = longer;
      if (isReadable(est.ci95)) break;
    }
  }

  const chosen = est?.win ?? [];
  const size = est?.size ?? 0;
  const windowStart = chosen[0]?.date ?? null;
  const windowEnd = chosen[chosen.length - 1]?.date ?? null;
  const windowAgeDays = best ? entries.length - 1 - endIdx : null;

  // Complétude = recouvrement poids × apport sur la fenêtre (ex-« confiance »)
  const overlapDays = est?.overlap ?? 0;
  // Jours d'effort lourd hors séance contenus dans la fenêtre retenue. Ne
  // corrige RIEN au calcul — c'est une mesure de représentativité.
  const heavyWorkDays = chosen.filter((e) => e.heavyWork).length;
  const confidence = size > 0 ? Math.round((overlapDays / size) * 100) : 0;
  const hasEnoughData = !!est?.hasEnough;

  const slopeKgPerDay = est?.slope ?? null;
  const weightTrendPerWeek = slopeKgPerDay !== null ? round2(slopeKgPerDay * 7) : null;
  const interpolatedCount = est?.interpolatedCount ?? 0;
  const avgIntake = est?.avgIntake ?? null;

  // TDEE adaptatif : apport moyen − déséquilibre énergétique journalier.
  // La pente OLS est déjà en kg/JOUR — aucune division par la taille de fenêtre.
  //
  // Calibration en cours : AUCUNE valeur publiée, même si une fenêtre à 10
  // jours croisés existe déjà. Un TDEE affiché trop tôt serait lu, et une
  // valeur lue est une valeur sur laquelle on recalibre.
  let measuredTDEE = null;
  if (!calibration?.active && hasEnoughData && slopeKgPerDay !== null && avgIntake !== null) {
    measuredTDEE = Math.round(avgIntake - slopeKgPerDay * KCAL_PER_KG);
  }
  // Intervalle à 95 % du TDEE (±kcal) et lisibilité — publiés avec le TDEE.
  const tdeeCi95Kcal = measuredTDEE !== null ? (est?.ci95 ?? null) : null;
  const trendReadable = measuredTDEE !== null ? isReadable(tdeeCi95Kcal) : null;

  // Garde-fou de plausibilité : un résultat juste arithmétiquement peut être
  // faux physiologiquement (tendance de poids faussée par une balance au kg
  // près ou un début de fenêtre atypique). Hors plage, AUCUN TDEE n'est publié :
  // `adaptiveTDEE` passe à null, et tout ce qui en dépend (recalibration,
  // plateau, bilan) le traite comme absent. Le calcul brut reste exposé dans
  // `measuredTDEE` pour l'expliquer, jamais pour s'en servir.
  const tdeeCheck = checkTDEE(measuredTDEE, data?.profile, smoothedWeight, today);
  const adaptiveTDEE = tdeeCheck?.status === TDEE_CHECK.IMPLAUSIBLE ? null : measuredTDEE;

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
    // Calcul brut, même hors plage — affichage d'explication uniquement.
    measuredTDEE,
    // null sans TDEE calculé ; sinon { status, bmr, minKcal, lowKcal, maxKcal }
    tdeeCheck,
    // Demi-largeur de l'intervalle à 95 % du TDEE (kcal), null sans TDEE.
    tdeeCi95: tdeeCi95Kcal,
    // Intervalle ≤ ±300 kcal ? null sans TDEE.
    trendReadable,
    // Taille de la fenêtre retenue (14, 21 ou 28 j) et résolution de balance.
    windowSize: size,
    scaleResolutionKg: resolutionKg,
    // null sans calibration ; sinon { start, seedTDEE, requiredDays, crossedDays, active }
    calibration,
    weightTrendPerWeek,
    avgIntake,
    confidence,
    hasEnoughData: hasEnoughData && !calibration?.active,
    overlapDays,
    heavyWorkDays,
    interpolatedCount,
    windowStart,
    windowEnd,
    windowAgeDays,
    // Jours neutralisés par une COUPURE (pas par le début de calibration).
    excludedDays: entries.filter((e) => isExcluded(e.date, periods, 'nutrition')).length,
  };
}
