import { Zap } from 'lucide-react';
import { PALETTE } from '../../../constants/config.js';

/**
 * Pied de carte : apport moyen brut, puis comparaison apport vs cible calculée
 * sur EXACTEMENT le même sous-ensemble de jours (les jours sans cible — le
 * week-end — sont exclus des deux côtés, plus seulement de la cible).
 */
export default function KcalAverageRow({ avgIntake, avgIntakeComparable, avgKcalTarget, comparableDays }) {
  return (
    <div style={{
      marginTop: 12,
      paddingTop: 10,
      borderTop: `1px solid ${PALETTE.line}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <Zap size={12} color={PALETTE.muted} strokeWidth={2.5} />
        <span style={{ fontSize: 11, fontWeight: 700, color: PALETTE.muted, letterSpacing: '0.08em' }}>
          KCAL MOY.
        </span>
      </div>
      <div className="vf-tabular" style={{ fontSize: 16, fontWeight: 800, color: PALETTE.ink, textAlign: 'right' }}>
        {Math.round(avgIntake)}
        <span style={{ fontSize: 10, fontWeight: 500, color: PALETTE.muted, marginLeft: 4 }}>kcal</span>
        {avgKcalTarget !== null && (
          <div style={{ fontSize: 10, fontWeight: 500, color: PALETTE.muted, marginTop: 1 }}>
            {Math.round(avgIntakeComparable)} / {Math.round(avgKcalTarget)} cible
            {' '}· {comparableDays} j comparables
          </div>
        )}
      </div>
    </div>
  );
}
