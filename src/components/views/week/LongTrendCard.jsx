import { PALETTE } from '../../../constants/config.js';
import { useLongTrend } from '../../../hooks/useLongTrend.js';
import { ddmm, weekReadout } from '../../../utils/longTrendCopy.js';
import Card from '../../ui/Card.jsx';
import SectionLabel from '../../ui/SectionLabel.jsx';
import WeekLine from '../../ui/WeekLine.jsx';
import GapBars from './GapBars.jsx';
import LongTrendTable from './LongTrendTable.jsx';
import LongTrendLegend from './LongTrendLegend.jsx';

const Row = ({ title, children }) => (
  <div style={{ marginTop: 10 }}>
    <div className="vf-body" style={{ fontSize: 11, color: PALETTE.muted, marginBottom: 4 }}>{title}</div>
    {children}
  </div>
);

/**
 * Tendance sur 12 semaines — poids, tour de taille, écart à la cible.
 * LECTURE SEULE : trois petits graphiques à un seul axe chacun (unités
 * différentes, jamais de double axe), sur les mêmes colonnes de semaines.
 * Un tap sur une colonne affiche ses valeurs ; le tableau donne tout.
 */
export default function LongTrendCard({ data, targets }) {
  const { weeks, selected, select } = useLongTrend(data, targets);
  const shaded = weeks.map((w) => w.untracked);
  return (
    <Card>
      <SectionLabel>Tendance — {weeks.length} semaines</SectionLabel>
      <div className="vf-mono vf-tabular" aria-live="polite" style={{ fontSize: 11, color: PALETTE.ink, minHeight: 16 }}>
        {weekReadout(weeks[selected])}
      </div>
      <div style={{ position: 'relative' }}>
        <Row title="Poids — moyenne de la semaine">
          <WeekLine values={weeks.map((w) => w.weight)} color={PALETTE.ink} minSpan={1} selected={selected} shaded={shaded} label="Poids moyen par semaine" />
        </Row>
        <Row title="Tour de taille">
          <WeekLine values={weeks.map((w) => w.waist)} color={PALETTE.ink} minSpan={2} selected={selected} shaded={shaded} label="Tour de taille par semaine" />
        </Row>
        <Row title="Écart à la cible — kcal par jour">
          <GapBars values={weeks.map((w) => w.gapPerDay)} selected={selected} shaded={shaded} />
        </Row>
        <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
          {weeks.map((w, i) => (
            <button key={w.weekStart} type="button" onClick={() => select(i)} aria-pressed={i === selected}
              aria-label={`Semaine du ${ddmm(w.weekStart)}`}
              style={{ flex: 1, background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }} />
          ))}
        </div>
      </div>
      <div className="vf-mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: PALETTE.muted, marginTop: 4 }}>
        <span>{ddmm(weeks[0].weekStart)}</span>
        <span>{ddmm(weeks[weeks.length - 1].weekStart)}</span>
      </div>
      <LongTrendLegend />
      <LongTrendTable weeks={weeks} />
    </Card>
  );
}
