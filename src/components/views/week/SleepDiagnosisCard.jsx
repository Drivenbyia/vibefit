import { Moon, HeartPulse, TrendingUp, Minus } from 'lucide-react';
import { PALETTE } from '../../../constants/config.js';
import { SLEEP, fmtDuration } from '../../../utils/sleepDiagnosis.js';
import Card from '../../ui/Card.jsx';

const STYLES = {
  [SLEEP.INSUFFICIENT_DATA]: { icon: Moon, color: PALETTE.muted },
  [SLEEP.STRAIN]: { icon: HeartPulse, color: PALETTE.alert },
  [SLEEP.DEBT]: { icon: Moon, color: PALETTE.warn },
  [SLEEP.IMPROVING]: { icon: TrendingUp, color: PALETTE.deep },
  [SLEEP.STABLE]: { icon: Minus, color: PALETTE.muted },
};

/**
 * Contrepartie de la bande d'état pour le sommeil — même contrat que
 * `NeatCard` et `DiagnosisCard` : la bande publie la conclusion, l'onglet
 * Semaine porte le détail vers lequel elle renvoie.
 */
export default function SleepDiagnosisCard({ status, label, detail, avgDurationMin }) {
  const { icon: Icon, color } = STYLES[status] ?? STYLES[SLEEP.INSUFFICIENT_DATA];
  const alert = status === SLEEP.STRAIN || status === SLEEP.DEBT;

  return (
    <Card style={alert ? { background: PALETTE.warnSoft, borderColor: color } : undefined}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Icon size={16} color={color} strokeWidth={2.5} />
        <div className="vf-body" style={{ fontSize: 13, fontWeight: 800, color, letterSpacing: '0.03em' }}>
          {label}
        </div>
        {avgDurationMin != null && (
          <div className="vf-tabular" style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: PALETTE.muted }}>
            {fmtDuration(avgDurationMin)}
          </div>
        )}
      </div>
      <div style={{ fontSize: 12, color: PALETTE.ink, lineHeight: 1.5 }}>{detail}</div>
    </Card>
  );
}
