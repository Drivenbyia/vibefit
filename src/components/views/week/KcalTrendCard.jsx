import { PALETTE } from '../../../constants/config.js';
import { dayType } from '../../../models/day.js';
import Card from '../../ui/Card.jsx';
import SectionLabel from '../../ui/SectionLabel.jsx';
import DayBar from './DayBar.jsx';

const LEGEND = [
  { color: PALETTE.deep, label: 'Dans la cible' },
  { color: PALETTE.accent, label: 'Surplus' },
  { color: PALETTE.warn, label: 'Sous la cible' },
  { color: PALETTE.line, label: 'Non saisi' },
];

export default function KcalTrendCard({ days, dateKey, setDateKey, resolvedTargets }) {
  return (
    <Card>
      <SectionLabel>Tendance calorique</SectionLabel>
      <div style={{ display: 'flex', gap: 0, alignItems: 'flex-end' }}>
        {days.map(({ key, day }) => {
          const t = dayType(key, day);
          const target = resolvedTargets[t]?.kcal ?? resolvedTargets.off.kcal;
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
        {LEGEND.map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
            <span style={{ fontSize: 10, color: PALETTE.muted }}>{label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
