import { PALETTE } from '../../../constants/config.js';

const Chip = ({ color, children }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
    <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
    {children}
  </span>
);

/** Légende des barres d'écart et de la période non suivie. */
export default function LongTrendLegend() {
  return (
    <div className="vf-body" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 8, fontSize: 10, color: PALETTE.muted }}>
      <Chip color={PALETTE.alert}>au-dessus (haut)</Chip>
      <Chip color={PALETTE.deep}>±100 kcal/j</Chip>
      <Chip color={PALETTE.warn}>en dessous (bas)</Chip>
      <Chip color={PALETTE.line}>période non suivie</Chip>
    </div>
  );
}
