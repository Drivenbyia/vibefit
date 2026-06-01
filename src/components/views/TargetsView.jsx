import { useState } from 'react';
import { Footprints, RotateCcw, Check } from 'lucide-react';
import { PALETTE, PRESETS, DEFAULT_TARGETS, DEFAULT_STEPS_TARGET } from '../../constants/config.js';
import { num } from '../../utils/mathUtils.js';
import { computePresetTargets } from '../../utils/presetUtils.js';
import Card from '../ui/Card.jsx';
import NumberInput from '../ui/NumberInput.jsx';
import Label from '../ui/Label.jsx';

function TargetEditor({ title, subtitle, accent, target, onChange, allowEmpty }) {
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ width: 4, height: 28, background: accent, borderRadius: 2 }} />
        <div>
          <div className="vf-body" style={{ fontSize: 13, fontWeight: 800, color: PALETTE.ink, letterSpacing: '0.04em' }}>
            {title}
          </div>
          <div style={{ fontSize: 11, color: PALETTE.muted }}>{subtitle}</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ gridColumn: 'span 2' }}>
          <Label>Calories</Label>
          <NumberInput value={target.kcal ?? ''} onChange={(v) => onChange('kcal', v)} placeholder={allowEmpty ? 'Aucune cible' : '0'} suffix="kcal" />
        </div>
        <div>
          <Label>Protéines</Label>
          <NumberInput value={target.protein ?? ''} onChange={(v) => onChange('protein', v)} placeholder={allowEmpty ? '—' : '160'} suffix="g" />
        </div>
        <div>
          <Label>Glucides</Label>
          <NumberInput value={target.carbs ?? ''} onChange={(v) => onChange('carbs', v)} placeholder={allowEmpty ? '—' : '0'} suffix="g" />
        </div>
        <div style={{ gridColumn: 'span 2' }}>
          <Label>Lipides</Label>
          <NumberInput value={target.fat ?? ''} onChange={(v) => onChange('fat', v)} placeholder={allowEmpty ? '—' : '0'} suffix="g" />
        </div>
      </div>
    </Card>
  );
}

export default function TargetsView({ data, setData }) {
  const { targets, stepsTarget, presetId, maintenanceKcal } = data;
  const [savedFlash, setSavedFlash] = useState(false);

  const setTargets = (newTargets, newPresetId = 'custom') => {
    setData((prev) => ({ ...prev, targets: newTargets, presetId: newPresetId }));
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1200);
  };

  const setStepsTarget = (v) => {
    setData((prev) => ({ ...prev, stepsTarget: num(v) || DEFAULT_STEPS_TARGET }));
  };

  const applyPreset = (id) => {
    if (!PRESETS[id]) return;
    setTargets(computePresetTargets(id, maintenanceKcal), id);
  };

  const resetDefaults = () => {
    if (confirm('Restaurer les cibles VIBEFIT par défaut ?')) {
      setData(prev => ({
        ...prev,
        targets: DEFAULT_TARGETS,
        presetId: 'maintenance',
        stepsTarget: DEFAULT_STEPS_TARGET,
        maintenanceKcal: {
          train: DEFAULT_TARGETS.train.kcal,
          off: DEFAULT_TARGETS.off.kcal,
        },
      }));
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1200);
    }
  };

  const updateField = (dayKey, field, value) => {
    const v = value === '' ? null : num(value);

    // Édition des kcal TRAIN ou OFF en mode maintenance → met à jour la base
    // sans décrocher le preset, et propage via computePresetTargets.
    if (presetId === 'maintenance' && field === 'kcal' && v !== null && (dayKey === 'train' || dayKey === 'off')) {
      const newBase = { ...maintenanceKcal, [dayKey]: v };
      setData(prev => ({
        ...prev,
        maintenanceKcal: newBase,
        targets: computePresetTargets('maintenance', newBase),
        presetId: 'maintenance',
      }));
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1200);
      return;
    }

    setTargets({ ...targets, [dayKey]: { ...targets[dayKey], [field]: v } }, 'custom');
  };

  return (
    <div style={{ padding: '14px 14px 100px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: PALETTE.muted, letterSpacing: '0.1em' }}>
              MODE ACTUEL
            </div>
            <div className="vf-display" style={{ fontSize: 22, fontWeight: 900, color: PALETTE.ink }}>
              {presetId === 'custom' ? 'Personnalisé' : (PRESETS[presetId]?.label || 'Maintenance')}
            </div>
            <div style={{ fontSize: 12, color: PALETTE.muted, marginTop: 2 }}>
              {presetId === 'custom' ? 'Tu as ajusté les valeurs à la main' : (PRESETS[presetId]?.sub || '')}
            </div>
          </div>
          {savedFlash && (
            <div className="vf-fadein" style={{
              fontSize: 11, fontWeight: 700, color: PALETTE.deep,
              background: PALETTE.deepSoft, padding: '4px 8px', borderRadius: 6,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <Check size={12} /> ENREGISTRÉ
            </div>
          )}
        </div>

        <div style={{ fontSize: 11, color: PALETTE.muted, marginBottom: 10, lineHeight: 1.4 }}>
          Base maintenance · <strong style={{ color: PALETTE.ink }}>{maintenanceKcal.train} kcal</strong> TRAIN
          {' / '}
          <strong style={{ color: PALETTE.ink }}>{maintenanceKcal.off} kcal</strong> OFF
          {' '}— les autres presets se calculent depuis ces valeurs
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {Object.entries(PRESETS).map(([id, p]) => {
            const active = presetId === id;
            return (
              <button
                key={id}
                onClick={() => applyPreset(id)}
                className="vf-body"
                style={{
                  textAlign: 'left', padding: '12px',
                  background: active ? PALETTE.ink : PALETTE.paper,
                  color: active ? '#fff' : PALETTE.ink,
                  border: `1px solid ${active ? PALETTE.ink : PALETTE.line}`,
                  borderRadius: 10, cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', gap: 2,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 700 }}>{p.label}</span>
                <span style={{ fontSize: 10, opacity: 0.75, lineHeight: 1.3 }}>{p.sub}</span>
              </button>
            );
          })}
        </div>
      </Card>

      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Footprints size={16} color={PALETTE.deep} />
          <div className="vf-body" style={{ fontSize: 14, fontWeight: 700, color: PALETTE.ink, letterSpacing: '0.02em' }}>
            OBJECTIF DE PAS QUOTIDIEN
          </div>
        </div>
        <NumberInput value={stepsTarget} onChange={setStepsTarget} placeholder="8000" suffix="pas" />
      </Card>

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

      <Card>
        <button
          onClick={resetDefaults}
          style={{
            width: '100%', padding: '14px',
            background: 'transparent', color: PALETTE.muted,
            border: `1px solid ${PALETTE.line}`,
            borderRadius: 10, fontWeight: 700, fontSize: 13,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            cursor: 'pointer',
          }}
          className="vf-body"
        >
          <RotateCcw size={16} />
          Restaurer les valeurs VIBEFIT
        </button>
      </Card>

      <Card style={{ background: PALETTE.highlight, borderColor: PALETTE.accent }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flexShrink: 0, width: 4, alignSelf: 'stretch', background: PALETTE.accent, borderRadius: 2 }} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: PALETTE.accentDark, letterSpacing: '0.04em', marginBottom: 6, textTransform: 'uppercase' }}>
              Comment ça marche
            </div>
            <div style={{ fontSize: 13, color: PALETTE.ink, lineHeight: 1.5 }}>
              Les <strong>presets</strong> ajustent kcal/macros automatiquement.
              Les <strong>protéines restent à 160g</strong> dans tous les modes (protection musculaire),
              les <strong>glucides absorbent</strong> la différence calorique.
              Édite à la main pour passer en mode <em>Personnalisé</em>.
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
