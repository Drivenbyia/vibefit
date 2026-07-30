import { useMemo } from 'react';
import { extractSignals } from '../utils/adaptiveTDEE.js';
import { computeWeeklyHistory } from '../utils/mathUtils.js';
import { diagnoseNeat, NEAT_BASELINE_WEEKS } from '../utils/neatDrift.js';

/**
 * Surveille l'effondrement du NEAT. Indépendant du diagnostic de plateau :
 * les pas restent disponibles même quand le suivi alimentaire décroche.
 */
export function useNeatDrift(data, targets) {
  return useMemo(() => {
    // +1 semaine pour la semaine courante (écartée), +1 pour la semaine évaluée
    const weeklyHistory = computeWeeklyHistory(data, targets, NEAT_BASELINE_WEEKS + 2);
    const { smoothedWeight } = extractSignals(data);
    return diagnoseNeat({ weeklyHistory, weightKg: smoothedWeight });
  }, [data, targets]);
}
