import { useMemo } from 'react';
import { PALETTE } from '../constants/config.js';
import { num } from '../utils/mathUtils.js';
import { quickMetric, recentSeries } from '../utils/quickEntry.js';

/**
 * Données du haut d'Aujourd'hui : les trois anneaux (apport, protéines, pas)
 * et la série de pesées du widget Poids. Lecture seule.
 */
export function useTodayDashboard({ days, dateKey, day, dt, stepsTarget }) {
  const rings = useMemo(() => [
    { id: 'kcal', label: 'Apport', unit: 'kcal', value: num(day.intake.kcal), target: dt.kcal, color: PALETTE.ember },
    { id: 'protein', label: 'Protéines', unit: 'g', value: num(day.intake.protein), target: dt.protein, color: PALETTE.aqua },
    { id: 'steps', label: 'Pas', unit: 'pas', value: num(day.expenditure.steps), target: num(stepsTarget) || null, color: PALETTE.sky },
  ], [day.intake.kcal, day.intake.protein, day.expenditure.steps, dt.kcal, dt.protein, stepsTarget]);

  const weightSeries = useMemo(
    () => recentSeries(days, dateKey, quickMetric('weight').read),
    [days, dateKey]
  );

  return { rings, weightSeries };
}
