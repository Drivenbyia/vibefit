import { memo } from 'react';
import { PALETTE } from '../../../constants/config.js';
import { ringProgress } from '../../../utils/quickEntry.js';
import { fmtInt } from '../../../utils/format.js';

const RADII = [60, 43, 26];
const STROKE = 14;

/**
 * Trois anneaux concentriques — apport, protéines, pas — lus d'un coup d'œil.
 * La couleur distingue la NATURE de la mesure (rampe catégorielle) ; l'écart à
 * la cible est écrit à côté, en chiffres. Un appui ouvre la saisie rapide de
 * la mesure. Sans cible (week-end) l'anneau reste vide et le dit.
 */
function ActivityRings({ rings, onPick }) {
  return (
    <div className="vf-rise" style={{ background: PALETTE.surface, border: `1px solid ${PALETTE.line}`, borderRadius: 24, padding: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
      <svg viewBox="0 0 140 140" width="132" height="132" role="img" aria-label={rings.map((r) => `${r.label} ${fmtInt(r.value)} sur ${r.target ? fmtInt(r.target) : 'aucune cible'}`).join(', ')} style={{ flexShrink: 0, transform: 'rotate(-90deg)' }}>
        {rings.map((r, i) => {
          const p = ringProgress(r.value, r.target) ?? 0;
          return (
            <g key={r.id}>
              <circle cx="70" cy="70" r={RADII[i]} fill="none" stroke={`${r.color}2E`} strokeWidth={STROKE} />
              {p > 0 && (
                <circle
                  className="vf-ring" cx="70" cy="70" r={RADII[i]} fill="none" stroke={r.color} strokeWidth={STROKE}
                  strokeLinecap="round" pathLength="100" strokeDasharray="100" strokeDashoffset={100 - p * 100}
                  style={{ animationDelay: `${i * 0.15}s`, filter: `drop-shadow(0 0 5px ${r.color}88)` }}
                />
              )}
            </g>
          );
        })}
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, flex: 1 }}>
        {rings.map((r) => (
          <button key={r.id} type="button" onClick={() => onPick(r.id)} className="vf-press" aria-label={`Saisir ${r.label.toLowerCase()}`}
            style={{ background: 'transparent', border: 'none', padding: '2px 0', textAlign: 'left', cursor: 'pointer', color: PALETTE.ink, minHeight: 44 }}>
            <div className="vf-display" style={{ fontSize: 10, letterSpacing: '0.1em', color: r.color }}>{r.label.toUpperCase()}</div>
            <div className="vf-tabular" style={{ lineHeight: 1.05 }}>
              <span className="vf-hero" style={{ fontSize: 24 }}>{r.value > 0 ? fmtInt(r.value) : '—'}</span>
              <span className="vf-body" style={{ fontSize: 12, color: PALETTE.muted }}>
                {r.target ? ` / ${fmtInt(r.target)} ${r.unit}` : ` ${r.unit} · sans cible`}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default memo(ActivityRings);
