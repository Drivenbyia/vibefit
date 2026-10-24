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

const fr = (key) => key.split('-').reverse().join('/');
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Gestion manuelle de la phase du jour : clôture et fin prévue.
 *
 * La fin PRÉVUE ne ferme rien : l'épreuve d'effort peut être reportée, et une
 * date atteinte ne vaut pas feu vert du cardiologue. La clôture est donc une
 * action explicite, disponible à tout moment, toujours confirmée — et la fin
 * prévue reste éditable pour suivre un rendez-vous déplacé.
 */
export function usePhaseManager(data, setData) {
  const today = toKey(new Date());
  const { phase } = usePhase(data, today);
  const canClose = !!phase;

  const closePhase = useCallback(() => {
    if (!phase) return;
    const early = phase.plannedEnd != null && today < phase.plannedEnd
      ? ` La fin prévue est le ${fr(phase.plannedEnd)}.`
      : '';
    if (!window.confirm(`Clore la phase « ${phase.label ?? phase.type} » au ${fr(today)} ?${early} Le cyclage TRAIN/OFF reprendra dès demain.`)) return;
    setData((prev) => ({
      ...prev,
      phases: (prev.phases ?? []).map((p) => (p.id === phase.id ? { ...p, endedAt: today } : p)),
    }));
  }, [phase, today, setData]);

  /**
   * Nouvelle fin prévue. Rejetée si invalide ou antérieure au début de la
   * phase ; une valeur vide retire la fin prévue (« sans date »). Ne clôt rien.
   */
  const setPlannedEnd = useCallback((value) => {
    if (!phase) return false;
    const next = value === '' ? null : value;
    if (next !== null && (!ISO_DAY.test(next) || next < phase.start)) return false;
    setData((prev) => ({
      ...prev,
      phases: (prev.phases ?? []).map((p) => (p.id === phase.id ? { ...p, plannedEnd: next } : p)),
    }));
    return true;
  }, [phase, setData]);

  return { phase, canClose, closePhase, setPlannedEnd };
}
