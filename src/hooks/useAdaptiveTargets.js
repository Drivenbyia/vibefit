import { useMemo } from 'react';
import { extractSignals } from '../utils/adaptiveTDEE.js';
import { recalibrationBlock } from '../utils/recalibration.js';
import { recordSettingsChange } from '../utils/targetHistory.js';
import { toKey } from '../utils/dateUtils.js';
import { computePresetTargets } from '../utils/presetUtils.js';

/**
 * Expose le TDEE mesuré et permet de recalibrer les cibles dessus — sur action
 * explicite de l'utilisateur uniquement.
 *
 * Le TDEE adaptatif était calculé puis jeté : seul l'export le lisait, et les
 * cibles restaient indexées sur `baseTDEE`, une valeur manuelle. On pouvait donc
 * perdre plusieurs kilos sans que l'app n'ajuste quoi que ce soit. Le
 * branchement est opt-in : les cibles ne bougent jamais toutes seules.
 */
export function useAdaptiveTargets(data, setData) {
  const signals = useMemo(() => extractSignals(data), [data]);

  const baseTDEE = data?.baseTDEE ?? null;
  const { adaptiveTDEE } = signals;
  const { blockedReason, canRecalibrate, delta } = recalibrationBlock(signals, baseTDEE);

  const recalibrate = () => {
    if (!canRecalibrate) return;
    // Recalibrer change la cible À PARTIR D'AUJOURD'HUI : les jours passés
    // restent jugés contre la cible d'avant (historique des cibles).
    const today = toKey(new Date());
    setData((prev) => recordSettingsChange(prev, {
      baseTDEE: adaptiveTDEE,
      targets: computePresetTargets(prev.presetId, adaptiveTDEE),
    }, today));
  };

  return { signals, canRecalibrate, delta, blockedReason, recalibrate };
}
