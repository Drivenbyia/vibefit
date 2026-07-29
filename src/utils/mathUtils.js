import { dayType } from '../models/day.js';

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

export const calculateWeightStats = (daysData) => {
  const series = daysData
    .map(({ key, day }) => ({ key, w: day?.weight ? num(day.weight) : null }))
    .filter((p) => p.w !== null);

  if (series.length === 0) return { avgWeight: null, weightDelta: null, weightSeries: [] };

  const avg = series.reduce((acc, { w }) => acc + w, 0) / series.length;
  const delta = series.length >= 2 ? series[series.length - 1].w - series[0].w : null;

  return { avgWeight: avg, weightDelta: delta, weightSeries: series };
};
