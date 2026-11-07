import {
  PROFILE_SEXES,
  HEIGHT_MIN_CM,
  HEIGHT_MAX_CM,
  BIRTH_YEAR_MIN,
  TDEE_MIN_BMR_FACTOR,
  TDEE_LOW_BMR_FACTOR,
  TDEE_MAX_PLAUSIBLE_KCAL,
} from '../constants/config.js';

/**
 * Profil physiologique — racine du state, à côté de `days`.
 *
 *   profile — { sex: 'male' | 'female' | null, birthYear: number | null, heightCm: number | null }
 *
 * L'année de naissance plutôt que l'âge : un âge saisi vieillit en silence.
 * Un champ hors bornes devient `null` (profil incomplet), jamais une valeur
 * inventée. Le poids n'y figure pas : c'est le poids lissé courant qui sert.
 */
export function sanitizeProfile(raw) {
  const p = raw && typeof raw === 'object' ? raw : {};
  const currentYear = new Date().getFullYear();
  return {
    sex: Object.hasOwn(PROFILE_SEXES, p.sex) ? p.sex : null,
    birthYear: Number.isInteger(p.birthYear) && p.birthYear >= BIRTH_YEAR_MIN && p.birthYear <= currentYear - 14
      ? p.birthYear : null,
    heightCm: Number.isFinite(p.heightCm) && p.heightCm >= HEIGHT_MIN_CM && p.heightCm <= HEIGHT_MAX_CM
      ? p.heightCm : null,
  };
}

/** Âge en années pleines à la date `todayKey` (YYYY-MM-DD), à ±1 an près. */
export const ageAt = (birthYear, todayKey) => Number(todayKey.slice(0, 4)) - birthYear;

/**
 * Métabolisme de base Mifflin-St Jeor (kcal/j), ou null si une donnée manque.
 *   homme : 10 × kg + 6,25 × cm − 5 × âge + 5
 *   femme : 10 × kg + 6,25 × cm − 5 × âge − 161
 */
export function mifflinBMR({ sex, age, heightCm, weightKg }) {
  if (!sex || !Number.isFinite(age) || !Number.isFinite(heightCm) || !Number.isFinite(weightKg)) return null;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(base + (sex === 'male' ? 5 : -161));
}

/** Statut de plausibilité d'un TDEE mesuré. */
export const TDEE_CHECK = {
  VALID: 'valid',             // dans la plage physiologique
  IMPLAUSIBLE: 'implausible', // hors plage : mesure incohérente
  LOW: 'low',                 // valide mais bas : à confirmer, pas de recalibration seul
  UNCHECKED: 'unchecked',     // profil incomplet : plancher incalculable
};

/**
 * Confronte un TDEE calculé à la physiologie.
 *
 * Le plafond (4000 kcal) s'applique toujours. Le plancher (1,1 × métabolisme
 * de base) et la zone basse (jusqu'à 1,25 ×) exigent un profil complet : sans lui, le TDEE est « non vérifié » —
 * publié, mais jamais une base de recalibration.
 *
 * @returns {{ status, bmr, minKcal, lowKcal, maxKcal } | null} null sans TDEE calculé.
 */
export function checkTDEE(rawTDEE, profile, weightKg, todayKey) {
  if (rawTDEE == null) return null;
  const p = sanitizeProfile(profile);
  const bmr = p.birthYear === null
    ? null
    : mifflinBMR({ sex: p.sex, age: ageAt(p.birthYear, todayKey), heightCm: p.heightCm, weightKg });
  const minKcal = bmr !== null ? Math.round(TDEE_MIN_BMR_FACTOR * bmr) : null;
  const lowKcal = bmr !== null ? Math.round(TDEE_LOW_BMR_FACTOR * bmr) : null;
  const maxKcal = TDEE_MAX_PLAUSIBLE_KCAL;

  let status = TDEE_CHECK.VALID;
  if (rawTDEE > maxKcal || (minKcal !== null && rawTDEE < minKcal)) status = TDEE_CHECK.IMPLAUSIBLE;
  else if (minKcal === null) status = TDEE_CHECK.UNCHECKED;
  else if (rawTDEE < lowKcal) status = TDEE_CHECK.LOW;

  return { status, bmr, minKcal, lowKcal, maxKcal };
}

const fr = (n) => Math.round(n).toLocaleString('fr-FR');

/** Libellé court du statut incohérent — repris tel quel partout. */
export const IMPLAUSIBLE_LABEL = 'Mesure incohérente — vérifie pesées et saisie';

/** Libellé de la zone basse — repris tel quel partout. */
export const LOW_LABEL = 'TDEE bas — à confirmer sur la prochaine fenêtre';

/**
 * Qualificatif d'un TDEE publié (valide), à accoler au chiffre : vide s'il
 * est vérifié et dans la plage normale.
 */
export function tdeeQualifier(check) {
  if (check?.status === TDEE_CHECK.UNCHECKED) return ' (non vérifié : profil incomplet)';
  if (check?.status === TDEE_CHECK.LOW) return ` (${LOW_LABEL})`;
  return '';
}

/** Pourquoi la mesure est hors plage, en une phrase. */
export function implausibleDetail(rawTDEE, check) {
  if (!check) return '';
  if (rawTDEE > check.maxKcal) return `calcul brut ${fr(rawTDEE)} kcal, au-dessus du maximum plausible ${fr(check.maxKcal)} kcal`;
  return `calcul brut ${fr(rawTDEE)} kcal, sous le minimum plausible ${fr(check.minKcal)} kcal` +
    ` (${String(TDEE_MIN_BMR_FACTOR).replace('.', ',')} × métabolisme de base ${fr(check.bmr)} kcal)`;
}
