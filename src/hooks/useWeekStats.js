import { useMemo } from 'react';
import { DEFAULT_TARGETS } from '../constants/config.js';
import { addDays, startOfWeek } from '../utils/dateUtils.js';
import { num, calculateWeeklyBalance, calculateWeightStats } from '../utils/mathUtils.js';
import { dayType } from '../models/day.js';

/**
 * Dérive toutes les statistiques hebdomadaires depuis le state global.
 * Centralise la logique métier de WeekView — les composants ne reçoivent
 * que des données prêtes à afficher.
 */
export function useWeekStats(dateKey, data, targets) {
  const resolvedTargets = targets ?? DEFAULT_TARGETS;
  const start = startOfWeek(dateKey);

  const days = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const k = addDays(start, i);
      return { key: k, day: data?.days?.[k] ?? null };
    })
  , [start, data?.days]);

  const weekly = useMemo(
    () => calculateWeeklyBalance(days, resolvedTargets),
    [days, resolvedTargets]
  );

  const plannedTrain = days.filter(({ key, day }) => dayType(key, day) === 'train').length;

  const waistSeries = days
    .map(({ key, day }) => ({ key, w: day?.waist ? num(day.waist) : null }))
    .filter((p) => p.w !== null);

  const { avgWeight, weightDelta, weightSeries } = calculateWeightStats(days);

  const macroTargets = {
    protein: resolvedTargets.train?.protein ?? 160,
    carbs: ((resolvedTargets.train?.carbs ?? 280) + (resolvedTargets.off?.carbs ?? 120)) / 2,
    fat: ((resolvedTargets.train?.fat ?? 70) + (resolvedTargets.off?.fat ?? 75)) / 2,
  };

  return {
    resolvedTargets,
    start,
    days,
    weekly,
    plannedTrain,
    waistSeries,
    avgWeight,
    weightDelta,
    weightSeries,
    macroTargets,
  };
}
