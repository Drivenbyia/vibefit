import { PALETTE } from '../../../constants/config.js';
import { weeklyReminderCopy } from '../../../utils/reminderUtils.js';
import Card from '../../ui/Card.jsx';

export default function ReminderCard({ presetId, netBalance, recordedDays }) {
  const copy = weeklyReminderCopy(presetId, netBalance, recordedDays);

  return (
    <Card style={{ background: PALETTE.deepSoft, borderColor: PALETTE.deep }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flexShrink: 0, width: 4, alignSelf: 'stretch', background: PALETTE.deep, borderRadius: 3 }} />
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: PALETTE.deep, letterSpacing: '0.04em', marginBottom: 6, textTransform: 'uppercase' }}>
            Rappel hebdo
          </div>
          <div style={{ fontSize: 13, color: PALETTE.ink, lineHeight: 1.5 }}>
            Le solde ({Math.round(netBalance)} kcal) est fiable <strong>uniquement si tu saisis les calories
            TOTALES Garmin</strong> (BMR + actif), pas juste les calories de séance.
            {' '}{copy.goal}
            {copy.hint}
          </div>
        </div>
      </div>
    </Card>
  );
}
