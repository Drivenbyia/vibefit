import { useDayMetrics } from '../../hooks/useDayMetrics.js';
import { useVibeStatus } from '../../hooks/useVibeStatus.js';
import StatusBand from './today/StatusBand.jsx';
import BackupReminderCard from './today/BackupReminderCard.jsx';
import BalanceCard from './today/BalanceCard.jsx';
import MacrosCard from './today/MacrosCard.jsx';
import IntakeCard from './today/IntakeCard.jsx';
import AtypicalDayCard from './today/AtypicalDayCard.jsx';
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
import EntryChecklist from './today/EntryChecklist.jsx';
import { useEntryChecklist } from '../../hooks/useEntryChecklist.js';
import { useHealthImport } from '../../hooks/useHealthImport.js';
import { useTodayDashboard } from '../../hooks/useTodayDashboard.js';
import HealthImportButton from './today/HealthImportButton.jsx';
import YesterdayGap from './today/YesterdayGap.jsx';
import ActivityRings from './today/ActivityRings.jsx';
import TodayWidgets from './today/TodayWidgets.jsx';
import Fold from '../ui/Fold.jsx';
import CardStack from '../ui/CardStack.jsx';
import { PALETTE } from '../../constants/config.js';
import { TONE } from '../../utils/vibeStatus.js';
import { TONES } from './today/statusBandTheme.js';

/**
 * Aujourd'hui — direction « Pile » (DESIGN.md §3 bis) : cartes d'état en pile
 * façon Wallet, puis ce qui se lit chaque jour
 * en haut, en anneaux et widgets ; la saisie se fait au « + » (réglette, monté dans
 * App pour tous les onglets) ou
 * par l'import Santé en un appui. Les cartes de saisie complètes restent
 * intactes sous « Saisie détaillée ».
 */
export default function TodayView({ dateKey, day, updateDay, targets, stepsTarget, data, setData, onOpenWeek, backup, onExportBackup, setDateKey, onQuickEntry }) {
  const {
    dt, intake, steps, isMonday, isToday,
    computedKcal, macroDelta, showMacroWarning, showUndereatAlert,
  } = useDayMetrics(dateKey, day, targets, data?.phases);
  const status = useVibeStatus(data, targets);
  const { phase, trainingSuspended } = usePhase(data, dateKey);
  const { items, yesterday, jumpTo } = useEntryChecklist(data, dateKey, day, isToday);
  const healthImport = useHealthImport(data?.days ?? {}, setData);
  const { rings, weightSeries } = useTodayDashboard({ days: data?.days, dateKey, day, dt, stepsTarget });
  const device = deviceAt(dateKey, data?.devices ?? []);
  const statusTone = TONES[status?.tone] ?? TONES[TONE.IDLE];

  return (
    <div style={{ padding: '14px 14px 120px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <CardStack items={[
        isToday && status && { id: 'status', label: status.headline, tone: statusTone.color, toneSoft: statusTone.bg, node: <StatusBand status={status} onOpenWeek={onOpenWeek} /> },
        isToday && backup?.overdue && { id: 'backup', label: backup.never ? 'Aucune sauvegarde' : 'Sauvegarde à refaire', tone: PALETTE.warn, toneSoft: PALETTE.warnSoft, node: <BackupReminderCard status={backup} onExport={onExportBackup} /> },
        yesterday && { id: 'yesterday', label: 'Hier à compléter', tone: PALETTE.warn, toneSoft: PALETTE.warnSoft, node: <YesterdayGap yesterday={yesterday} onOpen={() => setDateKey(yesterday.key)} /> },
      ].filter(Boolean)} />
      {isToday && setData && <HealthImportButton status={healthImport.status} onImport={healthImport.importFromClipboard} />}
      <ActivityRings rings={rings} onPick={onQuickEntry} />
      <TodayWidgets day={day} dt={dt} weightSeries={weightSeries} isToday={isToday} onPick={onQuickEntry} />
      <AtypicalDayCard atypical={!!day.atypical} onToggle={() => updateDay({ atypical: !day.atypical })} />
      <Fold title="Saisie détaillée" hint={isMonday ? 'tour de taille du lundi, macros, séance, notes' : 'macros, séance, sommeil, notes'}>
        <EntryChecklist items={items} isToday={isToday} yesterday={null} onJump={jumpTo} onOpenYesterday={() => {}} />
        <BalanceCard intake={intake} target={dt.kcal} />
        <MacrosCard day={day} dt={dt} intake={intake} computedKcal={computedKcal} macroDelta={macroDelta} showMacroWarning={showMacroWarning} />
        <div id="entry-intake"><IntakeCard day={day} updateDay={updateDay} intake={intake} showUndereatAlert={showUndereatAlert} /></div>
        <div id="entry-steps"><ExpenditureCard day={day} updateDay={updateDay} steps={steps} stepsTarget={stepsTarget} showHeavyWork={!trainingSuspended} derivedStepsSource={device} /></div>
        {trainingSuspended
          ? <PhaseRestCard label={phase.label ?? phase.type} stepsTarget={stepsTarget} />
          : <WorkoutCard day={day} updateDay={updateDay} />}
        <InfoActivitiesCard activities={day.infoActivities} />
        <div id="entry-weight"><WeightCard day={day} updateDay={updateDay} scaleResolutionKg={data?.scaleResolutionKg} /></div>
        {(isMonday || day.waist) && <WaistCard day={day} updateDay={updateDay} isMonday={isMonday} />}
        {device === 'apple_watch' && <AppleEntryGuide />}
        <div id="entry-sleep"><SleepCard day={day} updateDay={updateDay} /></div>
        <NotesCard day={day} updateDay={updateDay} />
      </Fold>
    </div>
  );
}
