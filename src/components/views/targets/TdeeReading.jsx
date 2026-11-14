import { PALETTE } from '../../../constants/config.js';
import { TDEE_CHECK, LOW_LABEL } from '../../../utils/plausibility.js';
import { fmtPrecision, UNREADABLE_LABEL } from '../../../utils/trendUncertainty.js';
import { fmtDayMonth } from '../../../utils/format.js';
import TdeeRange from './TdeeRange.jsx';

const fr = (n) => Math.round(n).toLocaleString('fr-FR');

/**
 * Lecture d'un TDEE publié : « ~X kcal/j (±Y) », ses qualificatifs, et les
 * deux indicateurs séparés — Complétude (jours saisis) et Précision
 * (largeur de l'intervalle à 95 %).
 */
export default function TdeeReading({
  tdee, ci95, checkStatus, readable, completeness, overlapDays, windowSize, windowStart, windowEnd, windowAgeDays,
  baseTDEE, floorKcal,
}) {
  const warn = { fontSize: 12, fontWeight: 700, color: PALETTE.warn, marginTop: 3 };
  return (
    <>
      <div className="vf-tabular" style={{ fontSize: 24, fontWeight: 900, color: PALETTE.ink }}>
        ~{fr(tdee)}
        <span style={{ fontSize: 12, fontWeight: 500, color: PALETTE.muted, marginLeft: 5 }}>
          kcal/j{ci95 != null ? ` (±${fr(ci95)})` : ''}
        </span>
        {checkStatus === TDEE_CHECK.UNCHECKED && (
          <span style={{ fontSize: 11, fontWeight: 700, color: PALETTE.warn, marginLeft: 8 }}>non vérifié</span>
        )}
      </div>
      {readable === false && <div style={warn}>{UNREADABLE_LABEL}</div>}
      {/* « TDEE bas » ne qualifie qu'une mesure lisible : sur une fourchette de
          ±450 kcal, la zone basse est déjà dedans — deux avertissements pour
          une seule incertitude. */}
      {checkStatus === TDEE_CHECK.LOW && readable !== false && <div style={warn}>{LOW_LABEL}</div>}
      {ci95 != null && (
        <TdeeRange tdee={tdee} ci95={ci95} baseTDEE={baseTDEE} floorKcal={floorKcal} readable={readable} />
      )}
      <div style={{ fontSize: 11, color: PALETTE.muted, marginTop: 10, lineHeight: 1.5 }}>
        Complétude {completeness} % ({overlapDays} j croisés) · Précision {fmtPrecision(ci95)}
        <br />
        Fenêtre {windowSize} j · du {fmtDayMonth(windowStart)} au {fmtDayMonth(windowEnd)}
        {windowAgeDays > 7 && (
          <span style={{ color: PALETTE.warn, fontWeight: 700 }}> · vieille de {windowAgeDays} j</span>
        )}
      </div>
    </>
  );
}
