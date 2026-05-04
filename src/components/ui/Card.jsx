import { PALETTE } from '../../constants/config.js';

export default function Card({ children, style = {}, className = '' }) {
  return (
    <div
      className={`vf-fadein ${className}`}
      style={{
        background: PALETTE.surface,
        border: `1px solid ${PALETTE.line}`,
        borderRadius: 14,
        padding: 16,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
