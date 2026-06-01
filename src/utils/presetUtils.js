import { PRESETS, DEFAULT_TARGETS } from '../constants/config.js';

// Deltas kcal de chaque preset par rapport à la maintenance de base de l'utilisateur.
// `off: null` = OFF calqué sur TRAIN (pas de cyclage — Diet Break).
const PRESET_KCAL_DELTAS = {
  maintenance: { train: 0,    off: 0    },
  cut_light:   { train: -200, off: -200 },
  cut_strong:  { train: -400, off: -400 },
  bulk:        { train: +300, off: +300 },
  diet_break:  { train: 0,    off: null },
};

/**
 * Calcule les targets complètes d'un preset depuis la maintenance de base.
 * - kcal  : maintenanceKcal + delta (plancher 1600 kcal sur les jours OFF en coupe)
 * - protein / fat : repris de la config du preset (fixes par protocole)
 * - carbs : absorbe le delta calorique résiduel (max 0)
 *
 * Retourne les targets de la config statique pour tout preset inconnu.
 */
export function computePresetTargets(presetId, maintenanceKcal) {
  const delta = PRESET_KCAL_DELTAS[presetId];
  const configPreset = PRESETS[presetId];
  if (!delta || !configPreset) return configPreset?.targets ?? PRESETS.maintenance.targets;

  const trainKcal = maintenanceKcal.train + delta.train;
  const offKcal = delta.off === null
    ? trainKcal
    : Math.max(1600, maintenanceKcal.off + delta.off);

  const { train: ct, off: co, we } = configPreset.targets;

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
 * Retrouve la maintenance de base {train, off} depuis des targets stockées,
 * en inversant le delta du preset actif. Utilisé une seule fois au bootstrap
 * pour les utilisateurs antérieurs à l'introduction de `maintenanceKcal`.
 *
 * - presetId === 'maintenance'  → les targets SONT la maintenance (delta 0)
 * - preset coupe/bulk connu     → maintenance = kcal_stocké − delta
 * - 'custom' / preset inconnu    → les targets actuelles font foi (best effort)
 * - diet_break (off non cyclé)   → off non récupérable, fallback DEFAULT_TARGETS
 */
export function deriveMaintenanceKcal(presetId, targets) {
  const tTrain = targets?.train?.kcal ?? DEFAULT_TARGETS.train.kcal;
  const tOff = targets?.off?.kcal ?? DEFAULT_TARGETS.off.kcal;
  const delta = PRESET_KCAL_DELTAS[presetId];

  if (!delta) return { train: tTrain, off: tOff };

  return {
    train: tTrain - delta.train,
    off: delta.off === null ? DEFAULT_TARGETS.off.kcal : tOff - delta.off,
  };
}
