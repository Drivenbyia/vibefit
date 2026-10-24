import { SCHEMA_VERSION, MEASURE_SOURCES, PHASE_TYPES, CALIBRATION_REQUIRED_DAYS } from '../constants/config.js';

/**
 * Protocole daté de l'app : coupures, phases et montres.
 *
 * Trois listes au niveau racine du state, à côté de `days` — jamais à
 * l'intérieur des jours. Une coupure de deux mois écrite jour par jour
 * créerait 65 jours vides qui passeraient pour des jours « saisis à zéro ».
 *
 *   periods — intervalles EXCLUS d'un périmètre de calcul.
 *     { id, type: 'untracked', start, end, scope: 'nutrition', label }
 *     { id, type: 'partial',   start, end, scope: 'recovery',  label }
 *     `partial` : mesure montre incomplète (montre retirée, synchro coupée) —
 *     exclue des références de pas et de sommeil, sans effet sur la nutrition.
 *     `scope` borne l'exclusion : une période non suivie côté nutrition
 *     n'efface pas les nuits mesurées par la montre sur les mêmes jours.
 *   phases  — protocoles datés (ex. arrêt médical).
 *     { id, type: 'medical_stop', start, plannedEnd, endedAt, label }
 *     `plannedEnd` est indicatif : seule `endedAt` (clôture manuelle) ferme
 *     la phase. Une date prévue n'autorise rien à elle seule.
 *   devices — chronologie des montres, pour dater la source d'une mesure.
 *     { source, from, to }   (from/to inclusifs, null = ouvert)
 *   calibration — recalibration du TDEE (objet unique, ou null).
 *     { start, seedTDEE, requiredDays }
 *     Avant `start`, aucune donnée n'entre dans le TDEE ; tant que
 *     `requiredDays` jours croisés poids × apport ne sont pas réunis depuis
 *     `start`, aucun TDEE mesuré n'est publié.
 *
 * Toutes les dates sont des clés de jour `YYYY-MM-DD` : la comparaison
 * lexicographique est alors une comparaison chronologique.
 */

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const isDay = (v) => typeof v === 'string' && ISO_DAY.test(v);
const isDayOrNull = (v) => v == null || isDay(v);

const isValidPeriod = (p) =>
  p && typeof p.id === 'string' && typeof p.type === 'string'
  && isDay(p.start) && isDay(p.end) && p.start <= p.end;

const isValidPhase = (p) =>
  p && typeof p.id === 'string' && typeof p.type === 'string'
  && isDay(p.start) && isDayOrNull(p.plannedEnd) && isDayOrNull(p.endedAt);

const isValidDevice = (d) =>
  d && Object.hasOwn(MEASURE_SOURCES, d.source) && isDayOrNull(d.from) && isDayOrNull(d.to);

const isValidCalibration = (c) =>
  c && isDay(c.start) && Number.isFinite(c.seedTDEE) && c.seedTDEE > 0;

const keepValid = (list, predicate) => (Array.isArray(list) ? list.filter(predicate) : []);

/**
 * Normalise les trois listes : une entrée mal formée est écartée plutôt que
 * de faire planter un calcul — même règle que les bornes de plausibilité.
 */
export function sanitizeProtocol(raw = {}) {
  return {
    periods: keepValid(raw.periods, isValidPeriod),
    phases: keepValid(raw.phases, isValidPhase),
    devices: keepValid(raw.devices, isValidDevice),
    calibration: isValidCalibration(raw.calibration)
      ? {
        start: raw.calibration.start,
        seedTDEE: raw.calibration.seedTDEE,
        requiredDays: Number.isInteger(raw.calibration.requiredDays) && raw.calibration.requiredDays > 0
          ? raw.calibration.requiredDays
          : CALIBRATION_REQUIRED_DAYS,
      }
      : null,
  };
}

/**
 * Migration du state stocké vers SCHEMA_VERSION — ADDITIVE uniquement.
 *
 * `days`, `targets`, `presetId`, `baseTDEE` et `stepsTarget` sont repris par
 * référence, sans être réécrits : la migration ne peut ni perdre ni altérer
 * une saisie. Idempotente — la rejouer sur un state déjà migré ne change rien.
 */
export function migrateData(raw) {
  const base = raw && typeof raw === 'object' ? raw : {};
  return {
    ...base,
    ...sanitizeProtocol(base),
    schemaVersion: SCHEMA_VERSION,
  };
}

/**
 * Champs de protocole d'un fichier de RESTAURATION — même contrat que les
 * réglages (cibles, preset) : une liste présente remplace la liste courante,
 * une liste absente la laisse intacte.
 *
 * Sans ce passage, restaurer une sauvegarde sur un nouvel appareil perdait
 * en silence la coupure et la phase en cours.
 */
export function restorableProtocol(parsed) {
  const clean = sanitizeProtocol(parsed);
  const out = {};
  for (const key of ['periods', 'phases', 'devices']) {
    if (Array.isArray(parsed?.[key])) out[key] = clean[key];
  }
  // `calibration: null` explicite dans le fichier = pas de calibration.
  if (parsed && Object.hasOwn(parsed, 'calibration')) out.calibration = clean.calibration;
  return out;
}

/** Le jour `key` est-il exclu du périmètre `scope` par une coupure ? */
const EXCLUDING_TYPES = ['untracked', 'partial'];

export function isExcluded(key, periods = [], scope = 'nutrition') {
  return periods.some(
    (p) => EXCLUDING_TYPES.includes(p.type) && (p.scope ?? 'nutrition') === scope
      && p.start <= key && key <= p.end
  );
}

/**
 * Une mesure de montre (pas ou sommeil) du jour `key` peut-elle entrer dans
 * une RÉFÉRENCE ? Il faut qu'elle vienne de la montre portée aujourd'hui
 * (`referenceSource`) et que le jour ne soit pas marqué partiel. Sans
 * chronologie de montres (`referenceSource` null), tout est admis — le
 * comportement d'avant l'étape montres.
 */
export function isReferenceMeasure(key, day, measure, { devices = [], periods = [], referenceSource = null } = {}) {
  if (isExcluded(key, periods, 'recovery')) return false;
  if (referenceSource === null) return true;
  return measureSource(key, day, measure, devices) === referenceSource;
}

/** Coupure contenant `key`, ou null. */
export function periodAt(key, periods = []) {
  return periods.find((p) => p.start <= key && key <= p.end) ?? null;
}

/**
 * Phase en vigueur le jour `key`, ou null. La fin PRÉVUE ne la ferme pas :
 * au-delà, la phase reste active tant qu'elle n'a pas été clôturée.
 */
export function phaseAt(key, phases = []) {
  return phases.find(
    (p) => p.start <= key && (p.endedAt == null || key <= p.endedAt)
  ) ?? null;
}

/** Le cyclage TRAIN/OFF est-il suspendu le jour `key` par une phase ? */
export const isCyclingSuspended = (key, phases = []) =>
  PHASE_TYPES[phaseAt(key, phases)?.type]?.cycling === false;

/** Séance et chantier sont-ils hors sujet le jour `key` (effort interdit) ? */
export const isTrainingSuspended = (key, phases = []) =>
  PHASE_TYPES[phaseAt(key, phases)?.type]?.training === false;

/** Montre portée le jour `key` d'après la chronologie, ou null. */
export function deviceAt(key, devices = []) {
  return devices.find(
    (d) => (d.from == null || d.from <= key) && (d.to == null || key <= d.to)
  )?.source ?? null;
}

const EXPLICIT_SOURCE = {
  steps: (day) => day?.expenditure?.stepsSource,
  sleep: (day) => day?.sleep?.source,
};

/**
 * Source d'une mesure (`steps` ou `sleep`) pour le jour `key`.
 *
 * La source écrite sur le jour l'emporte — c'est la seule façon de dire
 * « ce jour-là, iPhone seul ». Sinon, elle est DÉDUITE de la chronologie des
 * montres, sans jamais être réécrite dans le jour : les saisies historiques
 * restent telles qu'elles ont été faites.
 */
export function measureSource(key, day, measure, devices = []) {
  const explicit = EXPLICIT_SOURCE[measure]?.(day);
  if (explicit && Object.hasOwn(MEASURE_SOURCES, explicit)) return explicit;
  return deviceAt(key, devices);
}

// --- Activités d'information (Apple Santé) ---------------------------------
// Champ OPTIONNEL d'un jour : `infoActivities: [{ type, durationMin, source }]`.
// Gardé à titre d'info uniquement — aucun calcul (type de jour, cible, TDEE,
// règles) ne le lit. Absent d'`emptyDay()` à dessein : la forme d'un jour vide
// ne change pas.
const ACTIVITY_LABELS = { cycling: 'vélo', walking: 'marche' };

/** « vélo 23 min (Fitness) · marche 4 min (Fitness) » — chaîne vide si rien. */
export function formatInfoActivities(activities) {
  if (!Array.isArray(activities)) return '';
  return activities
    .filter((a) => a && typeof a.type === 'string' && Number.isFinite(a.durationMin))
    .map((a) => `${ACTIVITY_LABELS[a.type] ?? a.type} ${Math.round(a.durationMin)} min${a.source ? ` (${a.source})` : ''}`)
    .join(' · ');
}

