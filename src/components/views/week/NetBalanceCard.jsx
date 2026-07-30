import { PALETTE } from '../../../constants/config.js';
import Card from '../../ui/Card.jsx';
import SectionLabel from '../../ui/SectionLabel.jsx';

export default function NetBalanceCard({ weekly, plannedTrain }) {
  const tiles = [
    { label: 'APPORT', value: Math.round(weekly.totalIntake), unit: 'kcal', color: PALETTE.ink },
    { label: 'DÉPENSE', value: Math.round(weekly.totalExp), unit: 'kcal', color: PALETTE.ink },
    { label: 'SÉANCES', value: `${weekly.trainDone}/${plannedTrain}`, unit: '', color: weekly.trainDone >= plannedTrain ? PALETTE.deep : PALETTE.warn },
  ];

  return (
    <Card>
      <SectionLabel>Bilan Net</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {tiles.map(({ label, value, unit, color }) => (
          <div
            key={label}
            style={{
              background: PALETTE.paper,
              borderRadius: 3,
              padding: '10px 8px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 9, fontWeight: 700, color: PALETTE.muted, letterSpacing: '0.1em', marginBottom: 4 }}>
              {label}
            </div>
            <div className="vf-display vf-tabular" style={{ fontSize: 18, fontWeight: 900, color }}>
              {value}
            </div>
            {unit && (
              <div style={{ fontSize: 9, color: PALETTE.muted, marginTop: 2 }}>{unit}</div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
