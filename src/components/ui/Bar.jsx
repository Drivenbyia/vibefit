import { PALETTE } from '../../constants/config.js';

export default function Bar({ value, target, color, label, unit = 'g' }) {
  const pct = target ? Math.min(120, Math.round((value / target) * 100)) : 0;
  const over = target && value > target * 1.05;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: PALETTE.muted, letterSpacing: '0.06em' }}>
          {label}
        </span>
        <span className="vf-mono vf-tabular" style={{ fontSize: 12, color: PALETTE.ink }}>
          <strong>{Math.round(value)}</strong>
          {target ? (
            <span style={{ color: PALETTE.muted }}> / {target}{unit}</span>
          ) : (
            <span style={{ color: PALETTE.muted }}>{unit}</span>
          )}
        </span>
      </div>
      <div style={{ height: 8, background: PALETTE.paper, borderRadius: 99, overflow: 'hidden', border: `1px solid ${PALETTE.line}` }}>
        <div
          style={{
            height: '100%',
            width: `${Math.min(100, pct)}%`,
            background: over ? PALETTE.accent : color,
            borderRadius: 99,
            transition: 'width 200ms ease',
          }}
        />
      </div>
    </div>
  );
}
