import { Activity } from 'lucide-react';
import { PALETTE } from '../../../constants/config.js';
import Card from '../../ui/Card.jsx';
import NumberInput from '../../ui/NumberInput.jsx';
import Label from '../../ui/Label.jsx';
import Bar from '../../ui/Bar.jsx';

export default function ExpenditureCard({ day, updateDay, steps, stepsTarget }) {
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Activity size={16} color={PALETTE.deep} />
        <div className="vf-body" style={{ fontSize: 14, fontWeight: 700, color: PALETTE.ink, letterSpacing: '0.02em' }}>
          DÉPENSE — Garmin Connect
        </div>
      </div>
      <div style={{ fontSize: 11, color: PALETTE.muted, marginBottom: 12, lineHeight: 1.4 }}>
        Saisis les <strong>calories TOTALES</strong> de la journée (BMR + actif),
        pas juste celles de ta séance. Dans Garmin Connect : onglet <em>Aujourd'hui</em> → chiffre "Calories".
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <Label>Calories brûlées</Label>
          <NumberInput value={day.expenditure.kcal} onChange={(v) => updateDay({ expenditure: { ...day.expenditure, kcal: v } })} placeholder="0" suffix="kcal" />
        </div>
        <div>
          <Label>
            Pas <span style={{ color: PALETTE.muted, fontWeight: 500 }}>(cible {stepsTarget})</span>
          </Label>
          <NumberInput value={day.expenditure.steps} onChange={(v) => updateDay({ expenditure: { ...day.expenditure, steps: v } })} placeholder="0" />
        </div>
      </div>
      {steps > 0 && (
        <div style={{ marginTop: 10 }}>
          <Bar label="PROGRESSION DES PAS" value={steps} target={stepsTarget} color={steps >= stepsTarget ? PALETTE.deep : PALETTE.accent} unit="" />
        </div>
      )}
    </Card>
  );
}
