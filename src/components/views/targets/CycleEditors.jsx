import { PALETTE } from '../../../constants/config.js';
import { macroConflictKcal } from '../../../utils/presetUtils.js';
import TargetEditor from './TargetEditor.jsx';

/**
 * Les trois éditeurs des cibles cyclées (TRAIN / OFF / WE). Extraits de
 * `TargetsView` (règle des 80 lignes), sans changement de comportement.
 */
export default function CycleEditors({ targets, suspended, onChange }) {
  const note = suspended ? ' · suspendu pendant la phase' : '';
  return (
    <>
      <TargetEditor
        title="JOUR D'ENTRAÎNEMENT"
        subtitle={`Lundi · Mercredi · Vendredi${note}`}
        accent={PALETTE.deep}
        target={targets.train}
        conflictKcal={macroConflictKcal(targets.train)}
        onChange={(field, val) => onChange('train', field, val)}
      />
      <TargetEditor
        title="JOUR DE REPOS"
        subtitle={`Mardi · Jeudi${note}`}
        accent={PALETTE.deep}
        target={targets.off}
        conflictKcal={macroConflictKcal(targets.off)}
        onChange={(field, val) => onChange('off', field, val)}
      />
      <TargetEditor
        title="WEEK-END"
        subtitle={`Samedi · Dimanche · Laisse vide pour 'pas de cible'${note}`}
        accent={PALETTE.muted}
        target={targets.we}
        onChange={(field, val) => onChange('we', field, val)}
        allowEmpty
      />
    </>
  );
}
