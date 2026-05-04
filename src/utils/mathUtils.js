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
      trainDone: acc.trainDone + (day.workout ? 1 : 0),
    }),
    { intake: 0, exp: 0, protein: 0, carbs: 0, fat: 0, steps: 0, trainDone: 0 }
  );

  const avg = (v) => (count > 0 ? v / count : 0);

  const kcalTargets = daysData
    .map(({ key }) => {
      const t = targets[dayTypeFromTargets(key)] ?? targets.off;
      return t?.kcal ?? null;
    })
    .filter((v) => v !== null);
  const avgKcalTarget =
    kcalTargets.length > 0 ? kcalTargets.reduce((a, b) => a + b, 0) / kcalTargets.length : 2000;

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
    avgKcalTarget,
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

// internal: returns the target key (train/off/we) for a given date key
const dayTypeFromTargets = (key) => {
  const d = new Date(key + 'T12:00:00').getDay();
  if (d === 1 || d === 3 || d === 5) return 'train';
  if (d === 2 || d === 4) return 'off';
  return 'we';
};
