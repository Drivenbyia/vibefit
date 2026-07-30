import { Scale, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { PALETTE } from '../../../constants/config.js';
import { fmtFr } from '../../../utils/dateUtils.js';
import Card from '../../ui/Card.jsx';

export default function WeightCard({ avgWeight, weightDelta, weightSeries }) {
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Scale size={16} color={PALETTE.deep} />
        <div className="vf-body" style={{ fontSize: 14, fontWeight: 700, color: PALETTE.ink, letterSpacing: '0.02em' }}>
          POIDS
        </div>
        {avgWeight !== null && (
          <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: PALETTE.ink }}>
            moy. {avgWeight.toFixed(1)} kg
          </span>
        )}
      </div>
      {weightSeries.length === 0 ? (
        <div style={{ fontSize: 13, color: PALETTE.muted, padding: '4px 0' }}>
          Aucune pesée cette semaine. Pèse-toi chaque matin à jeun.
        </div>
      ) : (
        <>
          {weightSeries.map(({ key, w }) => (
            <div key={key} style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '8px 0', borderBottom: `1px solid ${PALETTE.line}`,
            }}>
              <span className="vf-body" style={{ fontSize: 13, color: PALETTE.muted, textTransform: 'capitalize' }}>
                {fmtFr(key)}
              </span>
              <span className="vf-mono vf-tabular" style={{ fontSize: 14, fontWeight: 700, color: PALETTE.ink }}>
                {w.toFixed(1)} kg
              </span>
            </div>
          ))}
          {weightDelta !== null && (
            <div style={{
              marginTop: 10, padding: '8px 10px',
              background: weightDelta < 0 ? PALETTE.deepSoft : weightDelta > 0 ? PALETTE.alertSoft : PALETTE.paper,
              borderRadius: 3, display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {weightDelta < 0
                ? <TrendingDown size={14} color={PALETTE.deep} strokeWidth={2.5} />
                : weightDelta > 0
                ? <TrendingUp size={14} color={PALETTE.alert} strokeWidth={2.5} />
                : <Minus size={14} color={PALETTE.muted} strokeWidth={2.5} />}
              <span className="vf-body" style={{
                fontSize: 12, fontWeight: 700,
                color: weightDelta < 0 ? PALETTE.deep : weightDelta > 0 ? PALETTE.alert : PALETTE.muted,
              }}>
                {weightDelta >= 0 ? '+' : ''}{weightDelta.toFixed(1)} kg sur la semaine
              </span>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
