import { Beef, Wheat, Droplets } from 'lucide-react';
import { PALETTE } from '../../../constants/config.js';
import Card from '../../ui/Card.jsx';
import SectionLabel from '../../ui/SectionLabel.jsx';
import MacroBar from './MacroBar.jsx';
import ProteinBadge from './ProteinBadge.jsx';
import KcalAverageRow from './KcalAverageRow.jsx';
import SleepAverageRow from './SleepAverageRow.jsx';

export default function AveragesCard({ weekly, macroTargets, sleep, proteinFloor, daysUnderProtein, daysNotLogged }) {
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
          <ProteinBadge
            daysUnder={daysUnderProtein}
            daysNotLogged={daysNotLogged}
            floor={proteinFloor}
          />
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
          <KcalAverageRow
            avgIntake={weekly.avgIntake}
            avgIntakeComparable={weekly.avgIntakeComparable}
            avgKcalTarget={weekly.avgKcalTarget}
            comparableDays={weekly.comparableDays}
          />
          <SleepAverageRow sleep={sleep} />
        </>
      )}
    </Card>
  );
}
