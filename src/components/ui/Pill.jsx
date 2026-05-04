import { PALETTE } from '../../constants/config.js';

export default function Pill({ active, children, onClick, color = PALETTE.ink, bg }) {
  return (
    <button
      onClick={onClick}
      className="vf-body"
      style={{
        flex: 1,
        padding: '10px 12px',
        borderRadius: 10,
        border: `1px solid ${active ? color : PALETTE.line}`,
        background: active ? (bg || color) : 'transparent',
        color: active ? '#fff' : PALETTE.ink,
        fontWeight: 700,
        fontSize: 13,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        cursor: 'pointer',
        transition: 'all 120ms',
      }}
    >
      {children}
    </button>
  );
}
