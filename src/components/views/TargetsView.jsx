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

export default function TargetsView({ data, setData }) {
  const { targets, stepsTarget, presetId, baseTDEE } = data;
  const { savedFlash, setStepsTarget, applyPreset, resetDefaults, updateField } =
    useTargetsManager(data, setData);
  const { signals, canRecalibrate, delta, blockedReason, recalibrate } =
    useAdaptiveTargets(data, setData);
  const { profile, setField: setProfileField, bmr, minKcal, lowKcal, scaleResolutionKg, setScaleResolution } =
    useProfileManager(data, setData, signals.smoothedWeight);
  const { phase, canClose, closePhase, setPlannedEnd } = usePhaseManager(data, setData);

  // Pendant une phase, le cyclage est suspendu : ses trois éditeurs se replient.
  const editors = <CycleEditors targets={targets} suspended={!!phase} onChange={updateField} />;

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
      {phase ? (
        <Fold title="Cibles cyclées" hint="suspendues · reprennent à la clôture">
          {editors}
        </Fold>
      ) : editors}
      <ResetCard onReset={resetDefaults} />
      <HelpCard />
    </div>
  );
}
