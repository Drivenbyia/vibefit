import { PALETTE } from '../../../constants/config.js';
import WeekLine from '../../ui/WeekLine.jsx';
import { fmtMetric, rangeLabel } from '../../../utils/recoveryCopy.js';

/**
 * Une mesure de récupération sur 28 nuits : la moyenne des 7 dernières en
 * chiffre, la courbe nuit par nuit, et la plage habituelle en fond dès que
 * la référence existe. Encre neutre : aucune couleur d'état, aucun verdict.
 */
export default function RecoveryMetric({ title, unit, metric, minSpan, label }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <span className="vf-body" style={{ fontSize: 12, color: PALETTE.ink, fontWeight: 600 }}>{title}</span>
        <span className="vf-mono vf-tabular" style={{ fontSize: 12, color: PALETTE.ink }}>
          {fmtMetric(metric.recent, unit)}
          <span style={{ color: PALETTE.muted, fontSize: 10 }}>
            {` · ${metric.recentNights} nuit${metric.recentNights > 1 ? 's' : ''} sur 7 j`}
          </span>
        </span>
      </div>
      <WeekLine values={metric.values} color={PALETTE.ink} minSpan={minSpan} height={36}
        band={metric.baseline ? { lo: metric.baseline.lo, hi: metric.baseline.hi } : null} label={label} />
      <div className="vf-mono" style={{ fontSize: 10, color: PALETTE.muted, marginTop: 2 }}>
        {rangeLabel(metric, unit)}
      </div>
    </div>
  );
}
