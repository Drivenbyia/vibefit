import { memo } from 'react';
import { PALETTE } from '../../../constants/config.js';
import { fmtDec, fmtSignedInt, fmtSigned } from '../../../utils/format.js';
import { formatSleep } from '../../../utils/quickEntry.js';
import WidgetTile from '../../ui/WidgetTile.jsx';
import GaugeRing from '../../ui/GaugeRing.jsx';
import Sparkline from '../../ui/Sparkline.jsx';

const big = { fontSize: 30, lineHeight: 1 };
const sub = { fontSize: 12, color: PALETTE.muted, textTransform: 'none' };

/**
 * La semaine en un coup d'œil : écart à la cible (kcal/j comparable), poids
 * moyen, jours au plancher de protéines, sommeil moyen. Mêmes conventions de
 * lecture que le reste de l'app (décision du 2026-11-14) : écart en kcal/j,
 * variation de poids en encre neutre, « stable » sous la résolution de la balance.
 */
function WeekWidgets({ weekly, avgWeight, weightDelta, weightSeries, scaleResolutionKg = 0.5, recordedDays, daysUnderProtein, proteinFloor, sleep }) {
  const comparable = weekly.comparableDays;
  const perDay = comparable > 0 ? weekly.targetGap / comparable : null;
  const gapColor = perDay == null ? PALETTE.muted : perDay < -100 ? PALETTE.warn : perDay > 100 ? PALETTE.alert : PALETTE.deep;
  const measurable = weightDelta != null && Math.abs(weightDelta) > scaleResolutionKg + 1e-9;
  const protOk = Math.max(0, recordedDays - daysUnderProtein);
  const points = weightSeries.map(({ w }, i) => ({ x: i, y: w }));
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
      <WidgetTile label="ÉCART CIBLE" delay={0}>
        <span className="vf-hero vf-tabular" style={{ ...big, color: gapColor }}>{perDay == null ? '—' : fmtSignedInt(perDay)}</span>
        <span style={sub}>kcal/j · {comparable} j comparable{comparable > 1 ? 's' : ''}</span>
      </WidgetTile>
      <WidgetTile label="POIDS MOYEN" delay={0.05}>
        <span className="vf-hero vf-tabular" style={big}>{avgWeight != null ? fmtDec(avgWeight) : '—'}<span className="vf-body" style={sub}> kg</span></span>
        <span style={sub}>{weightDelta == null ? 'une pesée ou moins' : measurable ? `${fmtSigned(weightDelta)} kg sur la semaine` : 'stable'}</span>
        <span style={{ marginTop: 'auto' }}><Sparkline points={points} color={PALETTE.ink} height={28} minSpan={2} label="Pesées de la semaine" /></span>
      </WidgetTile>
      <WidgetTile label="PROTÉINES" delay={0.1}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <GaugeRing progress={recordedDays > 0 ? protOk / recordedDays : null} color={PALETTE.aqua} />
          <span className="vf-hero vf-tabular" style={big}>{protOk}<span className="vf-body" style={sub}>/{recordedDays} j</span></span>
        </span>
        <span style={sub}>≥ {proteinFloor} g</span>
      </WidgetTile>
      <WidgetTile label="SOMMEIL MOYEN" delay={0.15}>
        <span className="vf-hero vf-tabular" style={big}>{sleep?.durationMin ? formatSleep(sleep.durationMin) : '—'}</span>
        <span style={sub}>{sleep?.nights ? `${sleep.nights} nuit${sleep.nights > 1 ? 's' : ''} renseignée${sleep.nights > 1 ? 's' : ''}` : 'aucune nuit'}</span>
      </WidgetTile>
    </div>
  );
}

export default memo(WeekWidgets);
