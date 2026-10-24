import { useMemo, useCallback } from 'react';
import { phaseAt, isCyclingSuspended, isTrainingSuspended } from '../models/protocol.js';
import { toKey } from '../utils/dateUtils.js';

/**
 * Phase en vigueur un jour donné, et ce qu'elle suspend.
 * Lecture seule : aucune donnée de jour n'est écrite par une phase.
 */
export function usePhase(data, dateKey) {
  const phases = data?.phases;
  return useMemo(() => ({
    phase: phaseAt(dateKey, phases ?? []),
    cyclingSuspended: isCyclingSuspended(dateKey, phases ?? []),
    trainingSuspended: isTrainingSuspended(dateKey, phases ?? []),
  }), [dateKey, phases]);
}

/**
 * Clôture manuelle de la phase du jour.
 *
 * La fin PRÉVUE ne ferme rien : l'épreuve d'effort peut être reportée, et une
 * date atteinte ne vaut pas feu vert du cardiologue. La clôture n'est donc
 * proposée qu'à partir de la fin prévue, et toujours confirmée.
 */
export function usePhaseManager(data, setData) {
  const today = toKey(new Date());
  const { phase } = usePhase(data, today);
  const canClose = !!phase && phase.plannedEnd != null && today >= phase.plannedEnd;

  const closePhase = useCallback(() => {
    if (!phase) return;
    if (!window.confirm(`Clore la phase « ${phase.label ?? phase.type} » au ${today.split('-').reverse().join('/')} ? Le cyclage TRAIN/OFF reprendra dès demain.`)) return;
    setData((prev) => ({
      ...prev,
      phases: (prev.phases ?? []).map((p) => (p.id === phase.id ? { ...p, endedAt: today } : p)),
    }));
  }, [phase, today, setData]);

  return { phase, canClose, closePhase };
}
