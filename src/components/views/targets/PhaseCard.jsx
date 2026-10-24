import { PALETTE } from '../../../constants/config.js';
import Card from '../../ui/Card.jsx';

const fr = (key) => key.split('-').reverse().join('/');

/**
 * Phase en cours et cible unique qu'elle impose.
 * La cible n'est pas éditable ici : elle DÉRIVE du preset et du TDEE de base
 * (milieu TRAIN/OFF, plancher 1600). On la change en changeant de preset.
 */
export default function PhaseCard({ phase, single, canClose, onClose }) {
  return (
    <Card style={{ borderColor: PALETTE.ink }}>
      <div className="vf-display" style={{ fontSize: 11, color: PALETTE.muted, letterSpacing: '0.1em' }}>
        PHASE EN COURS
      </div>
      <div className="vf-gothic" style={{ fontSize: 25, color: PALETTE.ink }}>{phase.label ?? phase.type}</div>
      <div style={{ fontSize: 12, color: PALETTE.muted, marginTop: 2 }}>
        Depuis le {fr(phase.start)}
        {phase.plannedEnd ? ` · fin prévue le ${fr(phase.plannedEnd)}` : ''}
      </div>

      <div className="vf-tabular" style={{ marginTop: 12, fontSize: 24, fontWeight: 900, color: PALETTE.ink }}>
        {single.kcal}
        <span style={{ fontSize: 12, fontWeight: 500, color: PALETTE.muted, marginLeft: 5 }}>kcal/j · tous les jours</span>
      </div>
      <div className="vf-mono" style={{ fontSize: 11, color: PALETTE.muted, marginTop: 3 }}>
        P {single.protein} g · G {single.carbs} g · L {single.fat} g
      </div>
      <div style={{ fontSize: 11, color: PALETTE.muted, marginTop: 8, lineHeight: 1.5 }}>
        Cyclage TRAIN/OFF suspendu : sans entraînement, il n'a plus d'objet. Cible = milieu
        du cycle du preset, plancher 1600 kcal. Les cibles TRAIN/OFF ci-dessous reprendront à la clôture.
      </div>

      {canClose && (
        <button
          onClick={onClose}
          className="vf-body"
          style={{
            marginTop: 12, width: '100%', padding: 11, minHeight: 44,
            background: 'transparent', color: PALETTE.ink, border: `1px solid ${PALETTE.ink}`,
            borderRadius: 12, cursor: 'pointer', fontSize: 12, fontWeight: 700, letterSpacing: '0.06em',
          }}
        >
          CLORE LA PHASE
        </button>
      )}
    </Card>
  );
}
