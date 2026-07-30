import { PALETTE } from '../../constants/config.js';

export default function SectionLabel({ children }) {
  return (
    <div className="vf-display" style={{
      fontSize: 10,
      color: PALETTE.muted,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      marginBottom: 12,
    }}>
      {children}
    </div>
  );
}
