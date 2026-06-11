import { Zap, Beef, Wheat, Droplets } from 'lucide-react';
import { PALETTE } from '../../../constants/config.js';
import Card from '../../ui/Card.jsx';
import SectionLabel from '../../ui/SectionLabel.jsx';
import MacroBar from './MacroBar.jsx';
import ProteinBadge from './ProteinBadge.jsx';

export default function AveragesCard({ weekly, macroTargets }) {
  return (
    <Card>
      <SectionLabel>
        Moyennes / jour saisi
        {weekly.recordedDays > 0 && (
          <span style={{ color: PALETTE.accent, marginLeft: 6 }}>
            ÷ {weekly.recordedDays}
          </span>
        )}
      </SectionLabel>

      {weekly.recordedDays === 0 ? (
        <div style={{ fontSize: 13, color: PALETTE.muted, padding: '4px 0 8px' }}>
          Aucun jour saisi cette semaine.
        </div>
      ) : (
        <>
          <MacroBar
            label="Protéines"
            icon={Beef}
            value={weekly.avgProt}
            target={macroTargets.protein}
            color="#4CAF50"
          />
          {weekly.avgProt < 160 && <ProteinBadge avgProt={weekly.avgProt} />}
          <MacroBar
            label="Glucides"
            icon={Wheat}
            value={weekly.avgCarbs}
            target={macroTargets.carbs}
            color="#2196F3"
          />
          <MacroBar
            label="Lipides"
            icon={Droplets}
            value={weekly.avgFat}
            target={macroTargets.fat}
            color="#FF9800"
          />
          <div style={{
            marginTop: 12,
            paddingTop: 10,
            borderTop: `1px solid ${PALETTE.line}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Zap size={12} color={PALETTE.muted} strokeWidth={2.5} />
              <span style={{ fontSize: 11, fontWeight: 700, color: PALETTE.muted, letterSpacing: '0.08em' }}>
                KCAL MOY.
              </span>
            </div>
            <div className="vf-tabular" style={{ fontSize: 16, fontWeight: 800, color: PALETTE.ink }}>
              {Math.round(weekly.avgIntake)}
              <span style={{ fontSize: 10, fontWeight: 500, color: PALETTE.muted, marginLeft: 4 }}>
                kcal / {Math.round(weekly.avgKcalTarget)} cible
              </span>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
