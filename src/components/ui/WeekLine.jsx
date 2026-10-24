import { memo } from 'react';
import { PALETTE } from '../../constants/config.js';
import { shadedRuns } from '../../utils/longTrend.js';

const W = 300;
const PAD_Y = 7;

/** Segments continus d'une série à trous : une semaine vide coupe le tracé. */
const segments = (values) => values.reduce((acc, v, i) => {
  if (v == null) return [...acc, []];
  const last = acc[acc.length - 1];
  return [...acc.slice(0, -1), [...last, i]];
}, [[]]).filter((s) => s.length > 0);

/**
 * Courbe hebdomadaire sur un axe de semaines FIXE (une colonne par semaine,
 * alignée sur les barres d'écart). Même grammaire que `Sparkline` : trait de
 * 2 px non étiré, points ronds en sous-tracés de longueur nulle (un <circle>
 * deviendrait une ellipse dans le viewBox étiré), plancher d'amplitude
 * `minSpan` pour qu'un écart minuscule ait l'air minuscule.
 *
 * `shaded` : colonnes d'une période non suivie, fond discret.
 * `selected` : point agrandi — pas de fond, qui se confondrait avec `shaded`.
 */
function WeekLine({ values, color, height = 40, minSpan = 1, selected = null, shaded = [], label }) {
  const n = values.length;
  const present = values.filter((v) => v != null);
  const cx = (i) => ((i + 0.5) / n) * W;
  const colW = W / n;
  let lo = 0;
  let hi = 1;
  if (present.length > 0) {
    lo = Math.min(...present); hi = Math.max(...present);
    if (hi - lo < minSpan) { const mid = (lo + hi) / 2; lo = mid - minSpan / 2; hi = mid + minSpan / 2; }
  }
  const sy = (v) => PAD_Y + (1 - (v - lo) / (hi - lo)) * (height - PAD_Y * 2);
  const dot = (i) => `M${cx(i).toFixed(1)} ${sy(values[i]).toFixed(1)} L${cx(i).toFixed(1)} ${sy(values[i]).toFixed(1)}`;

  return (
    <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" width="100%" height={height}
      role="img" aria-label={label} style={{ display: 'block', overflow: 'visible' }}>
      {shadedRuns(shaded).map(({ start, len }) => (
        <rect key={`s${start}`} x={start * colW} y={0} width={len * colW} height={height} fill={PALETTE.line} opacity={0.45} />
      ))}
      {segments(values).map((seg) => (
        <path key={seg[0]} d={seg.map((i, k) => `${k ? 'L' : 'M'}${cx(i).toFixed(1)} ${sy(values[i]).toFixed(1)}`).join(' ')}
          fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          vectorEffect="non-scaling-stroke" />
      ))}
      {values.map((v, i) => v != null && (
        <g key={`p${i}`}>
          <path d={dot(i)} stroke={PALETTE.surface} strokeWidth={i === selected ? 12 : 9} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <path d={dot(i)} stroke={color} strokeWidth={i === selected ? 8 : 5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </g>
      ))}
    </svg>
  );
}

export default memo(WeekLine);
