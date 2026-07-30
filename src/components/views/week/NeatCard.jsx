import { Footprints, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { PALETTE } from '../../../constants/config.js';
import { NEAT } from '../../../utils/neatDrift.js';
import Card from '../../ui/Card.jsx';

const STYLES = {
  [NEAT.INSUFFICIENT_DATA]: { icon: Footprints, color: PALETTE.muted },
  [NEAT.SUSTAINED_DRIFT]: { icon: TrendingDown, color: PALETTE.alert },
  [NEAT.ACUTE_DROP]: { icon: TrendingDown, color: PALETTE.warn },
  [NEAT.IMPROVING]: { icon: TrendingUp, color: PALETTE.deep },
  [NEAT.STABLE]: { icon: Minus, color: PALETTE.muted },
};

export default function NeatCard({ status, label, detail, currentSteps, baselineSteps }) {
  const { icon: Icon, color } = STYLES[status] ?? STYLES[NEAT.INSUFFICIENT_DATA];
  const alert = status === NEAT.SUSTAINED_DRIFT || status === NEAT.ACUTE_DROP;

  return (
    <Card style={alert ? { background: PALETTE.warnSoft, borderColor: color } : undefined}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Icon size={16} color={color} strokeWidth={2.5} />
        <div className="vf-body" style={{ fontSize: 13, fontWeight: 800, color, letterSpacing: '0.03em' }}>
          {label}
        </div>
        {currentSteps !== null && baselineSteps !== null && (
          <div className="vf-tabular" style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: PALETTE.muted }}>
            {currentSteps.toLocaleString('fr-FR')} / {baselineSteps.toLocaleString('fr-FR')}
          </div>
        )}
      </div>
      <div style={{ fontSize: 12, color: PALETTE.ink, lineHeight: 1.5 }}>{detail}</div>
    </Card>
  );
}
