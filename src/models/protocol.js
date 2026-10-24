import { SCHEMA_VERSION, MEASURE_SOURCES } from '../constants/config.js';

/**
 * Protocole daté de l'app : coupures, phases et montres.
 *
 * Trois listes au niveau racine du state, à côté de `days` — jamais à
 * l'intérieur des jours. Une coupure de deux mois écrite jour par jour
 * créerait 65 jours vides qui passeraient pour des jours « saisis à zéro ».
 *
 *   periods — intervalles EXCLUS d'un périmètre de calcul.
 *     { id, type: 'untracked', start, end, scope: 'nutrition', label }
 *     `scope` borne l'exclusion : une période non suivie côté nutrition
 *     n'efface pas les nuits mesurées par la montre sur les mêmes jours.
 *   phases  — protocoles datés (ex. arrêt médical).
 *     { id, type: 'medical_stop', start, plannedEnd, endedAt, label }
 *     `plannedEnd` est indicatif : seule `endedAt` (clôture manuelle) ferme
 *     la phase. Une date prévue n'autorise rien à elle seule.
 *   devices — chronologie des montres, pour dater la source d'une mesure.
 *     { source, from, to }   (from/to inclusifs, null = ouvert)
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
  return out;
}

/** Le jour `key` est-il exclu du périmètre `scope` par une coupure ? */
export function isExcluded(key, periods = [], scope = 'nutrition') {
  return periods.some(
    (p) => p.type === 'untracked' && (p.scope ?? 'nutrition') === scope
      && p.start <= key && key <= p.end
  );
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
