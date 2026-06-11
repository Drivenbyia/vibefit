import { Check } from 'lucide-react';
import { PALETTE, PRESETS } from '../../../constants/config.js';
import Card from '../../ui/Card.jsx';

export default function PresetPickerCard({ presetId, baseTDEE, savedFlash, onApplyPreset }) {
  return (
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
        TDEE de base · <strong style={{ color: PALETTE.ink }}>{baseTDEE} kcal</strong>
        {' '}— tous les presets se calculent depuis cette valeur
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {Object.entries(PRESETS).map(([id, p]) => {
          const active = presetId === id;
          return (
            <button
              key={id}
              onClick={() => onApplyPreset(id)}
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
  );
}
