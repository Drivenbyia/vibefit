import { Activity } from 'lucide-react';
import { PALETTE } from '../../../constants/config.js';
import Card from '../../ui/Card.jsx';

export default function RecalibrateCard({ signals, delta, canRecalibrate, blockedReason, onRecalibrate }) {
  const { adaptiveTDEE, confidence, overlapDays, windowStart, windowEnd, windowAgeDays } = signals;

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Activity size={16} color={PALETTE.ink} />
        <div className="vf-body" style={{ fontSize: 13, fontWeight: 800, color: PALETTE.ink, letterSpacing: '0.04em' }}>
          TDEE MESURÉ
        </div>
      </div>

      {adaptiveTDEE === null ? (
        <div style={{ fontSize: 12, color: PALETTE.muted, lineHeight: 1.5 }}>{blockedReason}</div>
      ) : (
        <>
          <div className="vf-tabular" style={{ fontSize: 24, fontWeight: 900, color: PALETTE.ink }}>
            {adaptiveTDEE}
            <span style={{ fontSize: 12, fontWeight: 500, color: PALETTE.muted, marginLeft: 5 }}>kcal/j</span>
          </div>
          <div style={{ fontSize: 11, color: PALETTE.muted, marginTop: 3, lineHeight: 1.5 }}>
            Confiance {confidence}% · {overlapDays} j croisés · {windowStart} → {windowEnd}
            {windowAgeDays > 7 && (
              <span style={{ color: PALETTE.warn, fontWeight: 700 }}> · fenêtre vieille de {windowAgeDays} j</span>
            )}
          </div>

          {canRecalibrate ? (
            <button
              onClick={onRecalibrate}
              className="vf-body"
              style={{
                marginTop: 12, width: '100%', padding: '11px',
                background: PALETTE.ink, color: PALETTE.surface, border: 'none',
                borderRadius: 3, cursor: 'pointer',
                fontSize: 12, fontWeight: 700, letterSpacing: '0.06em',
              }}
            >
              RECALIBRER SUR MES DONNÉES ({delta > 0 ? '+' : ''}{delta} kcal)
            </button>
          ) : (
            <div style={{ marginTop: 10, fontSize: 11, color: PALETTE.muted, lineHeight: 1.5 }}>
              {blockedReason}
            </div>
          )}
        </>
      )}
    </Card>
  );
}
