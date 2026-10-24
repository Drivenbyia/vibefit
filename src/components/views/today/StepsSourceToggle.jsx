import { PALETTE, MEASURE_SOURCES } from '../../../constants/config.js';
import Pill from '../../ui/Pill.jsx';

/**
 * Source des pas du jour. Par défaut, elle est déduite de la montre portée à
 * cette date ; le bouton la force à « iPhone seul » quand la montre n'a pas été
 * portée. Ces pas restent affichés mais sont exclus de toute moyenne et de
 * toute référence : l'iPhone ne compte que quand il est sur soi.
 */
export default function StepsSourceToggle({ stepsSource, derivedSource, onChange }) {
  const iphone = stepsSource === 'iphone';
  const shown = iphone ? 'iphone' : derivedSource;

  return (
    <div style={{ marginTop: 12 }}>
      <Pill active={iphone} color={PALETTE.warn} onClick={() => onChange(iphone ? '' : 'iphone')}>
        Pas iPhone seul
      </Pill>
      <div style={{ fontSize: 11, color: PALETTE.muted, marginTop: 6, lineHeight: 1.4 }}>
        Source : <strong style={{ color: iphone ? PALETTE.warn : PALETTE.ink }}>
          {shown ? MEASURE_SOURCES[shown] : 'non renseignée'}
        </strong>
        {iphone
          ? ' — exclus de la moyenne de pas et de la référence.'
          : ' — d’après la montre portée ce jour-là.'}
      </div>
    </div>
  );
}
