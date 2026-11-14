import { WEIGHT_MIN_KG, WEIGHT_MAX_KG, INTAKE_MIN_KCAL, INTAKE_MAX_KCAL } from '../constants/config.js';

/**
 * Import du raccourci iOS « VibeFit Santé » (option B, backlog n°5).
 *
 * Le raccourci lit Apple Santé (MyFitnessPal y écrit les repas, la montre le
 * reste), range les valeurs dans un dictionnaire PLAT et le copie dans le
 * presse-papier. L'app web installée sur l'écran d'accueil a son propre
 * stockage, séparé de Safari : un lien ouvert par le raccourci écrirait dans
 * la mauvaise copie. D'où le presse-papier, lu par un bouton.
 *
 * Format (toutes les clés facultatives sauf une valeur au moins) :
 *   { date: 'YYYY-MM-DD', kcal, protein, carbs, fat, steps, weight,
 *     sleepMin, rhr, hrvSdnn, hrv }
 * Les valeurs peuvent arriver en texte, avec unité ou virgule décimale
 * (« 2 159,3 kcal ») : c'est ce que produit Raccourcis selon les actions.
 */

/** « 2 159,3 kcal » → 2159.3 ; vide ou illisible → null. */
export function parseHealthNumber(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string') return null;
  const n = parseFloat(v.replace(/[\s\u00a0\u202f]/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const int = (n) => String(Math.round(n));

// clé importée → [chemin dans le jour, bornes, formatage]
const FIELDS = {
  kcal: [['intake', 'kcal'], [INTAKE_MIN_KCAL, INTAKE_MAX_KCAL], int],
  protein: [['intake', 'protein'], [0, 600], int],
  carbs: [['intake', 'carbs'], [0, 1500], int],
  fat: [['intake', 'fat'], [0, 600], int],
  steps: [['expenditure', 'steps'], [0, 100000], int],
  weight: [['weight'], [WEIGHT_MIN_KG, WEIGHT_MAX_KG], (n) => String(Math.round(n * 10) / 10)],
  sleepMin: [['sleep', 'durationMin'], [30, 1080], int],
  rhr: [['sleep', 'rhr'], [30, 120], int],
  hrvSdnn: [['sleep', 'hrvSdnn'], [5, 250], int],
  hrv: [['sleep', 'hrv'], [5, 250], int],
};

/**
 * Texte du presse-papier → { key, day, fields } ; lève une Error lisible.
 * `day` est un jour PARTIEL, à passer à `mergeDays` : il ne remplit que les
 * champs vides, une saisie manuelle n'est jamais écrasée.
 * Une valeur hors bornes (0 kcal un jour sans repas, poids absurde) est
 * ignorée plutôt qu'importée.
 */
export function parseHealthImport(text, today) {
  let raw;
  try {
    raw = JSON.parse(String(text ?? '').trim());
  } catch {
    throw new Error('le presse-papier ne contient pas les données du raccourci');
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('format inattendu');
  }

  const key = typeof raw.date === 'string' && ISO_DAY.test(raw.date.trim()) ? raw.date.trim() : today;
  const day = {};
  const fields = [];
  for (const [name, [path, [lo, hi], fmt]] of Object.entries(FIELDS)) {
    const n = parseHealthNumber(raw[name]);
    if (n === null || n < lo || n > hi) continue;
    const [head, leaf] = path;
    if (leaf) day[head] = { ...(day[head] ?? {}), [leaf]: fmt(n) };
    else day[head] = fmt(n);
    fields.push(name);
  }
  if (fields.length === 0) throw new Error('aucune valeur exploitable');
  return { key, day, fields };
}
