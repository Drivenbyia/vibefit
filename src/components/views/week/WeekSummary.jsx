import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { PALETTE } from '../../../constants/config.js';
import { fmtFr } from '../../../utils/dateUtils.js';

export default function WeekSummary({ start, recordedDays, trackedDays = 7, netBalance }) {
  const balanceColor = netBalance < -100 ? PALETTE.deep : netBalance > 100 ? PALETTE.alert : PALETTE.muted;
  const BalanceIcon = netBalance < -100 ? TrendingDown : netBalance > 100 ? TrendingUp : Minus;

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
          SOLDE NET
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
          <BalanceIcon size={16} color={balanceColor} strokeWidth={2.5} />
          <span
            className="vf-hero vf-tabular"
            style={{ fontSize: 22, color: balanceColor }}
          >
            {netBalance >= 0 ? '+' : ''}{Math.round(netBalance)}
          </span>
          <span className="vf-body" style={{ fontSize: 11, fontWeight: 500, color: PALETTE.muted }}>
            kcal
          </span>
        </div>
      </div>
    </div>
  );
}
