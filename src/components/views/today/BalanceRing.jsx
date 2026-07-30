import { PALETTE } from '../../../constants/config.js';

// --- LA RÈGLE GRADUÉE, refermée en cadran (voir DESIGN.md) ---
// Même échelle que Bar.jsx : 0 → 125 % de la cible, donc l'encoche de cible
// tombe à 80 % du tour. Atteindre sa cible ne « remplit » pas le cadran — il
// reste de la course au-delà, ce qui rend le dépassement lisible.
const SCALE = 1.25;
const CX = 80;
const R_RULE = 64; // la règle graduée : cercle extérieur, toujours lisible
const R_ARC = 47;  // l'arc de valeur : bande intérieure, ne recouvre pas la règle
const C = 2 * Math.PI * R_ARC;
const STEPS = 20;  // une graduation tous les 5 % de l'échelle

const polar = (angle, radius) => [CX + Math.cos(angle) * radius, CX + Math.sin(angle) * radius];
const angleAt = (frac) => frac * 2 * Math.PI - Math.PI / 2;

// Calculées une fois au chargement du module : la règle est fixe.
const TICKS = Array.from({ length: STEPS }, (_, i) => {
  const major = i % 4 === 0;
  const a = angleAt(i / STEPS);
  const [x1, y1] = polar(a, major ? R_RULE - 7 : R_RULE - 4);
  const [x2, y2] = polar(a, major ? R_RULE + 7 : R_RULE + 4);
  return { x1, y1, x2, y2, major, key: i };
});

// L'encoche de cible traverse la règle de part en part : c'est le seul cran lourd.
const [TX1, TY1] = polar(angleAt(1 / SCALE), R_RULE - 12);
const [TX2, TY2] = polar(angleAt(1 / SCALE), R_RULE + 12);

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
      {/* filet de base */}
      <circle cx={CX} cy={CX} r={R_RULE} fill="none" stroke={PALETTE.tick} strokeWidth="1" />

      {/* graduations */}
      {TICKS.map((t) => (
        <line
          key={t.key}
          x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
          stroke={PALETTE.tick}
          strokeWidth={t.major ? 1.5 : 1}
        />
      ))}

      {/* valeur relevée : arc à bout droit, jamais arrondi */}
      {target > 0 && (
        <circle
          cx={CX} cy={CX} r={R_ARC}
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeDasharray={`${frac * C} ${C}`}
          transform={`rotate(-90 ${CX} ${CX})`}
          strokeLinecap="butt"
          style={{ transition: 'stroke-dasharray 300ms ease' }}
        />
      )}

      {/* encoche de cible : le cran lourd */}
      {target > 0 && (
        <line x1={TX1} y1={TY1} x2={TX2} y2={TY2} stroke={PALETTE.ink} strokeWidth="2.5" />
      )}

      <text
        x={CX} y="78"
        textAnchor="middle"
        dominantBaseline="central"
        className="vf-display vf-tabular"
        style={{ fontSize: 30, fontWeight: 900, fill: PALETTE.ink }}
      >
        {label}
      </text>
      <text
        x={CX} y="102"
        textAnchor="middle"
        className="vf-body"
        style={{ fontSize: 10, fontWeight: 600, fill: PALETTE.muted, letterSpacing: '0.1em' }}
      >
        {sub.toUpperCase()}
      </text>
    </svg>
  );
}
