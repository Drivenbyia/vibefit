import { Activity } from 'lucide-react';
import { PALETTE } from '../../../constants/config.js';
import Card from '../../ui/Card.jsx';
import NumberInput from '../../ui/NumberInput.jsx';
import Label from '../../ui/Label.jsx';
import Bar from '../../ui/Bar.jsx';
import Pill from '../../ui/Pill.jsx';
import StepsSourceToggle from './StepsSourceToggle.jsx';

export default function ExpenditureCard({ day, updateDay, steps, stepsTarget, showHeavyWork = true, derivedStepsSource = null }) {
  const heavyWork = !!day.heavyWork;
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Activity size={16} color={PALETTE.deep} />
        <div className="vf-body" style={{ fontSize: 14, fontWeight: 700, color: PALETTE.ink, letterSpacing: '0.02em' }}>
          ACTIVITÉ — montre
        </div>
      </div>
      {/* Calories de la montre retirées de la saisie (2026-10-31) : elles ne
          servaient à aucun calcul. Les valeurs déjà saisies restent dans les données. */}
      <div>
        <Label>
          Pas <span style={{ color: PALETTE.muted, fontWeight: 500 }}>(cible {stepsTarget})</span>
        </Label>
        <NumberInput value={day.expenditure.steps} onChange={(v) => updateDay({ expenditure: { ...day.expenditure, steps: v } })} placeholder="0" />
      </div>
      <StepsSourceToggle
        stepsSource={day.expenditure.stepsSource ?? ''}
        derivedSource={derivedStepsSource}
        onChange={(v) => updateDay({ expenditure: { ...day.expenditure, stepsSource: v } })}
      />
      {steps > 0 && (
        <div style={{ marginTop: 10 }}>
          <Bar label="PROGRESSION DES PAS" value={steps} target={stepsTarget} color={steps >= stepsTarget ? PALETTE.deep : PALETTE.warn} unit="" />
        </div>
      )}
      {/* `umber` vient de la rampe CATÉGORIELLE : le chantier qualifie la
          nature de la journée, il n'est ni un manque (`warn`) ni un
          dépassement (`alert`). Voir DESIGN.md §1. */}
      {/* Masqué pendant une phase où l'effort est suspendu : un chantier n'y a pas lieu d'être saisi. */}
      {showHeavyWork && (<>
      <div style={{ display: 'flex', marginTop: 12 }}>
        <Pill
          active={heavyWork}
          color={PALETTE.umber}
          onClick={() => updateDay({ heavyWork: !heavyWork })}
        >
          Journée chantier
        </Pill>
      </div>
      <div style={{ fontSize: 11, color: PALETTE.muted, marginTop: 6, lineHeight: 1.4 }}>
        À marquer les jours d'effort lourd hors séance. Sert à savoir si une
        dépense mesurée est représentative — sans ça, une quinzaine chargée et
        une quinzaine calme donnent le même TDEE sans qu'on puisse les distinguer.
      </div>
      </>)}
    </Card>
  );
}
