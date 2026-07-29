import { Activity, AlertTriangle, Droplet, Minus, TrendingDown } from 'lucide-react';
import { PALETTE } from '../../../constants/config.js';
import { DIAGNOSIS } from '../../../utils/plateauProtocol.js';
import Card from '../../ui/Card.jsx';

const STYLES = {
  [DIAGNOSIS.INSUFFICIENT_DATA]: { icon: Activity, color: PALETTE.muted },
  [DIAGNOSIS.LOW_ADHERENCE]: { icon: AlertTriangle, color: PALETTE.warn },
  [DIAGNOSIS.WATER_RETENTION_SUSPECTED]: { icon: Droplet, color: PALETTE.deep },
  [DIAGNOSIS.PLATEAU_CONFIRMED]: { icon: Minus, color: PALETTE.accentDark },
  [DIAGNOSIS.PROGRESSING]: { icon: TrendingDown, color: PALETTE.deep },
};

export default function DiagnosisCard({ status, label, detail, weeksEvaluated }) {
  const { icon: Icon, color } = STYLES[status] ?? STYLES[DIAGNOSIS.INSUFFICIENT_DATA];

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Icon size={16} color={color} strokeWidth={2.5} />
        <div className="vf-body" style={{ fontSize: 13, fontWeight: 800, color, letterSpacing: '0.03em' }}>
          {label}
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: PALETTE.muted, letterSpacing: '0.06em' }}>
          {weeksEvaluated} SEM.
        </div>
      </div>
      <div style={{ fontSize: 12, color: PALETTE.ink, lineHeight: 1.5 }}>{detail}</div>
    </Card>
  );
}
