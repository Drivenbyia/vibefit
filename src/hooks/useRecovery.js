import { useMemo } from 'react';
import { computeRecovery } from '../utils/recoveryBaseline.js';
import { isTrainingSuspended } from '../models/protocol.js';
import { toKey } from '../utils/dateUtils.js';

/**
 * Référence de récupération au jour RÉEL (lecture seule). `displayOnly` :
 * pendant une phase sans entraînement, la décision du 2026-10-24 interdit
 * tout verdict VFC / FC repos — on montre des mesures, pas une conclusion.
 */
export function useRecovery(data) {
  return useMemo(() => {
    const today = toKey(new Date());
    return {
      ...computeRecovery(data, { today }),
      displayOnly: isTrainingSuspended(today, data?.phases ?? []),
    };
  }, [data]);
}
