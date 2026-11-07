import { PALETTE } from '../../constants/config.js';
import { useTargetsManager } from '../../hooks/useTargetsManager.js';
import { useAdaptiveTargets } from '../../hooks/useAdaptiveTargets.js';
import { useProfileManager } from '../../hooks/useProfileManager.js';
import { macroConflictKcal, computeSingleTarget } from '../../utils/presetUtils.js';
import { usePhaseManager } from '../../hooks/usePhase.js';
import PhaseCard from './targets/PhaseCard.jsx';
import PresetPickerCard from './targets/PresetPickerCard.jsx';
import RecalibrateCard from './targets/RecalibrateCard.jsx';
import StepsCard from './targets/StepsCard.jsx';
import ProfileCard from './targets/ProfileCard.jsx';
import TargetEditor from './targets/TargetEditor.jsx';
import { ResetCard, HelpCard } from './targets/FooterCards.jsx';

export default function TargetsView({ data, setData }) {
  const { targets, stepsTarget, presetId, baseTDEE } = data;
  const { savedFlash, setStepsTarget, applyPreset, resetDefaults, updateField } =
    useTargetsManager(data, setData);
  const { signals, canRecalibrate, delta, blockedReason, recalibrate } =
    useAdaptiveTargets(data, setData);
  const { profile, setField: setProfileField, bmr, minKcal, lowKcal } =
    useProfileManager(data, setData, signals.smoothedWeight);
  const { phase, canClose, closePhase, setPlannedEnd } = usePhaseManager(data, setData);
  const suspended = phase ? ' · suspendu pendant la phase' : '';

  return (
    <div style={{ padding: '14px 14px 100px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {phase && (
        <PhaseCard
          phase={phase}
          single={computeSingleTarget(presetId, baseTDEE, targets)}
          canClose={canClose}
          onClose={closePhase}
          onPlannedEndChange={setPlannedEnd}
        />
      )}
      <PresetPickerCard
        presetId={presetId}
        baseTDEE={baseTDEE}
        cycling={!phase}
        savedFlash={savedFlash}
        onApplyPreset={applyPreset}
      />
      <RecalibrateCard
        signals={signals}
        delta={delta}
        canRecalibrate={canRecalibrate}
        blockedReason={blockedReason}
        onRecalibrate={recalibrate}
      />
      <ProfileCard
        sex={profile.sex}
        birthYear={profile.birthYear}
        heightCm={profile.heightCm}
        bmr={bmr}
        minKcal={minKcal}
        lowKcal={lowKcal}
        onFieldChange={setProfileField}
      />
      <StepsCard stepsTarget={stepsTarget} onChange={setStepsTarget} />
      <TargetEditor
        title="JOUR D'ENTRAÎNEMENT"
        subtitle={`Lundi · Mercredi · Vendredi${suspended}`}
        accent={PALETTE.deep}
        target={targets.train}
        conflictKcal={macroConflictKcal(targets.train)}
        onChange={(field, val) => updateField('train', field, val)}
      />
      <TargetEditor
        title="JOUR DE REPOS"
        subtitle={`Mardi · Jeudi${suspended}`}
        accent={PALETTE.deep}
        target={targets.off}
        conflictKcal={macroConflictKcal(targets.off)}
        onChange={(field, val) => updateField('off', field, val)}
      />
      <TargetEditor
        title="WEEK-END"
        subtitle={`Samedi · Dimanche · Laisse vide pour 'pas de cible'${suspended}`}
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
