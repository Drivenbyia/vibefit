import { PALETTE } from '../../constants/config.js';

export default function NumberInput({ value, onChange, placeholder, suffix, min = 0 }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        background: PALETTE.paper,
        border: `1px solid ${PALETTE.line}`,
        borderRadius: 10,
        padding: '10px 12px',
        gap: 6,
      }}
    >
      <input
        type="number"
        inputMode="decimal"
        min={min}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="vf-no-spin vf-tabular vf-body"
        style={{
          flex: 1,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          fontSize: 18,
          fontWeight: 600,
          color: PALETTE.ink,
          width: '100%',
          minWidth: 0,
        }}
      />
      {suffix && (
        <span className="vf-mono" style={{ fontSize: 12, color: PALETTE.muted }}>
          {suffix}
        </span>
      )}
    </div>
  );
}
