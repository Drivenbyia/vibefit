import { Footprints } from 'lucide-react';
import { PALETTE } from '../../../constants/config.js';
import Card from '../../ui/Card.jsx';
import NumberInput from '../../ui/NumberInput.jsx';

export default function StepsCard({ stepsTarget, onChange }) {
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Footprints size={16} color={PALETTE.deep} />
        <div className="vf-body" style={{ fontSize: 14, fontWeight: 700, color: PALETTE.ink, letterSpacing: '0.02em' }}>
          OBJECTIF DE PAS QUOTIDIEN
        </div>
      </div>
      <NumberInput value={stepsTarget} onChange={onChange} placeholder="8000" suffix="pas" />
    </Card>
  );
}
