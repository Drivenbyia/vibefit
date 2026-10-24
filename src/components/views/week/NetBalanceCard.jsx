import { PALETTE } from '../../../constants/config.js';
import Card from '../../ui/Card.jsx';
import SectionLabel from '../../ui/SectionLabel.jsx';

export default function NetBalanceCard({ weekly, plannedTrain, showSessions = true }) {
  // Calories montre : affichées à titre d'info, elles n'entrent dans aucun calcul.
  // Séances : masquées pendant une phase où l'effort est suspendu.
  const tiles = [
    { label: 'APPORT', value: Math.round(weekly.totalIntake), unit: 'kcal', color: PALETTE.ink },
    { label: 'DÉPENSE MONTRE', value: Math.round(weekly.totalExp), unit: 'kcal · info', color: PALETTE.muted },
    ...(showSessions ? [{ label: 'SÉANCES', value: `${weekly.trainDone}/${plannedTrain}`, unit: '', color: weekly.trainDone >= plannedTrain ? PALETTE.deep : PALETTE.warn }] : []),
  ];

  return (
    <Card>
      <SectionLabel>Bilan Net</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${tiles.length}, 1fr)`, gap: 8 }}>
        {tiles.map(({ label, value, unit, color }) => (
          <div
            key={label}
            style={{
              background: PALETTE.bg,
              borderRadius: 12,
              padding: '10px 8px',
              textAlign: 'center',
            }}
          >
            <div className="vf-display" style={{ fontSize: 9, color: PALETTE.muted, letterSpacing: '0.1em', marginBottom: 4 }}>
              {label}
            </div>
            <div className="vf-hero vf-tabular" style={{ fontSize: 18, color }}>
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
