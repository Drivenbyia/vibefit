import { RotateCcw } from 'lucide-react';
import { PALETTE } from '../../../constants/config.js';
import Card from '../../ui/Card.jsx';

export function ResetCard({ onReset }) {
  return (
    <Card>
      <button
        onClick={onReset}
        style={{
          width: '100%', padding: '14px',
          color: PALETTE.muted,
          border: 'none', background: PALETTE.surfaceRaised,
          borderRadius: 12, fontWeight: 700, fontSize: 13,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          cursor: 'pointer',
        }}
        className="vf-body"
      >
        <RotateCcw size={16} />
        Restaurer les valeurs VIBEFIT
      </button>
    </Card>
  );
}

export function HelpCard() {
  return (
    <Card style={{ background: PALETTE.warnSoft, borderColor: PALETTE.warn }}>
      <div style={{ display: 'flex', gap: 10 }}>
        <div aria-hidden="true" style={{ flexShrink: 0, width: 10, height: 10, marginTop: 4, background: PALETTE.warn, borderRadius: 5, boxShadow: `0 0 8px ${PALETTE.warn}` }} />
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: PALETTE.warn, letterSpacing: '0.04em', marginBottom: 6, textTransform: 'uppercase' }}>
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
  );
}
