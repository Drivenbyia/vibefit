import { PALETTE } from '../../constants/config.js';

export default function StatCard({ label, value, unit, sub, colSpan = 1 }) {
  return (
    <div
      style={{
        gridColumn: colSpan === 2 ? 'span 2' : 'auto',
        background: PALETTE.surface,
        border: `1px solid ${PALETTE.line}`,
        borderRadius: 3,
        padding: 14,
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, color: PALETTE.muted, letterSpacing: '0.1em', marginBottom: 6 }}>
        {label}
      </div>
      <div className="vf-display vf-tabular" style={{ fontSize: 22, fontWeight: 900, color: PALETTE.ink, lineHeight: 1.1 }}>
        {value}
        {unit && (
          <span className="vf-body" style={{ fontSize: 11, fontWeight: 500, color: PALETTE.muted, marginLeft: 4 }}>
            {unit}
          </span>
        )}
      </div>
      {sub && <div style={{ fontSize: 11, color: PALETTE.muted, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}
