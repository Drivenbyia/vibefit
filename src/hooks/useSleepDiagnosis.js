import { useMemo } from 'react';
import { computeWeeklyHistory } from '../utils/mathUtils.js';
import { diagnoseSleep, SLEEP_BASELINE_WEEKS } from '../utils/sleepDiagnosis.js';
import { SLEEP_STRAIN_MIN_BASELINE_WEEKS } from '../constants/config.js';
import { isTrainingSuspended } from '../models/protocol.js';
import { toKey } from '../utils/dateUtils.js';

/**
 * Surveille dette et tension de récupération. Indépendant du protocole de
 * plateau, comme `useNeatDrift` : les nuits restent remontées par la montre
 * même quand le suivi alimentaire décroche.
 */
export function useSleepDiagnosis(data, targets) {
  return useMemo(() => {
    // +1 semaine pour la semaine courante (écartée), +1 pour la semaine évaluée
    const weeklyHistory = computeWeeklyHistory(data, targets, SLEEP_BASELINE_WEEKS + 2);
    // Pendant l'arrêt médical : aucun verdict VFC / FC repos. La dette de
    // sommeil (durée, seuil absolu) reste active.
    const strainEnabled = !isTrainingSuspended(toKey(new Date()), data?.phases ?? []);
    return diagnoseSleep({
      weeklyHistory,
      strainEnabled,
      minStrainBaselineWeeks: SLEEP_STRAIN_MIN_BASELINE_WEEKS,
    });
  }, [data, targets]);
}
