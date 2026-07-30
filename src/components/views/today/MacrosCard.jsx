import { AlertCircle } from 'lucide-react';
import { PALETTE } from '../../../constants/config.js';
import { num } from '../../../utils/mathUtils.js';
import Card from '../../ui/Card.jsx';
import Bar from '../../ui/Bar.jsx';

export default function MacrosCard({ day, dt, intake, computedKcal, macroDelta, showMacroWarning }) {
  return (
    <Card>
      <div className="vf-display" style={{ fontSize: 11, color: PALETTE.muted, letterSpacing: '0.1em', marginBottom: 12 }}>
        MACRONUTRIMENTS
      </div>
      <Bar label="PROTÉINES" value={num(day.intake.protein)} target={dt.protein} color={PALETTE.deep} />
      <Bar label="GLUCIDES" value={num(day.intake.carbs)} target={dt.carbs} color={PALETTE.slate} />
      <Bar label="LIPIDES" value={num(day.intake.fat)} target={dt.fat} color={PALETTE.umber} />
      {showMacroWarning && (
        <div style={{
          marginTop: 8, padding: '8px 10px', background: PALETTE.alertSoft,
          borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 12, color: PALETTE.alert,
        }}>
          <AlertCircle size={14} />
          <span>
            Macros calculent <strong>{Math.round(computedKcal)} kcal</strong>
            {' '}mais tu as saisi <strong>{intake}</strong>. Écart {Math.round(macroDelta)}.
          </span>
        </div>
      )}
    </Card>
  );
}
