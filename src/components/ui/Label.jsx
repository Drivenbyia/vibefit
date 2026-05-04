import { PALETTE } from '../../constants/config.js';

export default function Label({ children, noMargin }) {
  return (
    <div
      className="vf-body"
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: PALETTE.muted,
        marginBottom: noMargin ? 0 : 6,
        letterSpacing: '0.04em',
      }}
    >
      {children}
    </div>
  );
}
