import { KCAL_FLOOR } from '../constants/config.js';
import { num } from '../utils/mathUtils.js';
import { toKey } from '../utils/dateUtils.js';
import { dayType } from '../models/day.js';

/**
 * Dérive les métriques d'une journée pour TodayView :
 * cibles du jour, totaux saisis, alertes de cohérence macro et de sous-alimentation.
 */
export function useDayMetrics(dateKey, day, targets, phases = []) {
  const t = dayType(dateKey, day, phases);
  // Repli sur OFF si la cible unique manque (cibles non résolues) — jamais undefined.
  const dt = targets[t] ?? targets.off;
  const intake = num(day.intake.kcal);
  const expenditure = num(day.expenditure.kcal);
  const steps = num(day.expenditure.steps);
  const isMonday = new Date(dateKey + 'T12:00:00').getDay() === 1;
  // La bande d'état parle de MAINTENANT. En feuilletant le journal sur un jour
  // passé, elle mentirait sur ce qu'elle décrit.
  const isToday = dateKey === toKey(new Date());

  const computedKcal = num(day.intake.protein) * 4 + num(day.intake.carbs) * 4 + num(day.intake.fat) * 9;
  const macroDelta = Math.abs(computedKcal - intake);

  return {
    dt,
    intake,
    expenditure,
    steps,
    isMonday,
    isToday,
    computedKcal,
    macroDelta,
    showMacroWarning: intake > 0 && computedKcal > 0 && macroDelta > 100,
    showUndereatAlert: intake > 0 && intake < KCAL_FLOOR,
  };
}
