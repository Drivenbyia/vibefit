import { useTargetsManager } from '../../hooks/useTargetsManager.js';
import { useAdaptiveTargets } from '../../hooks/useAdaptiveTargets.js';
import { useProfileManager } from '../../hooks/useProfileManager.js';
import { computeSingleTarget } from '../../utils/presetUtils.js';
import { usePhaseManager } from '../../hooks/usePhase.js';
import PhaseCard from './targets/PhaseCard.jsx';
import PresetPickerCard from './targets/PresetPickerCard.jsx';
import RecalibrateCard from './targets/RecalibrateCard.jsx';
import StepsCard from './targets/StepsCard.jsx';
import ProfileCard from './targets/ProfileCard.jsx';
import ScaleCard from './targets/ScaleCard.jsx';
import CycleEditors from './targets/CycleEditors.jsx';
import { ResetCard, HelpCard } from './targets/FooterCards.jsx';
import Fold from '../ui/Fold.jsx';
import { fmtDec } from '../../utils/format.js';
import TargetsWidgets from './targets/TargetsWidgets.jsx';

export default function TargetsView({ data, setData }) {
  const { targets, stepsTarget, presetId, baseTDEE } = data;
  const { savedFlash, setStepsTarget, applyPreset, resetDefaults, updateField } =
    useTargetsManager(data, setData);
  const { signals, canRecalibrate, delta, blockedReason, recalibrate } =
    useAdaptiveTargets(data, setData);
  const { profile, setField: setProfileField, bmr, minKcal, lowKcal, scaleResolutionKg, setScaleResolution } =
    useProfileManager(data, setData, signals.smoothedWeight);
  const { phase, canClose, closePhase, setPlannedEnd } = usePhaseManager(data, setData);

  // Les trois éditeurs vivent sous un repli ; pendant une phase, ils sont suspendus.
  const phaseTarget = phase ? computeSingleTarget(presetId, baseTDEE, targets) : null;
  const editors = <CycleEditors targets={targets} suspended={!!phase} onChange={updateField} />;

  return (
    <div style={{ padding: '14px 14px 120px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <TargetsWidgets phaseTarget={phaseTarget} train={targets?.train} off={targets?.off} stepsTarget={stepsTarget} baseTDEE={baseTDEE} />
      {phase && (
        <PhaseCard
          phase={phase}
          single={phaseTarget}
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
        baseTDEE={baseTDEE}
      />
      <StepsCard stepsTarget={stepsTarget} onChange={setStepsTarget} />
      <Fold
        title="Réglages de mesure"
        hint={`profil · balance ${fmtDec(scaleResolutionKg)} kg`}
        defaultOpen={bmr == null}
      >
        <ProfileCard
          sex={profile.sex}
          birthYear={profile.birthYear}
          heightCm={profile.heightCm}
          bmr={bmr}
          minKcal={minKcal}
          lowKcal={lowKcal}
          onFieldChange={setProfileField}
        />
        <ScaleCard resolutionKg={scaleResolutionKg} onChange={setScaleResolution} />
      </Fold>
      {/* Les widgets du haut montrent déjà ces cibles : le réglage fin se replie. */}
      <Fold title="Cibles cyclées" hint={phase ? 'suspendues · reprennent à la clôture' : 'réglage fin TRAIN · OFF · WE'}>
        {editors}
      </Fold>
      <ResetCard onReset={resetDefaults} />
      <HelpCard />
    </div>
  );
}
