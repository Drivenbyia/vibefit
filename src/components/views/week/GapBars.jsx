import { memo } from 'react';
import { PALETTE } from '../../../constants/config.js';
import { GAP_ON_TARGET_KCAL, gapStatus, shadedRuns } from '../../../utils/longTrend.js';

const HALF = 28;          // px de chaque côté du zéro
const SCALE_FLOOR = 400;  // kcal/j : un écart de 50 ne doit pas remplir la hauteur

const COLORS = { in: PALETTE.deep, over: PALETTE.alert, under: PALETTE.warn };

/**
 * Écart apport − cible, une barre par semaine, de part et d'autre du zéro.
 *
 * La POSITION porte le sens (au-dessus = surplus, en dessous = manque, dans
 * la bande = ±100 kcal/j) : vert et or ne se distinguent pas en protanopie
 * (ΔE 2,7, validateur dataviz), la couleur ne fait que renforcer. Un manque
 * est `warn`, un surplus `alert` (DESIGN.md).
 */
function GapBars({ values, selected = null, shaded = [] }) {
  const max = Math.max(SCALE_FLOOR, ...values.filter((v) => v != null).map(Math.abs));
  const px = (v) => Math.max(2, (Math.abs(v) / max) * HALF);
  const band = (GAP_ON_TARGET_KCAL / max) * HALF;
  return (
    <div aria-hidden="true" style={{ position: 'relative', height: HALF * 2 }}>
      {shadedRuns(shaded).map(({ start, len }) => (
        <div key={start} style={{
          position: 'absolute', top: 0, bottom: 0, background: 'rgba(61,44,64,0.45)',
          left: `${(start / values.length) * 100}%`, width: `${(len / values.length) * 100}%`,
        }} />
      ))}
      <div style={{ position: 'absolute', left: 0, right: 0, top: HALF - band, height: band * 2, background: PALETTE.deepSoft }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: HALF, height: 1, background: PALETTE.tick }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
        {values.map((v, i) => (
          <div key={i} style={{
            flex: 1, position: 'relative',
            // Sélection : trait sous la colonne, distinct du fond « non suivi ».
            boxShadow: i === selected ? `inset 0 -2px 0 ${PALETTE.ink}` : 'none',
          }}>
            {v != null && (
              <div style={{
                position: 'absolute', left: '25%', right: '25%',
                top: v > 0 ? HALF - px(v) : HALF, height: px(v),
                background: COLORS[gapStatus(v)],
                borderRadius: v > 0 ? '4px 4px 0 0' : '0 0 4px 4px',
              }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default memo(GapBars);
