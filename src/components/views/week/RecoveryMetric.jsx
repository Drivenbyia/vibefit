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
    <div style={{ marginTop: 12, background: PALETTE.bg, borderRadius: 18, padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span className="vf-display" style={{ fontSize: 10, color: PALETTE.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{title}</span>
          <span style={{ fontSize: 11, color: PALETTE.muted }}>
            moyenne · {metric.recentNights} nuit{metric.recentNights > 1 ? 's' : ''} sur 7 j
          </span>
        </span>
        <span className="vf-hero vf-tabular" style={{ fontSize: 30, lineHeight: 1, color: PALETTE.ink, textTransform: 'none' }}>
          {fmtMetric(metric.recent, unit)}
        </span>
      </div>
      <WeekLine values={metric.values} color={PALETTE.ink} minSpan={minSpan} height={52}
        band={metric.baseline ? { lo: metric.baseline.lo, hi: metric.baseline.hi } : null} label={label} />
      <div className="vf-mono" style={{ fontSize: 10, color: PALETTE.muted, marginTop: 2 }}>
        {rangeLabel(metric, unit)}
      </div>
    </div>
  );
}
