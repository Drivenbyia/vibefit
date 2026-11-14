import { Scale, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { PALETTE } from '../../../constants/config.js';
import { fmtFr } from '../../../utils/dateUtils.js';
import { fmtDec, fmtSigned } from '../../../utils/format.js';
import Card from '../../ui/Card.jsx';

/**
 * Pesées de la semaine. L'écart première → dernière pesée est donné en encre
 * NEUTRE : deux pesées brutes ne font pas une tendance (le reste de l'app
 * refuse de conclure à moins de ±300 kcal d'incertitude), et une baisse n'est
 * une bonne nouvelle qu'en sèche — ni vert, ni corail. Sous la résolution de
 * la balance, l'écart n'est pas mesurable : « stable ».
 */
export default function WeightCard({ avgWeight, weightDelta, weightSeries, scaleResolutionKg = 0.5 }) {
  const measurable = weightDelta !== null && Math.abs(weightDelta) > scaleResolutionKg + 1e-9;
  const DeltaIcon = !measurable ? Minus : weightDelta < 0 ? TrendingDown : TrendingUp;
  const deltaText = measurable
    ? `${fmtSigned(weightDelta)} kg entre la première et la dernière pesée`
    : `Stable à la résolution de ta balance (±${fmtDec(scaleResolutionKg)} kg)`;

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Scale size={16} color={PALETTE.deep} />
        <div className="vf-body" style={{ fontSize: 14, fontWeight: 700, color: PALETTE.ink, letterSpacing: '0.02em' }}>
          POIDS
        </div>
        {avgWeight !== null && (
          <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: PALETTE.ink }}>
            moy. {fmtDec(avgWeight)} kg
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
                {fmtDec(w)} kg
              </span>
            </div>
          ))}
          {weightDelta !== null && (
            <div style={{
              marginTop: 10, padding: '8px 10px', background: PALETTE.bg,
              borderRadius: 12, display: 'flex', alignItems: 'flex-start', gap: 6,
            }}>
              <DeltaIcon size={14} color={PALETTE.muted} strokeWidth={2.5} style={{ flexShrink: 0, marginTop: 2 }} />
              <span className="vf-body" style={{ fontSize: 12, color: PALETTE.muted, lineHeight: 1.45 }}>
                <strong style={{ color: PALETTE.ink }}>{deltaText}</strong>
                {' '}— pesées brutes, pas une tendance : celle-ci se lit sur plusieurs semaines (bande d’état, Cibles).
              </span>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
