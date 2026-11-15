import { memo } from 'react';
import { PALETTE } from '../../../constants/config.js';
import { ddmm, fmtKg, fmtCm, fmtGap } from '../../../utils/longTrendCopy.js';

const tile = { flex: 1, minWidth: 0, background: PALETTE.bg, borderRadius: 16, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 2 };
const label = { fontSize: 9, color: PALETTE.muted, letterSpacing: '0.1em' };

/**
 * Valeurs de la semaine sélectionnée sur les graphiques, en trois tuiles.
 * Une mesure absente reste nommée (« — ») ; une semaine non suivie le dit.
 */
function LongTrendChips({ week }) {
  if (!week) return null;
  return (
    <div aria-live="polite" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div className="vf-display" style={{ ...label, color: PALETTE.ink }}>SEMAINE DU {ddmm(week.weekStart)}</div>
      {week.untracked ? (
        <div style={{ ...tile, color: PALETTE.muted, fontSize: 13 }}>Période non suivie</div>
      ) : (
        <div style={{ display: 'flex', gap: 8 }}>
          {[['POIDS', fmtKg(week.weight)], ['TAILLE', fmtCm(week.waist)], ['ÉCART KCAL/J', fmtGap(week.gapPerDay).replace(' kcal/j', '')]].map(([l, v]) => (
            <div key={l} style={tile}>
              <span className="vf-display" style={label}>{l}</span>
              <span className="vf-hero vf-tabular" style={{ fontSize: 18, textTransform: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(LongTrendChips);
