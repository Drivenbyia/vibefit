import { PRESETS, KCAL_FLOOR, PROTEIN_FLOOR } from '../constants/config.js';

export const DEFAULT_TDEE = 2000;

/**
 * Formules kcal de chaque preset, SANS plancher.
 *
 *  Maintenance  : TRAIN = TDEE + 200  / OFF = TDEE - 200   → écart 400
 *  Sèche légère : TRAIN = TDEE        / OFF = TDEE - 400   → écart 400
 *  Sèche forte  : TRAIN = TDEE - 200  / OFF = TDEE - 600   → écart 400
 *  Prise masse  : TRAIN = TDEE + 500  / OFF = TDEE + 100   → écart 400
 *  Diet Break   : TRAIN = TDEE        / OFF = TDEE         → écart 0 (pas de cyclage)
 */
const RAW_FORMULAS = {
  maintenance: (t) => ({ train: t + 200, off: t - 200 }),
  cut_light:   (t) => ({ train: t,       off: t - 400 }),
  cut_strong:  (t) => ({ train: t - 200, off: t - 600 }),
  bulk:        (t) => ({ train: t + 500, off: t + 100 }),
  diet_break:  (t) => ({ train: t,       off: t }),
};

/**
 * Applique le plancher calorique à OFF en PRÉSERVANT l'écart de cyclage.
 *
 * Clamper les deux cibles indépendamment faisait silencieusement s'effondrer le
 * cyclage : un TDEE de 1400 donnait TRAIN = OFF = 1600, supprimant la prémisse
 * centrale du protocole sans le moindre avertissement. En relevant TRAIN du même
 * montant que le plancher relève OFF, l'écart nominal du preset est conservé.
 */
function presetKcal(presetId, tdee) {
  const raw = (RAW_FORMULAS[presetId] ?? RAW_FORMULAS.maintenance)(tdee);
  const off = Math.max(KCAL_FLOOR, raw.off);
  const gap = raw.train - raw.off;
  return { train: Math.max(raw.train, off + gap), off };
}

/**
 * Applique les planchers du protocole à un champ de cible édité à la main.
 *
 * Seul `kcal` avait un garde-fou : les protéines étaient librement réglables à 0
 * sur n'importe quel type de jour, alors que le plancher 160 g est censé
 * s'appliquer TOUS les jours, week-end compris.
 */
export function clampTargetField(field, dayKey, value) {
  if (field === 'kcal' && dayKey !== 'we') return Math.max(KCAL_FLOOR, value);
  if (field === 'protein') return Math.max(PROTEIN_FLOOR, value ?? PROTEIN_FLOOR);
  return value;
}

/**
 * Écart (kcal) dont protéines + lipides dépassent la cible calorique — 0 si cohérent.
 *
 * Dérivé à la volée plutôt que stocké dans les targets : une valeur dérivée
 * persistée se désynchronise dès la première édition manuelle d'un champ.
 */
export function macroConflictKcal(target) {
  if (!target || target.kcal == null) return 0;
  const residual = target.kcal - (target.protein ?? 0) * 4 - (target.fat ?? 0) * 9;
  return residual < 0 ? Math.round(-residual) : 0;
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
 * Cibles par défaut — DÉRIVÉES de DEFAULT_TDEE, jamais codées en dur.
 *
 * Les anciennes valeurs littérales (train 2400 / off 1900) n'étaient sur la
 * courbe d'aucun TDEE unique : 2400 implique 2200, 1900 implique 2100. L'app
 * affichait donc « TDEE de base : 2000 » à côté de cibles incohérentes, qui
 * sautaient silencieusement dès le premier changement de preset.
 */
export const DEFAULT_TARGETS = computePresetTargets('maintenance', DEFAULT_TDEE);

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
