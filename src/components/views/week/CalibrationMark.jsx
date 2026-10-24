import { memo } from 'react';
import { Check, Scale, Utensils } from 'lucide-react';
import { PALETTE } from '../../../constants/config.js';
import { CALIBRATION_DAY } from '../../../utils/adaptiveTDEE.js';

/**
 * Marque de calibration d'un jour du calendrier.
 *
 * La FORME porte le sens (coche = compté, balance = pesée manquante,
 * couverts = apport manquant) ; la couleur ne fait que le renforcer, ce qui
 * reste lisible sur la case sélectionnée, où tout passe en `inkSoft`.
 * Un manque est `warn`, jamais `alert` (DESIGN.md).
 */
const ICONS = {
  [CALIBRATION_DAY.COUNTED]: [Check],
  [CALIBRATION_DAY.NO_WEIGHT]: [Scale],
  [CALIBRATION_DAY.NO_INTAKE]: [Utensils],
  [CALIBRATION_DAY.EMPTY]: [Scale, Utensils],
};

export const CALIBRATION_ARIA = {
  [CALIBRATION_DAY.COUNTED]: 'compte pour la calibration',
  [CALIBRATION_DAY.NO_WEIGHT]: 'pesée manquante pour la calibration',
  [CALIBRATION_DAY.NO_INTAKE]: 'apport manquant pour la calibration',
  [CALIBRATION_DAY.EMPTY]: 'pesée et apport manquants pour la calibration',
};

function CalibrationMark({ status, selected, pending }) {
  const icons = ICONS[status];
  if (!icons) return <span style={{ height: 11 }} aria-hidden="true" />;
  const counted = status === CALIBRATION_DAY.COUNTED;
  // Aujourd'hui pas encore complet : manque provisoire, en encre discrète.
  const color = selected ? PALETTE.inkSoft : counted ? PALETTE.deep : pending ? PALETTE.muted : PALETTE.warn;
  return (
    <span aria-hidden="true" style={{ display: 'flex', gap: 2, height: 11, alignItems: 'center' }}>
      {icons.map((Icon, i) => <Icon key={i} size={11} strokeWidth={2.5} color={color} />)}
    </span>
  );
}

export default memo(CalibrationMark);

/** Légende sous le calendrier, seulement pendant la calibration. */
export function CalibrationLegend() {
  const item = (Icon, color, label) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <Icon size={11} strokeWidth={2.5} color={color} aria-hidden="true" />
      {label}
    </span>
  );
  return (
    <div className="vf-body" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 8, fontSize: 11, color: PALETTE.muted }}>
      <span>Calibration :</span>
      {item(Check, PALETTE.deep, 'compté')}
      {item(Scale, PALETTE.warn, 'pesée manquante')}
      {item(Utensils, PALETTE.warn, 'apport manquant')}
    </div>
  );
}
