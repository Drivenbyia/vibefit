import { num } from './mathUtils.js';
import { fmtInt, fmtDec } from './format.js';

/**
 * Saisie rapide — module PUR. Décrit les mesures que le panneau « + » sait
 * saisir à la réglette : bornes, pas, lecture dans un jour, patch d'écriture.
 *
 * Les valeurs sont écrites en CHAÎNE, comme le fait `NumberInput` : le modèle
 * des jours ne change pas, une saisie rapide et une saisie au clavier sont
 * indiscernables dans les données et dans l'export.
 */

const thousands = fmtInt;
const decimal = fmtDec;
export const formatSleep = (min) => `${Math.floor(min / 60)} h ${String(Math.round(min) % 60).padStart(2, '0')}`;

const stepDecimals = (step) => (String(step).split('.')[1] ?? '').length;

export const QUICK_METRICS = [
  {
    id: 'kcal', label: 'Apport', unit: 'kcal', min: 0, max: 4000, step: 10,
    read: (day) => num(day?.intake?.kcal),
    patch: (day, v) => ({ intake: { ...day.intake, kcal: String(v) } }),
    format: thousands,
  },
  {
    id: 'protein', label: 'Protéines', unit: 'g', min: 0, max: 250, step: 1,
    read: (day) => num(day?.intake?.protein),
    patch: (day, v) => ({ intake: { ...day.intake, protein: String(v) } }),
    format: thousands,
  },
  {
    id: 'steps', label: 'Pas', unit: 'pas', min: 0, max: 30000, step: 100,
    read: (day) => num(day?.expenditure?.steps),
    patch: (day, v) => ({ expenditure: { ...day.expenditure, steps: String(v) } }),
    format: thousands,
  },
  {
    id: 'weight', label: 'Poids', unit: 'kg', span: 8, step: 0.5,
    read: (day) => num(day?.weight),
    patch: (_day, v) => ({ weight: String(v) }),
    format: (v) => decimal(v, 1),
  },
  {
    id: 'sleep', label: 'Sommeil', unit: 'de sommeil', min: 0, max: 720, step: 5,
    read: (day) => num(day?.sleep?.durationMin),
    patch: (day, v) => ({ sleep: { ...(day.sleep ?? {}), durationMin: v > 0 ? String(v) : '' } }),
    format: formatSleep,
  },
];

export const quickMetric = (id) => QUICK_METRICS.find((m) => m.id === id) ?? QUICK_METRICS[0];

/** Dernière valeur > 0 d'une mesure AVANT `dateKey` (clés ISO, ordre lexical = chronologique). */
export function lastKnown(days, dateKey, read) {
  const keys = Object.keys(days ?? {}).filter((k) => k < dateKey).sort().reverse();
  for (const k of keys) {
    const v = read(days[k]);
    if (v > 0) return v;
  }
  return null;
}

/**
 * Bornes et pas effectifs. Le poids se règle autour de la dernière pesée
 * connue (± `span` kg) au pas de la balance : une réglette de 0 à 200 kg
 * rendrait chaque cran de 0,5 kg impossible à viser au doigt.
 */
export function metricRange(metric, { anchor, scaleResolutionKg } = {}) {
  if (metric.id !== 'weight') return { min: metric.min, max: metric.max, step: metric.step };
  const step = scaleResolutionKg > 0 ? scaleResolutionKg : metric.step;
  const center = anchor > 0 ? anchor : 75;
  const min = Math.max(30, Math.floor((center - metric.span) / step) * step);
  return { min, max: min + 2 * metric.span, step };
}

/** Ramène une valeur dans les bornes, sur un cran exact (sans dérive flottante). */
export function snap(value, { min, max, step }) {
  const clamped = Math.min(max, Math.max(min, value));
  const snapped = min + Math.round((clamped - min) / step) * step;
  return Number(snapped.toFixed(stepDecimals(step)));
}

/**
 * Valeur de départ de la réglette : la saisie du jour si elle existe, sinon la
 * dernière connue (poids, sommeil), sinon la cible (apport, protéines, pas).
 * Rien n'est écrit tant que « Enregistrer » n'est pas touché.
 */
export function initialDraft(metric, { day, previous, target, range }) {
  const current = metric.read(day);
  const fallback = { weight: previous, sleep: previous ?? 420 }[metric.id] ?? target;
  const start = current > 0 ? current : (fallback > 0 ? fallback : range.min);
  return snap(start, range);
}

/** Part d'une cible atteinte, bornée à [0, 1]. Sans cible (WE) : null. */
export function ringProgress(value, target) {
  if (!(target > 0)) return null;
  return Math.min(1, Math.max(0, num(value) / target));
}

/** Pesées (ou autre mesure) des `n` derniers jours jusqu'à `dateKey` inclus, en points { x, y } pour `Sparkline`. */
export function recentSeries(days, dateKey, read, n = 14) {
  return Object.keys(days ?? {})
    .filter((k) => k <= dateKey)
    .sort()
    .slice(-n)
    .map((k, i) => ({ x: i, y: read(days[k]) }))
    .filter((p) => p.y > 0);
}
