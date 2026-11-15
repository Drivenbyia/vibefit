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
 *     sleepMin, sleepStages, sleepDurations, rhr, hrvSdnn, hrv }
 * `sleepStages` + `sleepDurations` (phases brutes) priment sur `sleepMin`.
 * Les valeurs peuvent arriver en texte, avec unité ou virgule décimale
 * (« 2 159,3 kcal ») : c'est ce que produit Raccourcis selon les actions.
 */

const parseOne = (line) => {
  const n = parseFloat(line.replace(/[\s\u00a0\u202f]/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

/**
 * « 2 159,3 kcal » → 2159.3 ; vide ou illisible → null.
 * Plusieurs lignes (« 1113\n0 ») = un échantillon par source (iPhone, montre)
 * renvoyé par « Regrouper par Jour » : on garde le plus grand. Additionner
 * compterait deux fois les mêmes pas.
 */
export function parseHealthNumber(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string') return null;
  const values = v.split(/[\r\n]+/).map(parseOne).filter((n) => n !== null);
  return values.length ? Math.max(...values) : null;
}

/**
 * Texte collé → objet. Tolère ce qui entoure le dictionnaire (texte ajouté
 * par Raccourcis, retour à la ligne) : on prend du premier « { » au dernier « } ».
 */
function extractJson(text) {
  const s = String(text ?? '').trim();
  if (!s) throw new Error('le presse-papier est vide — relance le raccourci juste avant');
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  try {
    return JSON.parse(a >= 0 && b > a ? s.slice(a, b + 1) : s);
  } catch {
    throw new Error(`le presse-papier ne contient pas les données du raccourci (reçu : « ${s.slice(0, 40)}${s.length > 40 ? '…' : ''} »)`);
  }
}

/** « 1:02:03 », « 20:27 », « 59 » → secondes ; illisible → null. */
function durationSeconds(text) {
  const parts = String(text).trim().split(':');
  if (parts.some((p) => !/^\d+([.,]\d+)?$/.test(p))) return null;
  return parts.reduce((acc, p) => acc * 60 + parseFloat(p.replace(',', '.')), 0);
}

// Phases qui ne sont pas du sommeil (libellés anglais de Santé, et français au cas où).
const NOT_ASLEEP = new Set(['awake', 'inbed', 'in bed', 'éveillé', 'au lit']);

/**
 * Durée de sommeil depuis les phases brutes envoyées par le raccourci :
 * `sleepStages` (« Core\nDeep\nAwake… ») et `sleepDurations` (« 20:27\n43:23… »),
 * alignées ligne à ligne. Les phases « Awake » et « In Bed » sont écartées.
 * Calcul fait ici parce que les filtres « Valeur » de Raccourcis comparent un
 * libellé français à une valeur anglaise et n'écartent rien.
 * @returns {number|null} minutes
 */
export function sleepMinutesFromStages(stages, durations) {
  if (typeof stages !== 'string' || typeof durations !== 'string') return null;
  const names = stages.split(/[\r\n]+/).map((n) => n.trim()).filter(Boolean);
  const secs = durations.split(/[\r\n]+/).map((d) => d.trim()).filter(Boolean).map(durationSeconds);
  if (!names.length || names.length !== secs.length || secs.some((n) => n === null)) return null;
  const total = names.reduce((acc, n, i) => (NOT_ASLEEP.has(n.toLowerCase()) ? acc : acc + secs[i]), 0);
  return total > 0 ? total / 60 : null;
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const int = (n) => String(Math.round(n));

/**
 * Sommeil : Raccourcis additionne des durées dont l'unité dépend de l'action
 * (secondes, minutes ou heures). Une nuit fait 30 min à 18 h : au-delà de
 * 1080 c'est forcément des secondes, à 24 ou moins des heures.
 */
const toSleepMinutes = (n) => (n > 1080 ? n / 60 : n <= 24 ? n * 60 : n);

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
  const raw = extractJson(text);
  const fromStages = sleepMinutesFromStages(raw?.sleepStages, raw?.sleepDurations);
  if (fromStages !== null) raw.sleepMin = fromStages;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('format inattendu');
  }

  const key = typeof raw.date === 'string' && ISO_DAY.test(raw.date.trim()) ? raw.date.trim() : today;
  const day = {};
  const fields = [];
  for (const [name, [path, [lo, hi], fmt]] of Object.entries(FIELDS)) {
    const parsed = parseHealthNumber(raw[name]);
    const n = parsed !== null && name === 'sleepMin' ? toSleepMinutes(parsed) : parsed;
    if (n === null || n < lo || n > hi) continue;
    const [head, leaf] = path;
    if (leaf) day[head] = { ...(day[head] ?? {}), [leaf]: fmt(n) };
    else day[head] = fmt(n);
    fields.push(name);
  }
  if (fields.length === 0) throw new Error('aucune valeur exploitable');
  return { key, day, fields };
}

const isBlank = (v) => v === undefined || v === null || String(v).trim() === '';

/**
 * Applique un import à un jour existant (ou vide).
 *
 * Règle (décision du 2026-11-15) : l'import met à jour ce qu'il a lui-même
 * écrit, jamais une saisie manuelle. Chaque valeur importée est mémorisée
 * dans `day.imported` (« intake.kcal » → « 767 »). Au prochain import :
 *   - champ vide                       → rempli ;
 *   - champ égal à sa valeur importée  → remplacé (journée complétée depuis) ;
 *   - champ différent                  → saisi ou corrigé à la main : conservé.
 * Un import à 16 h ne fige donc plus les repas : celui de 23 h 55 les complète.
 *
 * @returns {{ day: Object, written: string[], kept: string[] }}
 *   `written` : champs écrits ou mis à jour ; `kept` : saisies manuelles
 *   conservées malgré une valeur importée différente.
 */
export function applyHealthImport(existing, partial, base) {
  const day = { ...base, ...(existing ?? {}) };
  const imported = { ...(day.imported ?? {}) };
  const written = [];
  const kept = [];

  for (const [name, [path]] of Object.entries(FIELDS)) {
    const [head, leaf] = path;
    const next = leaf ? partial?.[head]?.[leaf] : partial?.[head];
    if (isBlank(next)) continue;
    const id = path.join('.');
    const current = leaf ? day[head]?.[leaf] : day[head];
    const ownedByImport = isBlank(current) || String(current) === imported[id];
    if (!ownedByImport) {
      if (String(current) !== next) kept.push(name);
      continue;
    }
    imported[id] = next;
    if (String(current ?? '') === next) continue;
    if (leaf) day[head] = { ...(day[head] ?? {}), [leaf]: next };
    else day[head] = next;
    written.push(name);
  }

  return { day: { ...day, imported }, written, kept };
}
