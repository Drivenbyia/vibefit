import { PALETTE } from '../../constants/config.js';

export default function Card({ children, style = {}, className = '' }) {
  return (
    <div
      className={`vf-rise ${className}`}
      style={{
        background: PALETTE.surface,
        border: 'none',
        borderRadius: 24,
        padding: 16,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
