import { PALETTE } from '../../constants/config.js';
import { useTargetsManager } from '../../hooks/useTargetsManager.js';
import PresetPickerCard from './targets/PresetPickerCard.jsx';
import StepsCard from './targets/StepsCard.jsx';
import TargetEditor from './targets/TargetEditor.jsx';
import { ResetCard, HelpCard } from './targets/FooterCards.jsx';

export default function TargetsView({ data, setData }) {
  const { targets, stepsTarget, presetId, baseTDEE } = data;
  const { savedFlash, setStepsTarget, applyPreset, resetDefaults, updateField } =
    useTargetsManager(data, setData);

  return (
    <div style={{ padding: '14px 14px 100px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <PresetPickerCard
        presetId={presetId}
        baseTDEE={baseTDEE}
        savedFlash={savedFlash}
        onApplyPreset={applyPreset}
      />
      <StepsCard stepsTarget={stepsTarget} onChange={setStepsTarget} />
      <TargetEditor
        title="JOUR D'ENTRAÎNEMENT"
        subtitle="Lundi · Mercredi · Vendredi"
        accent={PALETTE.deep}
        target={targets.train}
        onChange={(field, val) => updateField('train', field, val)}
      />
      <TargetEditor
        title="JOUR DE REPOS"
        subtitle="Mardi · Jeudi"
        accent={PALETTE.accent}
        target={targets.off}
        onChange={(field, val) => updateField('off', field, val)}
      />
      <TargetEditor
        title="WEEK-END"
        subtitle="Samedi · Dimanche · Laisse vide pour 'pas de cible'"
        accent={PALETTE.muted}
        target={targets.we}
        onChange={(field, val) => updateField('we', field, val)}
        allowEmpty
      />
      <ResetCard onReset={resetDefaults} />
      <HelpCard />
    </div>
  );
}
