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
      {/* Chaque ligne du bilan devient une tuile : valeur en gros, note dessous. */}
      <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
        {lines.map(({ label, value, note }) => (
          <div key={label} style={{ background: PALETTE.bg, borderRadius: 16, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 3 }}>
            <dt className="vf-display" style={{ fontSize: 9, color: PALETTE.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</dt>
            <dd className="vf-hero vf-tabular" style={{ margin: 0, fontSize: 18, color: PALETTE.ink, textTransform: 'none' }}>{value}</dd>
            {note && <dd style={{ margin: 0, fontSize: 10, color: PALETTE.muted }}>{note}</dd>}
          </div>
        ))}
      </dl>
      <div style={{ marginTop: 10, padding: '12px 14px', borderRadius: 16, background: PALETTE.deepSoft }}>
        <div className="vf-display" style={{ fontSize: 10, color: PALETTE.deep, letterSpacing: '0.12em', marginBottom: 4 }}>
          UNE ACTION
        </div>
        <div className="vf-body" style={{ fontSize: 13, color: PALETTE.ink, lineHeight: 1.45 }}>{action.text}</div>
      </div>
    </Card>
  );
}
