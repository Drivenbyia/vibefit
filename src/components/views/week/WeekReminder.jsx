import ReminderCard from './ReminderCard.jsx';

/**
 * Rappel hebdo de la semaine affichée : compose les leviers de la phase
 * (protéines, pas montre, cible unique) à partir des statistiques de la
 * semaine. Extrait de `WeekView` (règle des 80 lignes), sans changement.
 */
export default function WeekReminder({ presetId, weekly, inPhase, phaseLabel, restTarget, protein, watchSteps, proteinFloor, stepsTarget }) {
  return (
    <ReminderCard
      presetId={presetId}
      targetGap={weekly.targetGap}
      comparableDays={weekly.comparableDays}
      phase={inPhase ? {
        label: phaseLabel ?? 'Phase en cours',
        singleKcal: restTarget?.kcal,
        avgIntake: weekly.avgIntakeComparable,
        comparableDays: weekly.comparableDays,
      } : null}
      levers={inPhase ? {
        proteinAvg: protein.avg,
        proteinDays: protein.days,
        proteinFloor,
        stepsAvg: watchSteps.avg,
        stepsDays: watchSteps.days,
        stepsTarget,
      } : null}
    />
  );
}
