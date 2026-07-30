import { Beef, Wheat, Droplets } from 'lucide-react';
import { PALETTE } from '../../../constants/config.js';
import Card from '../../ui/Card.jsx';
import SectionLabel from '../../ui/SectionLabel.jsx';
import MacroBar from './MacroBar.jsx';
import ProteinBadge from './ProteinBadge.jsx';
import KcalAverageRow from './KcalAverageRow.jsx';
import SleepAverageRow from './SleepAverageRow.jsx';

export default function AveragesCard({ weekly, macroTargets, sleep, proteinFloor, daysUnderProtein, daysNotLogged }) {
  const hasSleep = (sleep?.nights ?? 0) > 0;

  return (
    <Card>
      <SectionLabel>
        Moyennes / jour saisi
        {weekly.recordedDays > 0 && (
          <span style={{ color: PALETTE.deep, marginLeft: 6 }}>
            ÷ {weekly.recordedDays}
          </span>
        )}
      </SectionLabel>

      {weekly.recordedDays === 0 && !hasSleep && (
        <div style={{ fontSize: 13, color: PALETTE.muted, padding: '4px 0 8px' }}>
          Aucun jour saisi cette semaine.
        </div>
      )}

      {weekly.recordedDays > 0 && (
        <>
          <MacroBar
            label="Protéines"
            icon={Beef}
            value={weekly.avgProt}
            target={macroTargets.protein}
            color={PALETTE.deep}
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
            color={PALETTE.slate}
          />
          <MacroBar
            label="Lipides"
            icon={Droplets}
            value={weekly.avgFat}
            target={macroTargets.fat}
            color={PALETTE.umber}
          />
          <KcalAverageRow
            avgIntake={weekly.avgIntake}
            avgIntakeComparable={weekly.avgIntakeComparable}
            avgKcalTarget={weekly.avgKcalTarget}
            comparableDays={weekly.comparableDays}
          />
        </>
      )}

      {/* Hors du bloc nutrition : le sommeil se saisit souvent avant le premier
          repas de la journée. Le masquer tant qu'aucune calorie n'est loggée
          reviendrait à cacher une métrique le matin même où elle est relevée. */}
      <SleepAverageRow sleep={sleep} />
    </Card>
  );
}
