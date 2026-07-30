import { Moon } from 'lucide-react';
import { PALETTE } from '../../../constants/config.js';

/** Moyennes de sommeil de la semaine — descriptif, aucun seuil ni jugement. */
export default function SleepAverageRow({ sleep }) {
  if (!sleep || sleep.nights === 0) return null;

  const parts = [];
  if (sleep.durationMin !== null) {
    const t = Math.round(sleep.durationMin);
    parts.push(`${Math.floor(t / 60)}h${String(t % 60).padStart(2, '0')}`);
  }
  if (sleep.score !== null) parts.push(`score ${Math.round(sleep.score)}`);
  if (sleep.hrv !== null) parts.push(`VFC ${Math.round(sleep.hrv)} ms`);

  return (
    <div style={{
      marginTop: 10,
      paddingTop: 10,
      borderTop: `1px solid ${PALETTE.line}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <Moon size={12} color={PALETTE.muted} strokeWidth={2.5} />
        <span style={{ fontSize: 11, fontWeight: 700, color: PALETTE.muted, letterSpacing: '0.08em' }}>
          SOMMEIL
        </span>
      </div>
      <div className="vf-tabular" style={{ fontSize: 12, fontWeight: 700, color: PALETTE.ink, textAlign: 'right' }}>
        {parts.join(' · ')}
        <div style={{ fontSize: 10, fontWeight: 500, color: PALETTE.muted, marginTop: 1 }}>
          {sleep.nights} nuit{sleep.nights > 1 ? 's' : ''} renseignée{sleep.nights > 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
}
