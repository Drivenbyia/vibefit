import { useDayMetrics } from '../../hooks/useDayMetrics.js';
import BalanceCard from './today/BalanceCard.jsx';
import MacrosCard from './today/MacrosCard.jsx';
import IntakeCard from './today/IntakeCard.jsx';
import ExpenditureCard from './today/ExpenditureCard.jsx';
import WorkoutCard from './today/WorkoutCard.jsx';
import { WeightCard, WaistCard } from './today/BodyCards.jsx';
import NotesCard from './today/NotesCard.jsx';

export default function TodayView({ dateKey, day, updateDay, targets, stepsTarget }) {
  const {
    dt, intake, expenditure, steps, isMonday,
    computedKcal, macroDelta, showMacroWarning, showUndereatAlert,
  } = useDayMetrics(dateKey, day, targets);

  return (
    <div style={{ padding: '14px 14px 100px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <BalanceCard intake={intake} expenditure={expenditure} target={dt.kcal} />
      <MacrosCard
        day={day}
        dt={dt}
        intake={intake}
        computedKcal={computedKcal}
        macroDelta={macroDelta}
        showMacroWarning={showMacroWarning}
      />
      <IntakeCard day={day} updateDay={updateDay} intake={intake} showUndereatAlert={showUndereatAlert} />
      <ExpenditureCard day={day} updateDay={updateDay} steps={steps} stepsTarget={stepsTarget} />
      <WorkoutCard day={day} updateDay={updateDay} />
      <WeightCard day={day} updateDay={updateDay} />
      {(isMonday || day.waist) && <WaistCard day={day} updateDay={updateDay} isMonday={isMonday} />}
      <NotesCard day={day} updateDay={updateDay} />
    </div>
  );
}
