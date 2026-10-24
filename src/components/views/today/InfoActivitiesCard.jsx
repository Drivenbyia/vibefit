import { Info } from 'lucide-react';
import { PALETTE } from '../../../constants/config.js';
import { formatInfoActivities } from '../../../models/protocol.js';
import Card from '../../ui/Card.jsx';

/**
 * Séances enregistrées par Apple Santé (marche, vélo…), gardées À TITRE
 * D'INFO. Lecture seule : elles ne changent ni le type de séance, ni la
 * cible, ni le TDEE, ni aucune règle — aucun calcul ne lit ce champ.
 */
export default function InfoActivitiesCard({ activities }) {
  if (!Array.isArray(activities) || activities.length === 0) return null;
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Info size={16} color={PALETTE.muted} />
        <div className="vf-body" style={{ fontSize: 13, fontWeight: 700, color: PALETTE.ink, letterSpacing: '0.02em' }}>
          ACTIVITÉS ENREGISTRÉES · INFO
        </div>
      </div>
      <div className="vf-mono" style={{ fontSize: 12, color: PALETTE.ink }}>{formatInfoActivities(activities)}</div>
      <div style={{ fontSize: 11, color: PALETTE.muted, marginTop: 6, lineHeight: 1.4 }}>
        Importées d'Apple Santé. N'entrent dans aucun calcul ni aucune cible.
      </div>
    </Card>
  );
}
