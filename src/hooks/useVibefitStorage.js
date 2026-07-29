import { useState, useEffect } from 'react';
import { DEFAULT_STEPS_TARGET, STORAGE_KEY } from '../constants/config.js';
import { deriveBaseTDEE, DEFAULT_TDEE, DEFAULT_TARGETS } from '../utils/presetUtils.js';

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
          // Bootstrap : retrouve le TDEE depuis les targets+preset stockés.
          // Migration transparente depuis l'ancien champ maintenanceKcal.
          baseTDEE: parsed.baseTDEE
            ?? (parsed.maintenanceKcal?.train != null ? parsed.maintenanceKcal.train - 200 : null)
            ?? deriveBaseTDEE(presetId, targets),
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
      baseTDEE: DEFAULT_TDEE,
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
