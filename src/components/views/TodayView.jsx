import { useDayMetrics } from '../../hooks/useDayMetrics.js';
import { useVibeStatus } from '../../hooks/useVibeStatus.js';
import StatusBand from './today/StatusBand.jsx';
import BackupReminderCard from './today/BackupReminderCard.jsx';
import BalanceCard from './today/BalanceCard.jsx';
import MacrosCard from './today/MacrosCard.jsx';
import IntakeCard from './today/IntakeCard.jsx';
import ExpenditureCard from './today/ExpenditureCard.jsx';
import WorkoutCard from './today/WorkoutCard.jsx';
import PhaseRestCard from './today/PhaseRestCard.jsx';
import { usePhase } from '../../hooks/usePhase.js';
import { deviceAt } from '../../models/protocol.js';
import InfoActivitiesCard from './today/InfoActivitiesCard.jsx';
import AppleEntryGuide from './today/AppleEntryGuide.jsx';
import { WeightCard, WaistCard } from './today/BodyCards.jsx';
import SleepCard from './today/SleepCard.jsx';
import NotesCard from './today/NotesCard.jsx';

export default function TodayView({ dateKey, day, updateDay, targets, stepsTarget, data, onOpenWeek, backup, onExportBackup }) {
  const {
    dt, intake, steps, isMonday, isToday,
    computedKcal, macroDelta, showMacroWarning, showUndereatAlert,
  } = useDayMetrics(dateKey, day, targets, data?.phases);
  const status = useVibeStatus(data, targets);
  const { phase, trainingSuspended } = usePhase(data, dateKey);

  return (
    <div style={{ padding: '14px 14px 100px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {isToday && <StatusBand status={status} onOpenWeek={onOpenWeek} />}
      {isToday && backup?.overdue && <BackupReminderCard status={backup} onExport={onExportBackup} />}
      <BalanceCard intake={intake} target={dt.kcal} />
      <MacrosCard
        day={day}
        dt={dt}
        intake={intake}
        computedKcal={computedKcal}
        macroDelta={macroDelta}
        showMacroWarning={showMacroWarning}
      />
      <IntakeCard day={day} updateDay={updateDay} intake={intake} showUndereatAlert={showUndereatAlert} />
      <ExpenditureCard day={day} updateDay={updateDay} steps={steps} stepsTarget={stepsTarget} showHeavyWork={!trainingSuspended} derivedStepsSource={deviceAt(dateKey, data?.devices ?? [])} />
      {trainingSuspended
        ? <PhaseRestCard label={phase.label ?? phase.type} stepsTarget={stepsTarget} />
        : <WorkoutCard day={day} updateDay={updateDay} />}
      <InfoActivitiesCard activities={day.infoActivities} />
      <WeightCard day={day} updateDay={updateDay} scaleResolutionKg={data?.scaleResolutionKg} />
      {(isMonday || day.waist) && <WaistCard day={day} updateDay={updateDay} isMonday={isMonday} />}
      {deviceAt(dateKey, data?.devices ?? []) === 'apple_watch' && <AppleEntryGuide />}
      <SleepCard day={day} updateDay={updateDay} />
      <NotesCard day={day} updateDay={updateDay} />
    </div>
  );
}
