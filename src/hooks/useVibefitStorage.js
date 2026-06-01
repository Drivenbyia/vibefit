import { useState, useEffect } from 'react';
import { DEFAULT_TARGETS, DEFAULT_STEPS_TARGET, STORAGE_KEY } from '../constants/config.js';

export function useVibefitStorage() {
  const [data, setData] = useState(() => {
    try {
      if (typeof window === 'undefined') throw new Error('no window');
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const targets = parsed.targets || DEFAULT_TARGETS;
        return {
          days: parsed.days || {},
          targets,
          stepsTarget: parsed.stepsTarget ?? DEFAULT_STEPS_TARGET,
          presetId: parsed.presetId || 'maintenance',
          maintenanceKcal: parsed.maintenanceKcal || {
            train: targets.train?.kcal ?? DEFAULT_TARGETS.train.kcal,
            off: targets.off?.kcal ?? DEFAULT_TARGETS.off.kcal,
          },
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
