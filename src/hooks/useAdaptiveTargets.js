import { useMemo } from 'react';
import { extractSignals } from '../utils/adaptiveTDEE.js';
import { etaLabel } from '../utils/calibrationCopy.js';
import { computePresetTargets } from '../utils/presetUtils.js';

// Au-delà de cet écart, la recalibration est bloquée : un tel saut trahit une
// saisie douteuse bien plus probablement qu'une vraie dérive métabolique.
const MAX_RECALIBRATION_DELTA = 600;

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
  const { adaptiveTDEE, hasEnoughData, overlapDays, windowStart, excludedDays, calibration } = signals;
  const delta =
    adaptiveTDEE !== null && baseTDEE !== null ? adaptiveTDEE - baseTDEE : null;

  let blockedReason = null;
  if (calibration?.active) {
    const eta = etaLabel(calibration);
    blockedReason = `Calibration en cours — ${calibration.crossedDays}/${calibration.requiredDays} jours croisant poids et apport` +
      (eta ? ` (${eta})` : '') + `. TDEE de départ : ${calibration.seedTDEE} kcal.`;
  } else if (windowStart === null && excludedDays > 0) {
    blockedReason = 'Fenêtre de 14 jours pas encore complète depuis la période non suivie';
  } else if (adaptiveTDEE === null || !hasEnoughData) {
    blockedReason = `Données insuffisantes — ${overlapDays} j croisant poids et apport sur 14`;
  } else if (delta === 0) {
    blockedReason = 'Cibles déjà alignées sur le TDEE mesuré';
  } else if (Math.abs(delta) > MAX_RECALIBRATION_DELTA) {
    blockedReason = `Écart de ${delta > 0 ? '+' : ''}${delta} kcal — trop important pour être crédible, vérifie tes saisies`;
  }

  const canRecalibrate = blockedReason === null;

  const recalibrate = () => {
    if (!canRecalibrate) return;
    setData((prev) => ({
      ...prev,
      baseTDEE: adaptiveTDEE,
      targets: computePresetTargets(prev.presetId, adaptiveTDEE),
    }));
  };

  return { signals, canRecalibrate, delta, blockedReason, recalibrate };
}
