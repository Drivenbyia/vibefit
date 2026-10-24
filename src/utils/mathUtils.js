import { dayType } from '../models/day.js';
import { toKey, startOfWeek, addDays } from './dateUtils.js';
import { isExcluded, isReferenceMeasure, measureSource, deviceAt } from '../models/protocol.js';
import { WATCH_SOURCES } from '../constants/config.js';

export const num = (v) => {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

/**
 * Jours d'une semaine restreints au périmètre NUTRITION : un jour couvert par
 * une coupure garde sa clé mais perd son contenu. Partagé par l'historique des
 * diagnostics et par le solde affiché dans l'onglet Semaine — une semaine à
 * cheval sur la coupure n'y compte que les jours d'après.
 */
export const nutritionScope = (daysData, periods = []) =>
  daysData.map(({ key, day }) => (isExcluded(key, periods, 'nutrition') ? { key, day: null } : { key, day }));

export const calculateWeeklyBalance = (daysData, targets, phases = []) => {
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
    const t = targets[dayType(key, day, phases)] ?? targets.off;
    return day && num(day.intake?.kcal) > 0 && t?.kcal != null;
  });
  const comparableDays = comparable.length;
  const meanOver = (fn) =>
    comparableDays > 0 ? comparable.reduce((s, d) => s + fn(d), 0) / comparableDays : null;

  // Écart cumulé apport − cible sur les jours comparables. Remplace le solde
  // « apport − calories montre » à l'affichage : les calories de la montre ne
  // pilotent rien (décision du 2026-10-24), elles restent une info du jour.
  const targetGap = comparable.reduce(
    (s, { key, day }) => s + num(day.intake?.kcal) - (targets[dayType(key, day, phases)] ?? targets.off).kcal,
    0
  );

  return {
    netBalance: totals.intake - totals.exp,
    targetGap,
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
    avgKcalTarget: meanOver(({ key, day }) => (targets[dayType(key, day, phases)] ?? targets.off).kcal),
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

    // Périmètre NUTRITION : les jours d'une coupure sont vidés pour l'apport,
    // le poids, la taille, l'adhérence et le chantier. Les pas et le sommeil
    // gardent `days` — leur exclusion dépend de la source (étape montres), pas
    // de la coupure : une nuit Apple Watch du 19/10 reste une vraie mesure.
    const periods = data?.periods ?? [];
    const nutritionDays = nutritionScope(days, periods);
    // Référence montre : seules les mesures de la montre portée AUJOURD'HUI,
    // hors jours partiels, entrent dans les moyennes de pas et de sommeil qui
    // alimentent les références (NEAT, sommeil). Un pas Garmin n'est pas un pas
    // Apple Watch, un pas iPhone seul n'est pas un pas montre.
    const devices = data?.devices ?? [];
    const ref = { devices, periods, referenceSource: devices.length > 0 ? deviceAt(todayKey, devices) : null };
    const stepsDaysData = days.filter(({ key, day }) => isReferenceMeasure(key, day, 'steps', ref));
    const sleepDaysData = days.filter(({ key, day }) => isReferenceMeasure(key, day, 'sleep', ref));
    const excludedDays = days.filter(({ key }) => isExcluded(key, periods, 'nutrition')).length;

    const weekly = calculateWeeklyBalance(nutritionDays, targets, data?.phases ?? []);
    const { avgWeight } = calculateWeightStats(nutritionDays);
    const waists = nutritionDays
      .map(({ day }) => (day?.waist ? num(day.waist) : null))
      .filter((v) => v !== null);

    // Les pas sont moyennés sur les jours où ils sont RÉELLEMENT renseignés,
    // pas sur les jours « saisis » au sens alimentaire : la montre les remonte
    // même les semaines où rien n'est loggé côté nutrition.
    const steps = stepsDaysData
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
      sleep: aggregateSleep(sleepDaysData),
      heavyWorkDays: nutritionDays.filter(({ day }) => day?.heavyWork).length,
      // Jours de la semaine neutralisés par une coupure — une semaine qui en
      // contient n'est jamais jugée par le protocole de plateau.
      excludedDays,
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
    // SDNN (Apple Santé) — complément du RMSSD, jamais comparé à lui.
    hrvSdnn: mean(field('hrvSdnn')),
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

/**
 * Moyenne de pas MONTRE d'une liste de jours : sources Garmin / Apple Watch
 * uniquement, jours partiels exclus. Les pas iPhone seul (sous-estimés) et
 * les saisies d'origine inconnue n'y entrent jamais.
 * @returns {{ avg: number|null, days: number }}
 */
export const watchStepsAverage = (daysData, { devices = [], periods = [] } = {}) => {
  const xs = daysData
    .filter(({ key, day }) => num(day?.expenditure?.steps) > 0
      && !isExcluded(key, periods, 'recovery')
      && WATCH_SOURCES.includes(measureSource(key, day, 'steps', devices)))
    .map(({ day }) => num(day.expenditure.steps));
  return { avg: xs.length > 0 ? xs.reduce((a, b) => a + b, 0) / xs.length : null, days: xs.length };
};

/**
 * Moyenne de protéines sur les jours où un apport a été saisi — un jour vide
 * n'est pas un jour à 0 g. Les jours de coupure doivent être retirés en amont
 * (`nutritionScope`).
 * @returns {{ avg: number|null, days: number }}
 */
export const proteinAverage = (daysData) => {
  const xs = daysData
    .filter(({ day }) => num(day?.intake?.kcal) > 0)
    .map(({ day }) => num(day.intake.protein));
  return { avg: xs.length > 0 ? xs.reduce((a, b) => a + b, 0) / xs.length : null, days: xs.length };
};

