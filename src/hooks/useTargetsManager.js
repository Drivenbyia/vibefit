import { PRESETS, DEFAULT_TARGETS, DEFAULT_STEPS_TARGET } from '../constants/config.js';
import { num } from '../utils/mathUtils.js';
import { computePresetTargets, DEFAULT_TDEE } from '../utils/presetUtils.js';
import { useTransientValue } from './useTransientValue.js';

/**
 * Logique métier de la vue Cibles : application des presets dynamiques
 * (indexés sur baseTDEE), édition manuelle des targets, reset, et feedback
 * "ENREGISTRÉ" transitoire.
 */
export function useTargetsManager(data, setData) {
  const { targets, presetId } = data;
  const [flash, trigger] = useTransientValue(1200);
  const savedFlash = !!flash;

  const setTargets = (newTargets, newPresetId = 'custom') => {
    setData((prev) => ({ ...prev, targets: newTargets, presetId: newPresetId }));
    trigger(true);
  };

  const setStepsTarget = (v) => {
    setData((prev) => ({ ...prev, stepsTarget: num(v) || DEFAULT_STEPS_TARGET }));
  };

  const applyPreset = (id) => {
    if (!PRESETS[id]) return;
    setTargets(computePresetTargets(id, data.baseTDEE), id);
  };

  const resetDefaults = () => {
    if (confirm('Restaurer les cibles VIBEFIT par défaut ?')) {
      setData((prev) => ({
        ...prev,
        targets: DEFAULT_TARGETS,
        presetId: 'maintenance',
        stepsTarget: DEFAULT_STEPS_TARGET,
        baseTDEE: DEFAULT_TDEE,
      }));
      trigger(true);
    }
  };

  const updateField = (dayKey, field, value) => {
    let v = value === '' ? null : num(value);

    // Plancher 1600 kcal — règle absolue sauf week-end (allowEmpty).
    // Champ vidé sur un jour train/off : on conserve la valeur courante (pas de crash).
    if (field === 'kcal' && dayKey !== 'we') {
      if (v === null) return;
      v = Math.max(1600, v);
    }

    // Maintenance kcal → recalcule le TDEE de base sans décrocher le preset.
    // TRAIN = TDEE + 200  →  TDEE = TRAIN - 200
    // OFF   = TDEE - 200  →  TDEE = OFF   + 200
    if (presetId === 'maintenance' && field === 'kcal' && (dayKey === 'train' || dayKey === 'off')) {
      const newTDEE = Math.max(1400, dayKey === 'train' ? v - 200 : v + 200);
      setData((prev) => ({
        ...prev,
        baseTDEE: newTDEE,
        targets: computePresetTargets('maintenance', newTDEE),
        presetId: 'maintenance',
      }));
      trigger(true);
      return;
    }

    setTargets({ ...targets, [dayKey]: { ...targets[dayKey], [field]: v } }, 'custom');
  };

  return { savedFlash, setStepsTarget, applyPreset, resetDefaults, updateField };
}
