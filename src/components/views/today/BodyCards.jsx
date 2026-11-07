import { Scale, Ruler } from 'lucide-react';
import { PALETTE } from '../../../constants/config.js';
import Card from '../../ui/Card.jsx';
import NumberInput from '../../ui/NumberInput.jsx';

export function WeightCard({ day, updateDay, scaleResolutionKg = 0.5 }) {
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Scale size={16} color={PALETTE.deep} />
        <div className="vf-body" style={{ fontSize: 14, fontWeight: 700, color: PALETTE.ink, letterSpacing: '0.02em' }}>
          POIDS DU JOUR
        </div>
      </div>
      <NumberInput
        value={day.weight}
        onChange={(v) => updateDay({ weight: v })}
        placeholder="ex. 78.5"
        suffix="kg"
        step={scaleResolutionKg}
      />
    </Card>
  );
}

export function WaistCard({ day, updateDay, isMonday }) {
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Ruler size={16} color={PALETTE.deep} />
        <div className="vf-body" style={{ fontSize: 14, fontWeight: 700, color: PALETTE.ink, letterSpacing: '0.02em' }}>
          TOUR DE TAILLE
          {isMonday && (
            <span style={{ marginLeft: 8, fontSize: 11, color: PALETTE.deep, fontWeight: 600 }}>
              • Mesure du lundi
            </span>
          )}
        </div>
      </div>
      <NumberInput value={day.waist} onChange={(v) => updateDay({ waist: v })} placeholder="ex. 84.5" suffix="cm" />
    </Card>
  );
}
