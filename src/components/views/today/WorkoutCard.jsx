import { Dumbbell } from 'lucide-react';
import { PALETTE } from '../../../constants/config.js';
import Card from '../../ui/Card.jsx';
import Pill from '../../ui/Pill.jsx';

export default function WorkoutCard({ day, updateDay }) {
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Dumbbell size={16} color={PALETTE.ink} />
        <div className="vf-body" style={{ fontSize: 14, fontWeight: 700, color: PALETTE.ink, letterSpacing: '0.02em' }}>
          SÉANCE
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Pill active={day.workout === 'haut'} onClick={() => updateDay({ workout: day.workout === 'haut' ? null : 'haut' })} color={PALETTE.deep}>
          Haut
        </Pill>
        <Pill active={day.workout === 'bas'} onClick={() => updateDay({ workout: day.workout === 'bas' ? null : 'bas' })} color={PALETTE.slate} bg={PALETTE.slate}>
          Bas ★
        </Pill>
        <Pill active={day.workout === 'none'} onClick={() => updateDay({ workout: day.workout === 'none' ? null : 'none' })} color={PALETTE.muted}>
          Aucune
        </Pill>
      </div>
    </Card>
  );
}
