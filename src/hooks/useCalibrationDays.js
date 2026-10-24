import { useMemo } from 'react';
import { calibrationProgress, calibrationDayStatus } from '../utils/adaptiveTDEE.js';
import { sanitizeProtocol } from '../models/protocol.js';
import { toKey } from '../utils/dateUtils.js';

/**
 * Statut de calibration de chaque jour affiché dans le calendrier, au jour
 * RÉEL. `null` hors calibration active : une fois le seuil atteint, les
 * marques disparaissent — elles n'ont servi qu'à l'atteindre.
 */
export function useCalibrationDays(data, keys) {
  return useMemo(() => {
    const today = toKey(new Date());
    const progress = calibrationProgress(data, today);
    if (!progress?.active) return null;
    const { calibration } = sanitizeProtocol(data);
    const periods = data?.periods ?? [];
    return Object.fromEntries(
      keys.map((key) => [key, calibrationDayStatus(key, data.days[key], periods, calibration, today)]),
    );
  }, [data, keys]);
}
