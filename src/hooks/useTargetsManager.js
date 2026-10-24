import { PRESETS, DEFAULT_STEPS_TARGET, MIN_BASE_TDEE } from '../constants/config.js';
import { num } from '../utils/mathUtils.js';
import {
  computePresetTargets,
  clampTargetField,
  DEFAULT_TDEE,
  DEFAULT_TARGETS,
} from '../utils/presetUtils.js';
import { useTransientValue } from './useTransientValue.js';
import { recordSettingsChange } from '../utils/targetHistory.js';
import { toKey } from '../utils/dateUtils.js';

/**
 * Logique métier de la vue Cibles : application des presets dynamiques
 * (indexés sur baseTDEE), édition manuelle des targets, reset, et feedback
 * "ENREGISTRÉ" transitoire.
 */
export function useTargetsManager(data, setData) {
  const { targets, presetId } = data;
  const [flash, trigger] = useTransientValue(1200);
  const savedFlash = !!flash;

  // Tout changement de cibles passe par ici : les réglages sortants sont
  // figés dans l'historique, le passé reste jugé contre eux.
  const changeSettings = (patch) => {
    const today = toKey(new Date());
    setData((prev) => recordSettingsChange(prev, patch, today));
  };

  const setTargets = (newTargets, newPresetId = 'custom') => {
    changeSettings({ targets: newTargets, presetId: newPresetId });
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
      changeSettings({
        targets: DEFAULT_TARGETS,
        presetId: 'maintenance',
        stepsTarget: DEFAULT_STEPS_TARGET,
        baseTDEE: DEFAULT_TDEE,
      });
      trigger(true);
    }
  };

  const updateField = (dayKey, field, value) => {
    let v = value === '' ? null : num(value);

    // Champ kcal vidé sur un jour train/off : on conserve la valeur courante.
    if (field === 'kcal' && dayKey !== 'we' && v === null) return;

    // Planchers du protocole (calories hors week-end, protéines tous les jours)
    v = clampTargetField(field, dayKey, v);

    // Maintenance kcal → recalcule le TDEE de base sans décrocher le preset.
    // TRAIN = TDEE + 200  →  TDEE = TRAIN - 200
    // OFF   = TDEE - 200  →  TDEE = OFF   + 200
    // Plancher MIN_BASE_TDEE (et non 1400) : en deçà, OFF passait sous le
    // plancher calorique et le cyclage s'effondrait à TRAIN = OFF.
    if (presetId === 'maintenance' && field === 'kcal' && (dayKey === 'train' || dayKey === 'off')) {
      const newTDEE = Math.max(MIN_BASE_TDEE, dayKey === 'train' ? v - 200 : v + 200);
      changeSettings({
        baseTDEE: newTDEE,
        targets: computePresetTargets('maintenance', newTDEE),
        presetId: 'maintenance',
      });
      trigger(true);
      return;
    }

    setTargets({ ...targets, [dayKey]: { ...targets[dayKey], [field]: v } }, 'custom');
  };

  return { savedFlash, setStepsTarget, applyPreset, resetDefaults, updateField };
}
