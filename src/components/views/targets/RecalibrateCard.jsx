import { Activity } from 'lucide-react';
import { PALETTE } from '../../../constants/config.js';
import Card from '../../ui/Card.jsx';
import { TDEE_CHECK } from '../../../utils/plausibility.js';
import TdeeReading from './TdeeReading.jsx';

export default function RecalibrateCard({ signals, delta, canRecalibrate, blockedReason, onRecalibrate }) {
  const {
    adaptiveTDEE, tdeeCheck, tdeeCi95, trendReadable, confidence, overlapDays,
    windowSize, windowStart, windowEnd, windowAgeDays,
  } = signals;
  const implausible = tdeeCheck?.status === TDEE_CHECK.IMPLAUSIBLE;

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Activity size={16} color={PALETTE.ink} />
        <div className="vf-body" style={{ fontSize: 13, fontWeight: 800, color: PALETTE.ink, letterSpacing: '0.04em' }}>
          TDEE MESURÉ
        </div>
      </div>

      {implausible ? (
        // Le statut prime sur la complétude et la précision : ni chiffre, ni pourcentage.
        <div role="status" style={{ fontSize: 12, color: PALETTE.warn, fontWeight: 700, lineHeight: 1.5 }}>
          {blockedReason}
        </div>
      ) : adaptiveTDEE === null ? (
        <div style={{ fontSize: 12, color: PALETTE.muted, lineHeight: 1.5 }}>{blockedReason}</div>
      ) : (
        <>
          <TdeeReading
            tdee={adaptiveTDEE}
            ci95={tdeeCi95}
            checkStatus={tdeeCheck?.status}
            readable={trendReadable}
            completeness={confidence}
            overlapDays={overlapDays}
            windowSize={windowSize}
            windowStart={windowStart}
            windowEnd={windowEnd}
            windowAgeDays={windowAgeDays}
          />

          {canRecalibrate ? (
            <button
              onClick={onRecalibrate}
              className="vf-body"
              style={{
                marginTop: 12, width: '100%', padding: '11px',
                background: PALETTE.ink, color: PALETTE.inkSoft, border: 'none',
                borderRadius: 12, cursor: 'pointer',
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
