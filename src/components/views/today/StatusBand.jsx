import { Activity, ChevronRight } from 'lucide-react';
import { PALETTE } from '../../../constants/config.js';
import { TONE } from '../../../utils/vibeStatus.js';
import { TONES, ICONS } from './statusBandTheme.js';
import StatusTrend from './StatusTrend.jsx';

/**
 * Bande d'état du jour — le verdict de `WeekView` remonté au-dessus de la
 * saisie, sans coûter de navigation. Un tap ouvre le détail complet.
 */
export default function StatusBand({ status, onOpenWeek }) {
  if (!status) return null;

  const { color, bg, line } = TONES[status.tone] ?? TONES[TONE.IDLE];
  const Icon = ICONS[status.kind] ?? Activity;
  const isIdle = status.tone === TONE.IDLE;
  const { trend } = status;

  return (
    <button
      type="button"
      onClick={onOpenWeek}
      className="vf-fadein"
      aria-label={`${status.headline} — ouvrir le bilan de la semaine`}
      style={{
        width: '100%', minHeight: 44, textAlign: 'left', cursor: 'pointer',
        background: bg,
        border: `1px solid ${isIdle ? PALETTE.line : color}`,
        borderRadius: 16,
        padding: '12px 14px',
        display: 'flex', flexDirection: 'column', gap: 6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon
          size={16}
          color={color}
          strokeWidth={2.5}
          style={{ flexShrink: 0, filter: isIdle ? 'none' : `drop-shadow(0 0 6px ${color}99)` }}
        />
        {/* Pas de fontWeight sur .vf-display — Archivo Black n'a qu'une graisse
            réelle, un style inline produirait un faux gras (DESIGN.md §2). */}
        <div className="vf-display" style={{ fontSize: 12, color, textTransform: 'uppercase' }}>
          {status.headline}
        </div>
        <ChevronRight size={16} color={PALETTE.muted} style={{ marginLeft: 'auto', flexShrink: 0 }} />
      </div>

      {status.detail && (
        <div className="vf-body" style={{ fontSize: 12, color: PALETTE.ink, lineHeight: 1.45 }}>
          {status.detail}
        </div>
      )}

      {trend && <StatusTrend trend={trend} line={line} />}

      {/* Ligne de mesure à 10px, sans letter-spacing : à 11px elle fait 316 px,
          ce qui tient à 390 px de large mais s'orpheline dès 360 px (Galaxy S),
          où la bande gagne alors une ligne au-dessus de la saisie. */}
      {status.readout && (
        <div className="vf-mono vf-tabular" style={{ fontSize: 10, color: PALETTE.muted }}>
          {status.readout}
        </div>
      )}
    </button>
  );
}
