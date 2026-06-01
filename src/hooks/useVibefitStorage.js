import { useState, useEffect } from 'react';
import { DEFAULT_TARGETS, DEFAULT_STEPS_TARGET, STORAGE_KEY } from '../constants/config.js';
import { deriveMaintenanceKcal } from '../utils/presetUtils.js';

export function useVibefitStorage() {
  const [data, setData] = useState(() => {
    try {
      if (typeof window === 'undefined') throw new Error('no window');
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const targets = parsed.targets || DEFAULT_TARGETS;
        const presetId = parsed.presetId || 'maintenance';
        return {
          days: parsed.days || {},
          targets,
          stepsTarget: parsed.stepsTarget ?? DEFAULT_STEPS_TARGET,
          presetId,
          // Bootstrap : inverse le delta du preset actif pour retrouver la
          // vraie maintenance (et non les valeurs de coupe/diet stockées).
          maintenanceKcal: parsed.maintenanceKcal || deriveMaintenanceKcal(presetId, targets),
        };
      }
    } catch (e) {
      // First run / SSR / privacy mode — fall through to defaults
    }
    return {
      days: {},
      targets: DEFAULT_TARGETS,
      stepsTarget: DEFAULT_STEPS_TARGET,
      presetId: 'maintenance',
      maintenanceKcal: {
        train: DEFAULT_TARGETS.train.kcal,
        off: DEFAULT_TARGETS.off.kcal,
      },
    };
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('VibeFit: failed to persist data', e);
    }
  }, [data]);

  // Always loaded (sync) — third tuple value kept for API parity
  return [data, setData, true];
}
