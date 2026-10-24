import { useMemo } from 'react';
import { extractSignals } from '../utils/adaptiveTDEE.js';
import { computeWeeklyHistory } from '../utils/mathUtils.js';
import { diagnose, PLATEAU_MIN_WEEKS } from '../utils/plateauProtocol.js';
import { isTrainingSuspended } from '../models/protocol.js';
import { toKey } from '../utils/dateUtils.js';

/**
 * Croise TDEE, poids lissé et adhérence pour produire un statut de diagnostic.
 * Purement informatif — aucune cible n'est modifiée.
 */
export function usePlateauDiagnosis(data, targets) {
  return useMemo(() => {
    const signals = extractSignals(data);
    // +1 semaine pour le TDEE implicite de la première semaine évaluée,
    // +1 encore car la semaine en cours est écartée du diagnostic.
    const weeklyHistory = computeWeeklyHistory(data, targets, PLATEAU_MIN_WEEKS + 2);
    const trainingSuspended = isTrainingSuspended(toKey(new Date()), data?.phases ?? []);
    return diagnose({ signals, weeklyHistory, trainingSuspended });
  }, [data, targets]);
}
