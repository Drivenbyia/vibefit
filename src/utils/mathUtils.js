import { dayType } from '../models/day.js';
import { toKey, startOfWeek, addDays } from './dateUtils.js';

export const num = (v) => {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

export const calculateWeeklyBalance = (daysData, targets) => {
  const filledDays = daysData.filter(
    ({ day }) => day && (num(day.intake?.kcal) > 0 || num(day.expenditure?.kcal) > 0)
  );
  const count = filledDays.length;

  const totals = filledDays.reduce(
    (acc, { day }) => ({
      intake: acc.intake + num(day.intake?.kcal),
      exp: acc.exp + num(day.expenditure?.kcal),
      protein: acc.protein + num(day.intake?.protein),
      carbs: acc.carbs + num(day.intake?.carbs),
      fat: acc.fat + num(day.intake?.fat),
      steps: acc.steps + num(day.expenditure?.steps),
      // 'none' (repos déclaré explicitement) n'est pas une séance effectuée
      trainDone: acc.trainDone + (day.workout === 'haut' || day.workout === 'bas' ? 1 : 0),
    }),
    { intake: 0, exp: 0, protein: 0, carbs: 0, fat: 0, steps: 0, trainDone: 0 }
  );

  const avg = (v) => (count > 0 ? v / count : 0);

  // Apport et cible comparés sur EXACTEMENT le même sous-ensemble de jours.
  //
  // Les cibles week-end sont nulles, donc filtrées de la moyenne des cibles —
  // mais l'apport du week-end restait compté dans la moyenne des apports. Manger
  // plus les jours sans cible plaçait donc systématiquement l'utilisateur
  // « au-dessus de sa cible », même parfaitement adhérent en semaine.
  const comparable = daysData.filter(({ key, day }) => {
    const t = targets[dayType(key, day)] ?? targets.off;
    return day && num(day.intake?.kcal) > 0 && t?.kcal != null;
  });
  const comparableDays = comparable.length;
  const meanOver = (fn) =>
    comparableDays > 0 ? comparable.reduce((s, d) => s + fn(d), 0) / comparableDays : null;

  return {
    netBalance: totals.intake - totals.exp,
    totalIntake: totals.intake,
    totalExp: totals.exp,
    totalProt: totals.protein,
    totalCarbs: totals.carbs,
    totalFat: totals.fat,
    totalSteps: totals.steps,
    trainDone: totals.trainDone,
    avgIntake: avg(totals.intake),
    avgExp: avg(totals.exp),
    avgProt: avg(totals.protein),
    avgCarbs: avg(totals.carbs),
    avgFat: avg(totals.fat),
    avgSteps: avg(totals.steps),
    comparableDays,
    avgIntakeComparable: meanOver(({ day }) => num(day.intake?.kcal)),
    avgKcalTarget: meanOver(({ key, day }) => (targets[dayType(key, day)] ?? targets.off).kcal),
    recordedDays: count,
  };
};

/**
 * Agrège les `n` dernières semaines, de la plus ancienne à la plus récente.
 * Alimente le protocole anti-rationalisation, qui a besoin de l'évolution
 * semaine par semaine du poids, de l'apport et de l'adhérence.
 */
export const computeWeeklyHistory = (data, targets, n = 8) => {
  const todayKey = toKey(new Date());
  const currentWeekStart = startOfWeek(todayKey);

  return Array.from({ length: n }, (_, i) => {
    const weekStart = startOfWeek(addDays(currentWeekStart, -(n - 1 - i) * 7));
    const days = Array.from({ length: 7 }, (_, d) => {
      const key = addDays(weekStart, d);
      return { key, day: data?.days?.[key] ?? null };
    });

    // Jours déjà écoulés — la semaine en cours n'en compte pas 7. Sans cette
    // distinction, un lundi matin ferait passer une semaine parfaite pour un
    // défaut d'adhérence (1 jour saisi sur 7 attendus).
    const elapsedDays = days.filter(({ key }) => key <= todayKey).length;

    const weekly = calculateWeeklyBalance(days, targets);
    const { avgWeight } = calculateWeightStats(days);
    const waists = days
      .map(({ day }) => (day?.waist ? num(day.waist) : null))
      .filter((v) => v !== null);

    // Les pas sont moyennés sur les jours où ils sont RÉELLEMENT renseignés,
    // pas sur les jours « saisis » au sens alimentaire : la montre les remonte
    // même les semaines où rien n'est loggé côté nutrition.
    const steps = days
      .map(({ day }) => num(day?.expenditure?.steps))
      .filter((v) => v > 0);

    return {
      weekStart,
      elapsedDays,
      recordedDays: weekly.recordedDays,
      avgIntake: weekly.recordedDays > 0 ? weekly.avgIntake : null,
      avgWeight,
      avgWaist: waists.length > 0 ? waists.reduce((a, b) => a + b, 0) / waists.length : null,
      avgSteps: steps.length > 0 ? steps.reduce((a, b) => a + b, 0) / steps.length : null,
      stepsDays: steps.length,
      // Même logique que les pas : le sommeil vient de la montre et continue
      // d'être remonté les semaines où rien n'est loggé côté nutrition.
      sleep: aggregateSleep(days),
      heavyWorkDays: days.filter(({ day }) => day?.heavyWork).length,
    };
  });
};

/**
 * Moyennes de sommeil sur les nuits renseignées — descriptif pur, aucun seuil.
 * `nights` compte les nuits ayant au moins un score ou une durée.
 */
export const aggregateSleep = (daysData) => {
  const field = (f) => daysData.map(({ day }) => num(day?.sleep?.[f])).filter((v) => v > 0);
  const mean = (xs) => (xs.length > 0 ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

  const scores = field('score');
  const durations = field('durationMin');

  return {
    score: mean(scores),
    durationMin: mean(durations),
    hrv: mean(field('hrv')),
    rhr: mean(field('rhr')),
    nights: Math.max(scores.length, durations.length),
  };
};

export const calculateWeightStats = (daysData) => {
  const series = daysData
    .map(({ key, day }) => ({ key, w: day?.weight ? num(day.weight) : null }))
    .filter((p) => p.w !== null);

  if (series.length === 0) return { avgWeight: null, weightDelta: null, weightSeries: [] };

  const avg = series.reduce((acc, { w }) => acc + w, 0) / series.length;
  const delta = series.length >= 2 ? series[series.length - 1].w - series[0].w : null;

  return { avgWeight: avg, weightDelta: delta, weightSeries: series };
};
