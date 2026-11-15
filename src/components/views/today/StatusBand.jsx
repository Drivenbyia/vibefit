import { Activity, ChevronRight } from 'lucide-react';
import { PALETTE, glow } from '../../../constants/config.js';
import { TONE } from '../../../utils/vibeStatus.js';
import { TONES, ICONS } from './statusBandTheme.js';
import StatusTrend from './StatusTrend.jsx';

/**
 * Carte d'état du jour — le verdict de `WeekView` remonté en tête, au format
 * des widgets « Pile » (DESIGN.md §3 bis) : pastille d'icône lumineuse, titre,
 * phrase, puis la tendance dans un encart. Un tap ouvre le bilan complet.
 *
 * Contrat de couleur inchangé (texte d'état sur son `*Soft`, paires AA) ; le
 * glow reste porté par la seule pastille, jamais par toute la carte.
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
      className="vf-rise vf-press"
      aria-label={`${status.headline} — ouvrir le bilan de la semaine`}
      style={{
        width: '100%', minHeight: 44, textAlign: 'left', cursor: 'pointer', color: PALETTE.ink,
        background: bg, border: 'none', borderRadius: 24, padding: 16,
        display: 'flex', flexDirection: 'column', gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{
          width: 44, height: 44, borderRadius: 22, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: PALETTE.bg, boxShadow: isIdle ? 'none' : glow(color, 14),
        }}>
          <Icon size={20} color={color} strokeWidth={2.5} aria-hidden="true" />
        </span>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0, flex: 1 }}>
          {/* Pas de fontWeight sur .vf-display (DESIGN.md §2). */}
          <span className="vf-display" style={{ fontSize: 13, color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {status.headline}
          </span>
          <span className="vf-display" style={{ fontSize: 9, color: PALETTE.muted, letterSpacing: '0.12em' }}>
            ÉTAT DE LA SEMAINE
          </span>
        </span>
        <ChevronRight size={18} color={PALETTE.muted} style={{ flexShrink: 0 }} />
      </div>

      {status.detail && (
        <div className="vf-body" style={{ fontSize: 14, color: PALETTE.ink, lineHeight: 1.45 }}>
          {status.detail}
        </div>
      )}

      {(trend || status.readout) && (
        <div style={{ background: PALETTE.bg, borderRadius: 16, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {trend && <StatusTrend trend={trend} line={line} />}
          {/* Ligne de mesure à 10 px, sans letter-spacing : doit tenir sur une
              ligne jusqu'à 360 px de large (DESIGN.md §3). */}
          {status.readout && (
            <div className="vf-mono vf-tabular" style={{ fontSize: 10, color: PALETTE.muted }}>
              {status.readout}
            </div>
          )}
        </div>
      )}
    </button>
  );
}
