import { PALETTE } from '../../constants/config.js';

const COLOR_MAP = { train: PALETTE.deep, off: PALETTE.accent, we: '#888' };

export default function DayTypeSwitcher({ activeType, targets, onToggle }) {
  const dt = targets[activeType];

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {['train', 'off', 'we'].map((t2) => {
        const active = activeType === t2;
        return (
          <button
            key={t2}
            onClick={() => onToggle(t2)}
            className="vf-body"
            style={{
              flex: 1,
              padding: '8px 10px',
              borderRadius: 8,
              border: 'none',
              background: active ? COLOR_MAP[t2] : 'rgba(255,255,255,0.08)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: '0.08em',
              cursor: 'pointer',
              textTransform: 'uppercase',
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
