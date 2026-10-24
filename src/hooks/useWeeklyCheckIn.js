import { useMemo } from 'react';
import { PROTEIN_FLOOR } from '../constants/config.js';
import { addDays, startOfWeek, toKey } from '../utils/dateUtils.js';
import { dayTarget, num, nutritionScope, watchStepsAverage } from '../utils/mathUtils.js';
import { computeLongTrend } from '../utils/longTrend.js';
import { targetResolver } from '../utils/targetHistory.js';
import { weeklyCheckIn } from '../utils/weeklyCheckIn.js';
import { useAdaptiveTargets } from './useAdaptiveTargets.js';

// Le bilan ne recalibre jamais : il lit `useAdaptiveTargets` sans écrire.
const READ_ONLY = () => {};

/**
 * Bilan de la semaine écoulée — le dimanche, la semaine en cours (presque
 * finie) ; les autres jours, la dernière semaine complète, sauf si elle est
 * entièrement non suivie. Lecture seule.
 */
export function useWeeklyCheckIn(data, targets, stepsTarget) {
  const { signals, canRecalibrate, delta } = useAdaptiveTargets(data, READ_ONLY);
  return useMemo(() => {
    const now = new Date();
    const today = toKey(now);
    const weeks = computeLongTrend(data, targets, { weeks: 3, today });
    const last = weeks.length - 1;
    // Une semaine entièrement non suivie n'a rien à dire : on passe à la
    // semaine en cours plutôt que de dresser le bilan d'une coupure.
    let idx = now.getDay() === 0 ? last : last - 1;
    if (weeks[idx].untracked) idx = last;
    const week = weeks[idx];
    const periods = data?.periods ?? [];
    const phases = data?.phases ?? [];
    const days = Array.from({ length: 7 }, (_, i) => addDays(week.weekStart, i))
      .filter((key) => key <= today)
      .map((key) => ({ key, day: data?.days?.[key] ?? null }));
    const scoped = nutritionScope(days, periods);
    const targetsOn = targetResolver(targets, data?.targetHistory ?? []);
    const lastKey = days[days.length - 1].key;
    const floor = dayTarget(targetsOn, lastKey, null, phases).protein ?? PROTEIN_FLOOR;
    const logged = scoped.filter(({ day }) => num(day?.intake?.kcal) > 0);
    // Tour de taille : la semaine CALENDAIRE en cours, du lundi à aujourd'hui,
    // hors jours coupés — quelle que soit la semaine dont on dresse le bilan.
    const monday = startOfWeek(today);
    const thisWeek = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
      .filter((key) => key <= today)
      .map((key) => ({ key, day: data?.days?.[key] ?? null }));
    const waistMissing = !nutritionScope(thisWeek, periods).some(({ day }) => num(day?.waist) > 0);
    return weeklyCheckIn({
      week,
      inProgress: idx === last,
      waistMissing,
      isMonday: now.getDay() === 1,
      prevWeek: weeks[idx - 1],
      protein: { days: logged.length, underDays: logged.filter(({ day }) => num(day.intake.protein) < floor).length, floor },
      steps: watchStepsAverage(days, { devices: data?.devices ?? [], periods }),
      stepsTarget,
      calibration: signals.calibration,
      tdee: { adaptiveTDEE: signals.adaptiveTDEE, delta, canRecalibrate },
    });
  }, [data, targets, stepsTarget, signals, canRecalibrate, delta]);
}
