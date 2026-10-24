import { PALETTE, sticker } from '../../constants/config.js';

const fr = (key) => key.split('-').reverse().join('/');

/**
 * Remplace le sélecteur TRAIN/OFF/WE pendant une phase sans cyclage.
 * Non interactif à dessein : pendant l'arrêt médical, aucune bascule ne doit
 * pouvoir rouvrir une cible d'entraînement.
 */
export default function PhaseBadge({ label, kcal, plannedEnd }) {
  return (
    <div
      role="status"
      className="vf-body"
      style={{
        minHeight: 44,
        borderRadius: 12,
        padding: '8px 12px',
        background: PALETTE.ink,
        color: PALETTE.inkSoft,
        boxShadow: sticker(PALETTE.bg),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        flexWrap: 'wrap',
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {label}
        <span className="vf-mono" style={{ marginLeft: 6, fontWeight: 600, letterSpacing: 0 }}>
          · cible unique {kcal} kcal
        </span>
      </span>
      {plannedEnd && (
        <span className="vf-mono" style={{ fontSize: 10, opacity: 0.8 }}>
          fin prévue {fr(plannedEnd)}
        </span>
      )}
    </div>
  );
}
