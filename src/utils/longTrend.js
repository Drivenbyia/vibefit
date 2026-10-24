import { addDays, startOfWeek, toKey } from './dateUtils.js';
import { calculateWeeklyBalance, calculateWeightStats, nutritionScope, num } from './mathUtils.js';
import { isExcluded } from '../models/protocol.js';
import { targetResolver } from './targetHistory.js';

/** Fenêtre affichée : 12 semaines, la semaine en cours comprise. */
export const LONG_TREND_WEEKS = 12;

/** Écart moyen « dans la cible » — même tolérance que le rappel hebdo (±100). */
export const GAP_ON_TARGET_KCAL = 100;

/**
 * Tendance longue, semaine par semaine — LECTURE SEULE, rien n'est stocké.
 *
 * Pour chaque semaine (lundi → dimanche), sur le périmètre nutrition (jours
 * coupés neutralisés, comme `computeWeeklyHistory`) :
 *   weight     — moyenne des pesées de la semaine (le lissage d'une semaine)
 *   waist      — moyenne des tours de taille mesurés
 *   gapPerDay  — écart apport − cible par jour comparable, cible de CHAQUE
 *                jour à SA date (historique des cibles) ; null sans jour
 *   untracked  — semaine entièrement dans une période non suivie
 * Une semaine sans mesure renvoie null : le tracé se coupe, il ne relie pas
 * deux points séparés par un trou.
 */
export function computeLongTrend(data, currentTargets, { weeks = LONG_TREND_WEEKS, today = toKey(new Date()) } = {}) {
  const targetsOn = targetResolver(currentTargets, data?.targetHistory ?? []);
  const periods = data?.periods ?? [];
  const phases = data?.phases ?? [];
  const lastWeek = startOfWeek(today);

  return Array.from({ length: weeks }, (_, i) => {
    const weekStart = addDays(lastWeek, -(weeks - 1 - i) * 7);
    const days = Array.from({ length: 7 }, (_, d) => {
      const key = addDays(weekStart, d);
      return { key, day: key <= today ? (data?.days?.[key] ?? null) : null };
    });
    const elapsed = days.filter(({ key }) => key <= today);
    const scoped = nutritionScope(elapsed, periods);
    const { avgWeight } = calculateWeightStats(scoped);
    const waists = scoped.map(({ day }) => num(day?.waist)).filter((v) => v > 0);
    const { targetGap, comparableDays } = calculateWeeklyBalance(scoped, targetsOn, phases);
    return {
      weekStart,
      weight: avgWeight,
      waist: waists.length > 0 ? waists.reduce((a, b) => a + b, 0) / waists.length : null,
      gapPerDay: comparableDays > 0 ? targetGap / comparableDays : null,
      comparableDays,
      untracked: elapsed.length > 0 && elapsed.every(({ key }) => isExcluded(key, periods, 'nutrition')),
    };
  });
}

/** 'in' (±100 kcal/j), 'over', 'under' — ou null sans écart. */
export function gapStatus(gapPerDay) {
  if (gapPerDay == null) return null;
  if (gapPerDay > GAP_ON_TARGET_KCAL) return 'over';
  if (gapPerDay < -GAP_ON_TARGET_KCAL) return 'under';
  return 'in';
}
