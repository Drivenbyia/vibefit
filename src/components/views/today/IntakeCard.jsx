import { Flame, AlertCircle } from 'lucide-react';
import { PALETTE } from '../../../constants/config.js';
import Card from '../../ui/Card.jsx';
import NumberInput from '../../ui/NumberInput.jsx';
import Label from '../../ui/Label.jsx';

export default function IntakeCard({ day, updateDay, intake, showUndereatAlert }) {
  const setIntake = (field) => (v) => updateDay({ intake: { ...day.intake, [field]: v } });

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Flame size={16} color={PALETTE.deep} />
        <div className="vf-body" style={{ fontSize: 14, fontWeight: 700, color: PALETTE.ink, letterSpacing: '0.02em' }}>
          APPORT — depuis FatSecret
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ gridColumn: 'span 2' }}>
          <Label>Calories totales</Label>
          <NumberInput value={day.intake.kcal} onChange={setIntake('kcal')} placeholder="0" suffix="kcal" />
        </div>
        <div>
          <Label>Protéines</Label>
          <NumberInput value={day.intake.protein} onChange={setIntake('protein')} placeholder="0" suffix="g" />
        </div>
        <div>
          <Label>Glucides</Label>
          <NumberInput value={day.intake.carbs} onChange={setIntake('carbs')} placeholder="0" suffix="g" />
        </div>
        <div style={{ gridColumn: 'span 2' }}>
          <Label>Lipides</Label>
          <NumberInput value={day.intake.fat} onChange={setIntake('fat')} placeholder="0" suffix="g" />
        </div>
      </div>
      {showUndereatAlert && (
        <div style={{
          marginTop: 10, padding: '10px 12px', background: PALETTE.alertSoft,
          borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 12, color: PALETTE.alert, border: `1px solid ${PALETTE.alert}`,
        }}>
          <AlertCircle size={14} />
          <span>
            <strong>Sous-alimentation critique</strong> — {intake} kcal saisis, minimum recommandé 1 600 kcal.
          </span>
        </div>
      )}
    </Card>
  );
}
