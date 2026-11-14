import { memo } from 'react';
import { Utensils } from 'lucide-react';
import { PALETTE } from '../../../constants/config.js';
import Card from '../../ui/Card.jsx';
import Pill from '../../ui/Pill.jsx';

/**
 * Jour atypique — jeûne, gros restaurant, écart. Une rupture pour le TDEE :
 * la fenêtre de calcul ne s'allonge pas par-dessus (ni sur les 3 jours qui
 * suivent). Les données du jour restent comptées : l'apport est réel.
 *
 * `umber` (rampe catégorielle) comme le chantier : ce marquage qualifie la
 * nature du jour, ce n'est ni un manque ni un dépassement.
 */
function AtypicalDayCard({ atypical, onToggle }) {
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Utensils size={16} color={PALETTE.umber} />
        <div className="vf-body" style={{ fontSize: 14, fontWeight: 700, color: PALETTE.ink, letterSpacing: '0.02em' }}>
          JOUR ATYPIQUE
        </div>
      </div>
      <div style={{ display: 'flex' }}>
        <Pill active={atypical} color={PALETTE.umber} onClick={onToggle}>
          Jeûne · resto · écart
        </Pill>
      </div>
      <div style={{ fontSize: 11, color: PALETTE.muted, marginTop: 6, lineHeight: 1.4 }}>
        Les pesées des jours suivants sont faussées par l’eau et le glycogène.
        Le calcul du TDEE ne remonte pas au-delà de ce jour. Tes saisies
        restent comptées.
      </div>
    </Card>
  );
}

export default memo(AtypicalDayCard);
