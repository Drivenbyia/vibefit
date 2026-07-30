import { dayTypeFromKey } from '../utils/dateUtils.js';

export const emptyDay = () => ({
  typeOverride: null,
  intake: { kcal: '', protein: '', carbs: '', fat: '' },
  expenditure: { kcal: '', steps: '' },
  workout: null,
  waist: '',
  weight: '',
  // Sommeil saisi depuis la montre. `durationMin` est la valeur canonique en
  // minutes — l'UI présente des heures/minutes, l'analyse a besoin d'un scalaire.
  // Les jours antérieurs à ce champ le reçoivent via le spread d'emptyDay().
  sleep: { score: '', durationMin: '', hrv: '' },
  notes: '',
});

// Une séance effectuée fait du jour un jour TRAIN, un repos déclaré un jour OFF.
const WORKOUT_TO_TYPE = { haut: 'train', bas: 'train', none: 'off' };

/**
 * Type d'un jour, par ordre de priorité décroissant :
 *   1. typeOverride — bascule manuelle explicite dans le Header
 *   2. séance loggée — la réalité l'emporte sur la prévision
 *   3. calendrier    — Upper/Lower/Upper lun/mer/ven, prévision par défaut
 *
 * Le calendrier seul décorrélait la cible calorique de l'entraînement réel :
 * déplacer sa séance du lundi au mardi servait la cible OFF le jour d'effort et
 * la cible TRAIN le jour de repos. Une séance loggée un week-end bascule aussi
 * le jour en TRAIN, lui donnant une vraie cible au lieu du `we` sans cible.
 */
export const dayType = (key, day) =>
  day?.typeOverride
  ?? (day?.workout ? WORKOUT_TO_TYPE[day.workout] : null)
  ?? dayTypeFromKey(key);
