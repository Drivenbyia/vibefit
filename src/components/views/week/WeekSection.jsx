import { PALETTE } from '../../../constants/config.js';

/** Intertitre de l'onglet Semaine — sépare le bilan, la semaine affichée et les tendances. */
export default function WeekSection({ children }) {
  return (
    <h2 className="vf-display" style={{
      margin: '6px 2px -4px', fontSize: 10, fontWeight: 'inherit',
      color: PALETTE.muted, letterSpacing: '0.14em', textTransform: 'uppercase',
    }}>
      {children}
    </h2>
  );
}
