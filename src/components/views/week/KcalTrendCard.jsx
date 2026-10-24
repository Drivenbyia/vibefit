import { PALETTE } from '../../../constants/config.js';
import { dayTarget } from '../../../utils/mathUtils.js';
import Card from '../../ui/Card.jsx';
import SectionLabel from '../../ui/SectionLabel.jsx';
import DayBar from './DayBar.jsx';

const LEGEND = [
  { color: PALETTE.alert, label: 'Surplus (au-dessus du trait)' },
  { color: PALETTE.deep, label: 'Dans la cible' },
  { color: PALETTE.warn, label: 'Sous la cible' },
  { color: PALETTE.line, label: 'Non saisi' },
];

export default function KcalTrendCard({ days, dateKey, setDateKey, targetsOn, phases = [] }) {
  return (
    <Card>
      <SectionLabel>Tendance calorique</SectionLabel>
      <div style={{ display: 'flex', gap: 0, alignItems: 'flex-end' }}>
        {days.map(({ key, day }) => {
          // Cible du jour à SA date — une semaine passée garde ses cibles.
          const target = dayTarget(targetsOn, key, day, phases).kcal;
          return (
            <DayBar
              key={key}
              dayKey={key}
              day={day}
              target={target}
              isToday={key === dateKey}
              onPress={setDateKey}
            />
          );
        })}
      </div>
      <div style={{
        marginTop: 10,
        paddingTop: 10,
        borderTop: `1px solid ${PALETTE.line}`,
        display: 'flex',
        gap: 12,
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div aria-hidden="true" style={{ width: 12, height: 2, borderRadius: 1, background: PALETTE.ink, opacity: 0.7 }} />
          <span style={{ fontSize: 10, color: PALETTE.muted }}>Cible du jour</span>
        </div>
        {LEGEND.map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: 999, background: color }} />
            <span style={{ fontSize: 10, color: PALETTE.muted }}>{label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
