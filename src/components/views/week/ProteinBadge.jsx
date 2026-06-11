import { PALETTE } from '../../../constants/config.js';

export default function ProteinBadge({ avgProt }) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '3px 8px',
      marginBottom: 6,
      background: '#FEF3C7',
      border: `1px solid ${PALETTE.warn}`,
      borderRadius: 999,
      fontSize: 10,
      fontWeight: 700,
      color: PALETTE.warn,
      letterSpacing: '0.06em',
    }}>
      ⚠ Protéines &lt; 160 g ({Math.round(avgProt)} g moy.)
    </div>
  );
}
