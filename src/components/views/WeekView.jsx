import { useCallback } from 'react';
import { getHistoricalWeeks } from '../../utils/exportUtils.js';
import { useWeekStats } from '../../hooks/useWeekStats.js';
import { usePlateauDiagnosis } from '../../hooks/usePlateauDiagnosis.js';
import { useClipboardCopy } from '../../hooks/useClipboardCopy.js';
import DiagnosisCard from './week/DiagnosisCard.jsx';
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

export default function WeekView({ dateKey, data, setDateKey, targets }) {
  const {
    resolvedTargets, start, days, weekly, plannedTrain,
    waistSeries, avgWeight, weightDelta, weightSeries, macroTargets,
    proteinFloor, daysUnderProtein, daysNotLogged,
  } = useWeekStats(dateKey, data, targets);

  const diagnosis = usePlateauDiagnosis(data, resolvedTargets);
  const [copied, copy] = useClipboardCopy(2000);
  const handleExport = useCallback(() => copy(getHistoricalWeeks(data, 8)), [copy, data]);

  return (
    <div style={{ padding: '14px 14px 100px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Card>
        <WeekSummary start={start} recordedDays={weekly.recordedDays} netBalance={weekly.netBalance} />
        <WeekCalendar days={days} dateKey={dateKey} setDateKey={setDateKey} />
      </Card>
      <DiagnosisCard
        status={diagnosis.status}
        label={diagnosis.label}
        detail={diagnosis.detail}
        weeksEvaluated={diagnosis.weeksEvaluated}
      />
      <NetBalanceCard weekly={weekly} plannedTrain={plannedTrain} />
      <KcalTrendCard days={days} dateKey={dateKey} setDateKey={setDateKey} resolvedTargets={resolvedTargets} />
      <AveragesCard
        weekly={weekly}
        macroTargets={macroTargets}
        proteinFloor={proteinFloor}
        daysUnderProtein={daysUnderProtein}
        daysNotLogged={daysNotLogged}
      />
      <WaistCard waistSeries={waistSeries} />
      <WeightCard avgWeight={avgWeight} weightDelta={weightDelta} weightSeries={weightSeries} />
      <ReminderCard presetId={data.presetId} netBalance={weekly.netBalance} recordedDays={weekly.recordedDays} />
      <ExportButton copied={copied} onExport={handleExport} />
    </div>
  );
}
