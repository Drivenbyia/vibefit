import { PALETTE, glow, sticker } from '../../constants/config.js';

const COLOR_MAP = { train: PALETTE.deep, off: PALETTE.slate, we: PALETTE.muted };

export default function DayTypeSwitcher({ activeType, targets, onToggle }) {
  const dt = targets[activeType];

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {['train', 'off', 'we'].map((t2) => {
        const active = activeType === t2;
        const color = COLOR_MAP[t2];
        return (
          <button
            key={t2}
            onClick={() => onToggle(t2)}
            className="vf-body"
            style={{
              flex: 1,
              padding: '8px 10px',
              minHeight: 44,
              borderRadius: 12,
              border: 'none',
              background: active ? color : 'rgba(255,255,255,0.1)',
              // Patch sérigraphié + halo : la signature « Los Santos Dusk »
              // combine l'ombre dure (sticker) et le glow — voir DESIGN.md §4.
              boxShadow: active ? `${sticker(PALETTE.bg)}, ${glow(color, 14)}` : 'none',
              color: active ? PALETTE.inkSoft : PALETTE.ink,
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: '0.08em',
              cursor: 'pointer',
              textTransform: 'uppercase',
              transition: 'all 150ms ease',
            }}
          >
            {targets[t2].label}
            {dt.kcal && active && (
              <span className="vf-mono" style={{ marginLeft: 6, opacity: 0.85, fontSize: 10 }}>
                {dt.kcal}kcal
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
