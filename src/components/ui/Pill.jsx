import { PALETTE, glow, sticker } from '../../constants/config.js';

export default function Pill({ active, children, onClick, color = PALETTE.deep, bg }) {
  return (
    <button
      onClick={onClick}
      className="vf-body"
      style={{
        flex: 1,
        minHeight: 44, // cible tactile — voir DESIGN.md
        padding: '10px 12px',
        borderRadius: 999,
        border: 'none',
        background: active ? (bg || color) : PALETTE.surfaceRaised,
        boxShadow: active ? `${sticker(PALETTE.bg, 3)}, ${glow(color, 14)}` : 'none',
        color: active ? PALETTE.inkSoft : PALETTE.ink,
        fontWeight: 700,
        fontSize: 13,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        cursor: 'pointer',
        transition: 'all 150ms ease',
      }}
    >
      {children}
    </button>
  );
}
