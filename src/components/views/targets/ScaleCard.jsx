import { Scale } from 'lucide-react';
import { PALETTE, SCALE_RESOLUTIONS } from '../../../constants/config.js';
import Card from '../../ui/Card.jsx';

const label = (v) => `${String(v).replace('.', ',')} kg`;

/**
 * Résolution de la balance — le pas réellement lisible sur l'appareil.
 * Elle règle le pas de saisie du poids et le bruit de quantification pris en
 * compte dans l'incertitude du TDEE. Aucune pesée existante n'est modifiée.
 */
export default function ScaleCard({ resolutionKg, onChange }) {
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Scale size={16} color={PALETTE.deep} />
        <div className="vf-body" style={{ fontSize: 14, fontWeight: 700, color: PALETTE.ink, letterSpacing: '0.02em' }}>
          RÉSOLUTION DE LA BALANCE
        </div>
      </div>
      <div role="radiogroup" aria-label="Résolution de la balance" style={{ display: 'flex', gap: 8 }}>
        {SCALE_RESOLUTIONS.map((v) => {
          const on = v === resolutionKg;
          return (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(v)}
              className="vf-body"
              style={{
                flex: 1, minHeight: 44, borderRadius: 12, cursor: 'pointer',
                border: `1px solid ${on ? PALETTE.ink : PALETTE.line}`,
                background: on ? PALETTE.ink : 'transparent',
                color: on ? PALETTE.inkSoft : PALETTE.ink,
                fontSize: 12, fontWeight: 700,
              }}
            >
              {label(v)}
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: 11, color: PALETTE.muted, marginTop: 10, lineHeight: 1.5 }}>
        Balance à aiguille : 0,5 kg au mieux. Plus la balance est grossière, plus la tendance
        demande de jours pour être lisible (±300 kcal au plus).
      </div>
    </Card>
  );
}
