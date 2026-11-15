import { memo } from 'react';
import { PALETTE } from '../../constants/config.js';

/**
 * Widget carré d'Aujourd'hui. Une mesure manquante se voit sans lire :
 * contour tireté, libellé en or sur un jour passé (un manque), neutre
 * aujourd'hui (à 8 h, une journée non saisie n'est pas un défaut).
 * Avec `onPress`, la tuile est un vrai bouton qui ouvre la saisie.
 */
function WidgetTile({ label, missing = false, missingTone = PALETTE.muted, onPress, delay = 0, children }) {
  const style = {
    background: missing ? 'transparent' : PALETTE.surface,
    border: missing ? `2px dashed ${missingTone}` : 'none',
    borderRadius: 22, padding: 14, minHeight: 128, textAlign: 'left', color: PALETTE.ink,
    display: 'flex', flexDirection: 'column', gap: 4, animationDelay: `${delay}s`,
  };
  const head = (
    <span className="vf-display" style={{ fontSize: 10, letterSpacing: '0.1em', color: missing ? missingTone : PALETTE.muted }}>
      {label}
    </span>
  );
  if (!onPress) return <div className="vf-rise" style={style}>{head}{children}</div>;
  return (
    <button type="button" onClick={onPress} className="vf-rise vf-press vf-body" style={{ ...style, cursor: 'pointer', font: 'inherit' }}>
      {head}{children}
    </button>
  );
}

export default memo(WidgetTile);
