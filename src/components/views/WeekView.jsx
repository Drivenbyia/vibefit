import { useCallback } from 'react';
import { getHistoricalWeeks } from '../../utils/exportUtils.js';
import { useWeekStats } from '../../hooks/useWeekStats.js';
import { usePlateauDiagnosis } from '../../hooks/usePlateauDiagnosis.js';
import { useNeatDrift } from '../../hooks/useNeatDrift.js';
import { useSleepDiagnosis } from '../../hooks/useSleepDiagnosis.js';
import { useClipboardCopy } from '../../hooks/useClipboardCopy.js';
import { usePhase } from '../../hooks/usePhase.js';
import WeekDiagnostics from './week/WeekDiagnostics.jsx';
import Card from '../ui/Card.jsx';
import WeekSummary from './week/WeekSummary.jsx';
import WeekCalendar from './week/WeekCalendar.jsx';
import NetBalanceCard from './week/NetBalanceCard.jsx';
import KcalTrendCard from './week/KcalTrendCard.jsx';
import AveragesCard from './week/AveragesCard.jsx';
import WaistCard from './week/WaistCard.jsx';
import WeightCard from './week/WeightCard.jsx';
import ReminderCard from './week/ReminderCard.jsx';
import ExportButton from './week/ExportButton.jsx';

export default function WeekView({ dateKey, data, setDateKey, targets, stepsTarget }) {
  const {
    resolvedTargets, start, days, weekly, plannedTrain,
    waistSeries, avgWeight, weightDelta, weightSeries, macroTargets,
    proteinFloor, daysUnderProtein, daysNotLogged, sleep, trackedDays, inPhase, restTarget,
    protein, watchSteps,
  } = useWeekStats(dateKey, data, targets);

  const diagnosis = usePlateauDiagnosis(data, resolvedTargets);
  const neat = useNeatDrift(data, resolvedTargets);
  const sleepDiagnosis = useSleepDiagnosis(data, resolvedTargets);
  const [copied, copy] = useClipboardCopy(2000);
  const { phase } = usePhase(data, dateKey);
  const handleExport = useCallback(() => copy(getHistoricalWeeks(data, 8)), [copy, data]);

  return (
    <div style={{ padding: '14px 14px 100px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Card>
        <WeekSummary start={start} recordedDays={weekly.recordedDays} trackedDays={trackedDays} targetGap={weekly.targetGap} comparableDays={weekly.comparableDays} />
        <WeekCalendar days={days} dateKey={dateKey} setDateKey={setDateKey} phases={data.phases} />
      </Card>
      <WeekDiagnostics diagnosis={diagnosis} neat={neat} sleep={sleepDiagnosis} />
      <NetBalanceCard weekly={weekly} plannedTrain={plannedTrain} showSessions={!inPhase} />
      <KcalTrendCard days={days} dateKey={dateKey} setDateKey={setDateKey} resolvedTargets={resolvedTargets} phases={data.phases} />
      <AveragesCard
        weekly={weekly}
        macroTargets={macroTargets}
        sleep={sleep}
        proteinFloor={proteinFloor}
        daysUnderProtein={daysUnderProtein}
        daysNotLogged={daysNotLogged}
      />
      <WaistCard waistSeries={waistSeries} />
      <WeightCard avgWeight={avgWeight} weightDelta={weightDelta} weightSeries={weightSeries} />
      <ReminderCard
        presetId={data.presetId}
        targetGap={weekly.targetGap}
        comparableDays={weekly.comparableDays}
        phase={inPhase ? {
          label: phase?.label ?? 'Phase en cours',
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
      <ExportButton copied={copied} onExport={handleExport} />
    </div>
  );
}
