import { PALETTE } from '../../../constants/config.js';
import { phaseReminderCopy, phaseLeversCopy, targetGapReminderCopy, weeklyReminderCopy } from '../../../utils/reminderUtils.js';
import Card from '../../ui/Card.jsx';

/**
 * Rappel hebdo.
 *   - Pendant une phase (`phase`) : leviers prioritaires d'abord (protéines,
 *     pas montre), puis la cible unique.
 *   - Hors phase : objectif du preset, écart cumulé à la cible, conséquence.
 * Plus aucune référence aux calories de la montre : elles ne pilotent rien.
 */
export default function ReminderCard({ presetId, targetGap, comparableDays, phase = null, levers = null }) {
  const phaseCopy = phase ? phaseReminderCopy(phase) : null;
  const presetCopy = phase ? null : weeklyReminderCopy(presetId, targetGap, comparableDays);
  const leverLines = phase && levers ? phaseLeversCopy(levers) : [];

  return (
    <Card style={{ background: PALETTE.deepSoft, borderColor: PALETTE.deep }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flexShrink: 0, width: 4, alignSelf: 'stretch', background: PALETTE.deep, borderRadius: 3 }} />
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: PALETTE.deep, letterSpacing: '0.04em', marginBottom: 6, textTransform: 'uppercase' }}>
            Rappel hebdo
          </div>
          {leverLines.map(({ text, under, alert }) => (
            <div
              key={text}
              style={{
                fontSize: 13, lineHeight: 1.5, marginBottom: 4,
                color: under ? PALETTE.warn : PALETTE.ink,
                fontWeight: alert ? 700 : 400,
              }}
            >
              {text}
            </div>
          ))}
          <div style={{ fontSize: 13, color: PALETTE.ink, lineHeight: 1.5, marginTop: leverLines.length ? 6 : 0 }}>
            {phaseCopy
              ? `${phaseCopy.lead}${phaseCopy.week}${phaseCopy.hint}`
              : `${presetCopy.goal} ${targetGapReminderCopy(targetGap, comparableDays)}${presetCopy.hint}`}
          </div>
        </div>
      </div>
    </Card>
  );
}
