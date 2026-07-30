import { PALETTE } from '../../../constants/config.js';
import Card from '../../ui/Card.jsx';
import BalanceRing from './BalanceRing.jsx';
import EnergyStat from './EnergyStat.jsx';

export default function BalanceCard({ intake, expenditure, target }) {
  return (
    <Card>
      <div className="vf-display" style={{ fontSize: 11, color: PALETTE.muted, letterSpacing: '0.1em', marginBottom: 12 }}>
        BILAN DU JOUR
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <BalanceRing intake={intake} target={target} />
        <div style={{ flex: 1 }}>
          <div style={{ marginBottom: 14 }}>
            <EnergyStat label="APPORT" value={intake} />
          </div>
          <EnergyStat label="DÉPENSE GARMIN" value={expenditure} />
        </div>
      </div>
    </Card>
  );
}
