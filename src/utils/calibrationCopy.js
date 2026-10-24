import { CALIBRATION_DAY } from './adaptiveTDEE.js';

/**
 * Textes de la calibration — une seule source pour la bande d'état, le
 * diagnostic de la Semaine et la carte TDEE des Cibles, qui ne doivent jamais
 * annoncer deux dates différentes.
 */

/** '2026-11-06' → '06/11' */
export const ddmm = (key) => `${key.slice(8, 10)}/${key.slice(5, 7)}`;

const MISSING = {
  [CALIBRATION_DAY.NO_WEIGHT]: 'pesée',
  [CALIBRATION_DAY.NO_INTAKE]: 'apport',
  [CALIBRATION_DAY.EMPTY]: 'pesée + apport',
};

/** Ce qui manque à un jour : 'pesée', 'apport', 'pesée + apport' ou ''. */
export const missingLabel = (status) => MISSING[status] ?? '';

/** « 14/14 au plus tôt le 06/11 » — ou null hors calibration active. */
export function etaLabel(calib) {
  if (!calib?.active || !calib.earliestCompletion) return null;
  return `${calib.requiredDays}/${calib.requiredDays} au plus tôt le ${ddmm(calib.earliestCompletion)}`;
}

/**
 * Jours passés à compléter, les plus récents d'abord : « 27/10 (apport),
 * 25/10 (pesée) et 2 autres ». Les plus récents sont ceux qu'on a encore en tête.
 */
export function incompleteLabel(calib, max = 2) {
  const list = calib?.incompleteDays ?? [];
  if (list.length === 0) return null;
  const recent = [...list].reverse();
  const shown = recent.slice(0, max).map(({ key, status }) => `${ddmm(key)} (${missingLabel(status)})`);
  const rest = recent.length - shown.length;
  return shown.join(', ') + (rest > 0 ? ` et ${rest} autre${rest > 1 ? 's' : ''}` : '');
}
