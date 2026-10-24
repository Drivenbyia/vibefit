import { useCallback, useMemo } from 'react';
import { getHistoricalWeeks } from '../../utils/exportUtils.js';
import { useWeekStats } from '../../hooks/useWeekStats.js';
import { usePlateauDiagnosis } from '../../hooks/usePlateauDiagnosis.js';
import { useNeatDrift } from '../../hooks/useNeatDrift.js';
import { useSleepDiagnosis } from '../../hooks/useSleepDiagnosis.js';
import { useClipboardCopy } from '../../hooks/useClipboardCopy.js';
import { usePhase } from '../../hooks/usePhase.js';
import { useCalibrationDays } from '../../hooks/useCalibrationDays.js';
import WeekDiagnostics from './week/WeekDiagnostics.jsx';
import Card from '../ui/Card.jsx';
import WeekSummary from './week/WeekSummary.jsx';
import WeekCalendar from './week/WeekCalendar.jsx';
import NetBalanceCard from './week/NetBalanceCard.jsx';
import KcalTrendCard from './week/KcalTrendCard.jsx';
import AveragesCard from './week/AveragesCard.jsx';
import WaistCard from './week/WaistCard.jsx';
import WeightCard from './week/WeightCard.jsx';
import LongTrendCard from './week/LongTrendCard.jsx';
import RecoveryCard from './week/RecoveryCard.jsx';
import WeekReminder from './week/WeekReminder.jsx';
import ExportButton from './week/ExportButton.jsx';

export default function WeekView({ dateKey, data, setDateKey, targets, stepsTarget }) {
  const {
    resolvedTargets, targetsOn, start, days, weekly, plannedTrain,
    waistSeries, avgWeight, weightDelta, weightSeries, macroTargets,
    proteinFloor, daysUnderProtein, daysNotLogged, sleep, trackedDays, inPhase, restTarget,
    protein, watchSteps,
  } = useWeekStats(dateKey, data, targets);

  const diagnosis = usePlateauDiagnosis(data, resolvedTargets);
  const neat = useNeatDrift(data, resolvedTargets);
  const sleepDiagnosis = useSleepDiagnosis(data, resolvedTargets);
  const [copied, copy] = useClipboardCopy(2000);
  const { phase } = usePhase(data, dateKey);
  const calibrationDays = useCalibrationDays(data, useMemo(() => days.map((d) => d.key), [days]));
  const handleExport = useCallback(() => copy(getHistoricalWeeks(data, 8)), [copy, data]);

  return (
    <div style={{ padding: '14px 14px 100px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Card>
        <WeekSummary start={start} recordedDays={weekly.recordedDays} trackedDays={trackedDays} targetGap={weekly.targetGap} comparableDays={weekly.comparableDays} />
        <WeekCalendar days={days} dateKey={dateKey} setDateKey={setDateKey} phases={data.phases} calibration={calibrationDays} />
      </Card>
      <WeekDiagnostics diagnosis={diagnosis} neat={neat} sleep={sleepDiagnosis} />
      <RecoveryCard data={data} />
      <NetBalanceCard weekly={weekly} plannedTrain={plannedTrain} showSessions={!inPhase} />
      <KcalTrendCard days={days} dateKey={dateKey} setDateKey={setDateKey} targetsOn={targetsOn} phases={data.phases} />
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
      <LongTrendCard data={data} targets={resolvedTargets} />
      <WeekReminder
        presetId={data.presetId} weekly={weekly} inPhase={inPhase} phaseLabel={phase?.label}
        restTarget={restTarget} protein={protein} watchSteps={watchSteps}
        proteinFloor={proteinFloor} stepsTarget={stepsTarget}
      />
      <ExportButton copied={copied} onExport={handleExport} />
    </div>
  );
}
