import { PALETTE, glow } from '../../../constants/config.js';

export default function MacroBar({ label, icon: Icon, value, target, color }) {
  const pct = target > 0 ? Math.min((value / target) * 100, 120) : 0;
  const isOver = pct > 108;
  const fillColor = isOver ? PALETTE.alert : color;

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Icon size={12} color={color} strokeWidth={2.5} />
          <span style={{ fontSize: 11, fontWeight: 700, color: PALETTE.muted, letterSpacing: '0.08em' }}>
            {label}
          </span>
        </div>
        <span style={{ fontSize: 13, fontWeight: 800, color: isOver ? PALETTE.alert : PALETTE.ink }}>
          {Math.round(value)}
          <span style={{ fontSize: 10, fontWeight: 500, color: PALETTE.muted, marginLeft: 3 }}>
            / {Math.round(target)} g
          </span>
        </span>
      </div>
      <div style={{ height: 6, background: PALETTE.surfaceRaised, borderRadius: 999, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${Math.min(pct, 100)}%`,
          background: fillColor,
          borderRadius: 999,
          boxShadow: pct > 0 ? glow(fillColor, 8) : 'none',
          transition: 'width 0.5s cubic-bezier(.4,0,.2,1)',
        }} />
      </div>
    </div>
  );
}
