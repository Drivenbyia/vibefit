import { PRESETS } from '../constants/config.js';

export const DEFAULT_TDEE = 2000;

/**
 * Formules kcal de chaque preset en fonction du TDEE de base.
 *
 *  Maintenance  : TRAIN = TDEE + 200  / OFF = TDEE - 200
 *  Sèche légère : TRAIN = TDEE        / OFF = max(1600, TDEE - 400)
 *  Sèche forte  : TRAIN = TDEE - 200  / OFF = max(1600, TDEE - 600)
 *  Prise masse  : TRAIN = TDEE + 500  / OFF = TDEE + 100  → moy. +300
 *  Diet Break   : TRAIN = TDEE        / OFF = TDEE  (pas de cyclage)
 *
 * Le plancher 1600 kcal protège l'OFF en cas de TDEE bas.
 */
function presetKcal(presetId, tdee) {
  switch (presetId) {
    case 'maintenance': return { train: tdee + 200,             off: tdee - 200 };
    case 'cut_light':   return { train: tdee,                   off: Math.max(1600, tdee - 400) };
    case 'cut_strong':  return { train: tdee - 200,             off: Math.max(1600, tdee - 600) };
    case 'bulk':        return { train: tdee + 500,             off: tdee + 100 };
    case 'diet_break':  return { train: tdee,                   off: tdee };
    default:            return { train: tdee + 200,             off: tdee - 200 };
  }
}

/**
 * Calcule les targets complètes d'un preset depuis le TDEE de base.
 * - kcal    : formule presetKcal()
 * - protein : fixe par preset (config)
 * - fat     : fixe par preset (config)
 * - carbs   : absorbe le delta calorique résiduel (min 0)
 */
export function computePresetTargets(presetId, baseTDEE) {
  const configPreset = PRESETS[presetId] ?? PRESETS.maintenance;
  const { train: ct, off: co, we } = configPreset.targets;
  const { train: trainKcal, off: offKcal } = presetKcal(presetId, baseTDEE);

  return {
    train: {
      ...ct,
      kcal: trainKcal,
      carbs: Math.max(0, Math.round((trainKcal - ct.protein * 4 - ct.fat * 9) / 4)),
    },
    off: {
      ...co,
      kcal: offKcal,
      carbs: Math.max(0, Math.round((offKcal - co.protein * 4 - co.fat * 9) / 4)),
    },
    we,
  };
}

/**
 * Retrouve le TDEE de base depuis les targets et le presetId stockés.
 * Utilisé au bootstrap pour les utilisateurs sans `baseTDEE` en store.
 */
export function deriveBaseTDEE(presetId, targets) {
  const trainKcal = targets?.train?.kcal;
  if (trainKcal == null) return DEFAULT_TDEE;
  switch (presetId) {
    case 'maintenance': return trainKcal - 200;
    case 'cut_light':   return trainKcal;
    case 'cut_strong':  return trainKcal + 200;
    case 'bulk':        return trainKcal - 500;
    case 'diet_break':  return trainKcal;
    default:            return trainKcal - 200;
  }
}
