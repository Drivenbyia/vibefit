import { PALETTE } from '../../constants/config.js';

export default function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 10,
      fontWeight: 700,
      color: PALETTE.muted,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      marginBottom: 12,
    }}>
      {children}
    </div>
  );
}
