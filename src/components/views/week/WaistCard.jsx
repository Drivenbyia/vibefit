import { Ruler } from 'lucide-react';
import { PALETTE } from '../../../constants/config.js';
import { fmtFr } from '../../../utils/dateUtils.js';
import Card from '../../ui/Card.jsx';

export default function WaistCard({ waistSeries }) {
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Ruler size={16} color={PALETTE.deep} />
        <div className="vf-body" style={{ fontSize: 14, fontWeight: 700, color: PALETTE.ink, letterSpacing: '0.02em' }}>
          TOUR DE TAILLE
        </div>
      </div>
      {waistSeries.length === 0 ? (
        <div style={{ fontSize: 13, color: PALETTE.muted, padding: '4px 0' }}>
          Aucune mesure cette semaine. Mesure-toi le lundi à jeun.
        </div>
      ) : (
        waistSeries.map(({ key, w }) => (
          <div key={key} style={{
            display: 'flex', justifyContent: 'space-between',
            padding: '8px 0', borderBottom: `1px solid ${PALETTE.line}`,
          }}>
            <span className="vf-body" style={{ fontSize: 13, color: PALETTE.muted, textTransform: 'capitalize' }}>
              {fmtFr(key)}
            </span>
            <span className="vf-mono vf-tabular" style={{ fontSize: 14, fontWeight: 700, color: PALETTE.ink }}>
              {w} cm
            </span>
          </div>
        ))
      )}
    </Card>
  );
}
