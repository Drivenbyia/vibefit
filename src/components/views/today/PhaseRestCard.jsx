import { Footprints } from 'lucide-react';
import { PALETTE } from '../../../constants/config.js';
import Card from '../../ui/Card.jsx';

/**
 * Remplace la carte Séance pendant une phase où l'effort est suspendu.
 * La séance n'est pas saisissable : le jour est lu « aucune séance » quelle
 * que soit la valeur stockée. La marche reste la seule activité.
 */
export default function PhaseRestCard({ label, stepsTarget }) {
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Footprints size={16} color={PALETTE.ink} />
        <div className="vf-body" style={{ fontSize: 14, fontWeight: 700, color: PALETTE.ink, letterSpacing: '0.02em' }}>
          SÉANCES SUSPENDUES
        </div>
      </div>
      <div style={{ fontSize: 12, color: PALETTE.muted, lineHeight: 1.5 }}>
        {label} : pas de séance ni de chantier. La marche reste ta seule activité —
        objectif <strong style={{ color: PALETTE.ink }}>{Number(stepsTarget).toLocaleString('fr-FR')} pas</strong> par jour.
      </div>
    </Card>
  );
}
