import { CalendarCheck } from 'lucide-react';
import { PALETTE } from '../../../constants/config.js';
import { useWeeklyCheckIn } from '../../../hooks/useWeeklyCheckIn.js';
import Card from '../../ui/Card.jsx';

/**
 * Bilan du dimanche — la semaine écoulée en quelques lignes, puis UNE action.
 * Lecture seule : une recalibration est proposée, jamais appliquée.
 */
export default function CheckInCard({ data, targets, stepsTarget }) {
  const { title, lines, action } = useWeeklyCheckIn(data, targets, stepsTarget);
  if (lines.length === 0) return null;
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <CalendarCheck size={16} color={PALETTE.ink} strokeWidth={2.5} />
        <div className="vf-body" style={{ fontSize: 13, fontWeight: 800, color: PALETTE.ink, letterSpacing: '0.03em' }}>
          BILAN
        </div>
        <div className="vf-mono" style={{ marginLeft: 'auto', fontSize: 10, color: PALETTE.muted }}>{title}</div>
      </div>
      <dl style={{ margin: 0 }}>
        {lines.map(({ label, value, note }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '5px 0', borderTop: `1px solid ${PALETTE.line}` }}>
            <dt className="vf-body" style={{ fontSize: 12, color: PALETTE.muted, flex: '0 0 38%' }}>{label}</dt>
            <dd className="vf-mono vf-tabular" style={{ margin: 0, fontSize: 12, color: PALETTE.ink }}>{value}</dd>
            {note && <dd style={{ margin: '0 0 0 auto', fontSize: 10, color: PALETTE.muted, textAlign: 'right' }}>{note}</dd>}
          </div>
        ))}
      </dl>
      <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 12, background: PALETTE.bg, borderLeft: `3px solid ${PALETTE.ink}` }}>
        <div className="vf-display" style={{ fontSize: 10, color: PALETTE.muted, letterSpacing: '0.12em', marginBottom: 4 }}>
          UNE ACTION
        </div>
        <div className="vf-body" style={{ fontSize: 13, color: PALETTE.ink, lineHeight: 1.45 }}>{action.text}</div>
      </div>
    </Card>
  );
}
