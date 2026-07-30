import { PALETTE } from '../../../constants/config.js';
import Card from '../../ui/Card.jsx';
import NumberInput from '../../ui/NumberInput.jsx';
import Label from '../../ui/Label.jsx';

export default function TargetEditor({ title, subtitle, accent, target, onChange, allowEmpty, conflictKcal = 0 }) {
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ width: 4, height: 28, background: accent, borderRadius: 0 }} />
        <div>
          <div className="vf-body" style={{ fontSize: 13, fontWeight: 800, color: PALETTE.ink, letterSpacing: '0.04em' }}>
            {title}
          </div>
          <div style={{ fontSize: 11, color: PALETTE.muted }}>{subtitle}</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ gridColumn: 'span 2' }}>
          <Label>Calories</Label>
          <NumberInput value={target.kcal ?? ''} onBlur={(v) => onChange('kcal', v)} placeholder={allowEmpty ? 'Aucune cible' : '0'} suffix="kcal" />
        </div>
        <div>
          <Label>Protéines</Label>
          <NumberInput value={target.protein ?? ''} onChange={(v) => onChange('protein', v)} placeholder={allowEmpty ? '—' : '160'} suffix="g" />
        </div>
        <div>
          <Label>Glucides</Label>
          <NumberInput value={target.carbs ?? ''} onChange={(v) => onChange('carbs', v)} placeholder={allowEmpty ? '—' : '0'} suffix="g" />
        </div>
        <div style={{ gridColumn: 'span 2' }}>
          <Label>Lipides</Label>
          <NumberInput value={target.fat ?? ''} onChange={(v) => onChange('fat', v)} placeholder={allowEmpty ? '—' : '0'} suffix="g" />
        </div>
      </div>
      {conflictKcal > 0 && (
        <div style={{
          marginTop: 10, padding: '7px 10px', borderRadius: 3,
          background: PALETTE.highlight, border: `1px solid ${PALETTE.warn}`,
          fontSize: 11, fontWeight: 600, color: PALETTE.warn, lineHeight: 1.4,
        }}>
          ⚠ Protéines + lipides dépassent la cible de {conflictKcal} kcal — les glucides
          sont à 0 et les macros ne totalisent plus la cible affichée.
        </div>
      )}
    </Card>
  );
}
