import { PALETTE } from '../../../constants/config.js';

// --- Anneau lumineux (signature VibeFit — voir DESIGN.md) ---
// Un arc épais, à bouts ronds, qui GLOWE dans sa couleur d'état — le langage
// visuel d'un cadran de wearable de performance. La cible reste un repère
// propre à VibeFit (un wearable de recovery n'a pas de cible fixe, un tracker
// de macros si) : un petit marqueur lumineux sur la piste, jamais une fin de
// course. L'échelle court à 125 % de la cible pour que dépasser reste lisible.
const SCALE = 1.25;
const CX = 80;
const R = 58;
const C = 2 * Math.PI * R;
const STROKE = 14;

const polar = (angle, radius) => [CX + Math.cos(angle) * radius, CX + Math.sin(angle) * radius];
const angleAt = (frac) => frac * 2 * Math.PI - Math.PI / 2;
const [TX1, TY1] = polar(angleAt(1 / SCALE), R - STROKE / 2 - 3);
const [TX2, TY2] = polar(angleAt(1 / SCALE), R + STROKE / 2 + 3);

function ringState(intake, target) {
  if (target) {
    if (intake === 0) return { label: `${target}`, sub: 'kcal ciblé', color: PALETTE.muted };
    const delta = intake - target;
    return {
      label: (delta >= 0 ? '+' : '') + delta,
      sub: delta < 0 ? 'sous la cible' : delta > 0 ? 'au-dessus' : 'pile',
      color: delta < -100 ? PALETTE.warn : delta > 100 ? PALETTE.alert : PALETTE.deep,
    };
  }
  if (intake > 0) return { label: intake, sub: 'kcal apport', color: PALETTE.deep };
  return { label: '—', sub: 'Pas de cible', color: PALETTE.muted };
}

export default function BalanceRing({ intake, target }) {
  const frac = target > 0 ? Math.min(1, intake / (target * SCALE)) : 0;
  const { label, sub, color } = ringState(intake, target);

  return (
    <svg width="160" height="160" viewBox="0 0 160 160">
      <defs>
        <filter id="vf-ring-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* piste */}
      <circle cx={CX} cy={CX} r={R} fill="none" stroke={PALETTE.surfaceRaised} strokeWidth={STROKE} />

      {/* arc lumineux : valeur relevée */}
      {target > 0 && frac > 0 && (
        <circle
          cx={CX} cy={CX} r={R}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeDasharray={`${frac * C} ${C}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${CX} ${CX})`}
          filter="url(#vf-ring-glow)"
          style={{ transition: 'stroke-dasharray 300ms ease' }}
        />
      )}

      {/* marqueur de cible : repère lumineux, pas une fin de course */}
      {target > 0 && (
        <line x1={TX1} y1={TY1} x2={TX2} y2={TY2} stroke={PALETTE.ink} strokeWidth="3" strokeLinecap="round" />
      )}

      <text
        x={CX} y="78"
        textAnchor="middle"
        dominantBaseline="central"
        className="vf-hero vf-tabular"
        style={{ fontSize: 36, fill: PALETTE.ink }}
      >
        {label}
      </text>
      <text
        x={CX} y="102"
        textAnchor="middle"
        className="vf-display"
        /* Archivo Black est nettement plus large que le corps de texte : à
           fontSize 10 / tracking 0.12em, « SOUS LA CIBLE » (le libellé le plus
           long possible, 13 caractères) mesurait 101 px pour 92 px de passage
           libre au centre de l'anneau, et mordait sur l'arc. Dimensionné ici
           pour ce pire cas. */
        style={{ fontSize: 9, fill: color, letterSpacing: '0.05em' }}
      >
        {sub.toUpperCase()}
      </text>
    </svg>
  );
}
