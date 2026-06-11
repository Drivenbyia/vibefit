import { PALETTE } from '../../../constants/config.js';

function ringState(intake, target) {
  if (target) {
    if (intake === 0) return { label: `${target}`, sub: 'kcal ciblé', color: PALETTE.muted };
    const delta = intake - target;
    return {
      label: (delta >= 0 ? '+' : '') + delta,
      sub: delta < 0 ? 'sous la cible' : delta > 0 ? 'au-dessus' : 'pile',
      color: delta < -100 ? PALETTE.accent : delta > 100 ? PALETTE.warn : PALETTE.deep,
    };
  }
  if (intake > 0) return { label: intake, sub: 'kcal apport', color: PALETTE.deep };
  return { label: '—', sub: 'Pas de cible', color: PALETTE.muted };
}

export default function BalanceRing({ intake, target }) {
  const r = 70, c = 2 * Math.PI * r;
  const pctOfTarget = target ? Math.min(110, (intake / target) * 100) : 0;
  const dash = target ? (Math.min(100, pctOfTarget) / 100) * c : 0;
  const { label, sub, color } = ringState(intake, target);

  return (
    <svg width="160" height="160" viewBox="0 0 160 160">
      <circle cx="80" cy="80" r={r} fill="none" stroke={PALETTE.paper} strokeWidth="14" />
      {target > 0 && (
        <circle
          cx="80" cy="80" r={r}
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeDasharray={`${dash} ${c}`}
          strokeDashoffset={c / 4}
          transform="rotate(-90 80 80)"
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 300ms ease' }}
        />
      )}
      <text
        x="80" y="80"
        textAnchor="middle"
        dominantBaseline="central"
        className="vf-display vf-tabular"
        style={{ fontSize: 30, fontWeight: 900, fill: PALETTE.ink }}
      >
        {label}
      </text>
      <text
        x="80" y="105"
        textAnchor="middle"
        className="vf-body"
        style={{ fontSize: 10, fontWeight: 600, fill: PALETTE.muted, letterSpacing: '0.1em' }}
      >
        {sub.toUpperCase()}
      </text>
    </svg>
  );
}
