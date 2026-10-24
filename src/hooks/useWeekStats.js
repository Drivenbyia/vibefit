import { useMemo } from 'react';
import { PROTEIN_FLOOR } from '../constants/config.js';
import { DEFAULT_TARGETS } from '../utils/presetUtils.js';
import { addDays, startOfWeek } from '../utils/dateUtils.js';
import { num, calculateWeeklyBalance, calculateWeightStats, aggregateSleep, nutritionScope } from '../utils/mathUtils.js';
import { dayType } from '../models/day.js';
import { isExcluded } from '../models/protocol.js';

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

  const phases = data?.phases;
  const periods = data?.periods;
  // Périmètre nutrition : une semaine à cheval sur une période non suivie ne
  // compte que les jours hors coupure — solde, moyennes, jours non saisis et
  // plancher protéines. `days` reste entier pour le calendrier et le sommeil.
  const nutritionDays = useMemo(() => nutritionScope(days, periods ?? []), [days, periods]);
  const inScope = days.filter(({ key }) => !isExcluded(key, periods ?? [], 'nutrition'));

  const weekly = useMemo(
    () => calculateWeeklyBalance(nutritionDays, resolvedTargets, phases ?? []),
    [nutritionDays, resolvedTargets, phases]
  );

  const plannedTrain = days.filter(({ key, day }) => dayType(key, day, phases ?? []) === 'train').length;

  const waistSeries = nutritionDays
    .map(({ key, day }) => ({ key, w: day?.waist ? num(day.waist) : null }))
    .filter((p) => p.w !== null);

  const { avgWeight, weightDelta, weightSeries } = calculateWeightStats(nutritionDays);

  // Cibles macro moyennées sur les jours RÉELS de la semaine affichée, via
  // dayType — plutôt qu'une moyenne TRAIN/OFF qui ignorait le week-end et
  // recodait implicitement la composition du split.
  const dayTargets = inScope.map(
    ({ key, day }) => resolvedTargets[dayType(key, day, phases ?? [])] ?? resolvedTargets.off
  );
  const avgTarget = (field, fallback) => {
    const vs = dayTargets.map((t) => t?.[field]).filter((v) => v != null);
    return vs.length > 0 ? vs.reduce((a, b) => a + b, 0) / vs.length : fallback;
  };

  // Pendant une phase, le plancher est celui de la cible unique (170 g en
  // Sèche forte), pas celui de TRAIN.
  const restTarget = resolvedTargets.rest;
  const inPhase = days.some(({ key, day }) => dayType(key, day, phases ?? []) === 'rest');
  const proteinFloor = (inPhase ? restTarget?.protein : null) ?? resolvedTargets.train?.protein ?? PROTEIN_FLOOR;

  const macroTargets = {
    protein: proteinFloor,
    carbs: avgTarget('carbs', 200),
    fat: avgTarget('fat', 72),
  };

  // Plancher protéines évalué sur les 7 jours CALENDAIRES, pas sur les jours
  // saisis. Une moyenne divisée par les jours saisis récompensait le logging
  // sélectif : 3 jours loggés à 180 g masquaient le badge malgré 4 jours vides.
  // Et un plancher QUOTIDIEN ne se contrôle pas par une moyenne — 220 g puis
  // 100 g font 160 de moyenne et deux jours hors protocole.
  const sleep = aggregateSleep(days);

  // Jours de la coupure : ni « non saisis », ni sous le plancher — hors périmètre.
  const daysNotLogged = inScope.filter(({ day }) => !day || num(day.intake?.kcal) === 0).length;
  const daysUnderProtein = inScope.filter(
    ({ day }) =>
      day && num(day.intake?.kcal) > 0 && num(day.intake?.protein) < proteinFloor
  ).length;

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
    sleep,
    proteinFloor,
    // Phase couvrant la semaine affichée : la cible unique qu'elle impose.
    inPhase,
    restTarget,
    // Jours de la semaine hors coupure — dénominateur de « jours saisis ».
    trackedDays: inScope.length,
    daysUnderProtein,
    daysNotLogged,
  };
}
