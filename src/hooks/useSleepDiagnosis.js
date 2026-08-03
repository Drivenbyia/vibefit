import { useMemo } from 'react';
import { computeWeeklyHistory } from '../utils/mathUtils.js';
import { diagnoseSleep, SLEEP_BASELINE_WEEKS } from '../utils/sleepDiagnosis.js';

/**
 * Surveille dette et tension de récupération. Indépendant du protocole de
 * plateau, comme `useNeatDrift` : les nuits restent remontées par la montre
 * même quand le suivi alimentaire décroche.
 */
export function useSleepDiagnosis(data, targets) {
  return useMemo(() => {
    // +1 semaine pour la semaine courante (écartée), +1 pour la semaine évaluée
    const weeklyHistory = computeWeeklyHistory(data, targets, SLEEP_BASELINE_WEEKS + 2);
    return diagnoseSleep({ weeklyHistory });
  }, [data, targets]);
}
