import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { PALETTE } from '../../../constants/config.js';
import { fmtFr } from '../../../utils/dateUtils.js';

/**
 * En-tête de semaine. Le chiffre de droite est l'ÉCART À LA CIBLE (apport −
 * cible, jours saisis), plus le solde apport − calories montre : celles-ci ne
 * pilotent rien. Couleur par écart MOYEN par jour, ±100 kcal = dans la cible :
 * vert dans la cible, or en dessous, corail au-dessus (DESIGN.md §1).
 */
export default function WeekSummary({ start, recordedDays, trackedDays = 7, targetGap = 0, comparableDays = 0 }) {
  const perDay = comparableDays > 0 ? targetGap / comparableDays : 0;
  const balanceColor = comparableDays === 0 ? PALETTE.muted
    : perDay < -100 ? PALETTE.warn : perDay > 100 ? PALETTE.alert : PALETTE.deep;
  const BalanceIcon = perDay < -100 ? TrendingDown : perDay > 100 ? TrendingUp : Minus;

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
      <div>
        <div className="vf-display" style={{ fontSize: 10, color: PALETTE.muted, letterSpacing: '0.12em', marginBottom: 3 }}>
          SEMAINE DU
        </div>
        <div className="vf-gothic" style={{ fontSize: 21 }}>
          {fmtFr(start)}
        </div>
        <div style={{ fontSize: 11, color: PALETTE.muted, marginTop: 2 }}>
          {recordedDays} / {trackedDays} jours saisis
          {trackedDays < 7 && ' · hors période non suivie'}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="vf-display" style={{ fontSize: 10, color: PALETTE.muted, letterSpacing: '0.12em', marginBottom: 3 }}>
          ÉCART CIBLE
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
          <BalanceIcon size={16} color={balanceColor} strokeWidth={2.5} />
          <span
            className="vf-hero vf-tabular"
            style={{ fontSize: 22, color: balanceColor }}
          >
            {targetGap >= 0 ? '+' : ''}{Math.round(targetGap)}
          </span>
          <span className="vf-body" style={{ fontSize: 11, fontWeight: 500, color: PALETTE.muted }}>
            kcal
          </span>
        </div>
      </div>
    </div>
  );
}
