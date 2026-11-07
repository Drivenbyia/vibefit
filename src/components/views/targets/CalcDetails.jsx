import { PALETTE } from '../../../constants/config.js';

const fr = (n) => Math.round(n).toLocaleString('fr-FR');
const kgWeek = (v) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(2).replace('.', ',')} kg/sem`;

/**
 * Détail du calcul (debug) — replié par défaut. Montre la pente retenue
 * (Theil-Sen) à côté du calcul de contrôle (moindres carrés), sur la même
 * fenêtre et le même apport. Visible même quand la mesure est incohérente :
 * c'est là qu'on en a besoin.
 */
export default function CalcDetails({ measuredTDEE, trendPerWeek, control, avgIntake, windowSize, resolutionKg }) {
  if (measuredTDEE == null) return null;
  const line = { fontSize: 11, color: PALETTE.muted, lineHeight: 1.6 };
  return (
    <details style={{ marginTop: 10 }}>
      <summary className="vf-mono" style={{ fontSize: 11, color: PALETTE.muted, cursor: 'pointer', minHeight: 24 }}>
        Détail du calcul
      </summary>
      <div style={{ marginTop: 6 }}>
        <div style={line}>
          Theil-Sen (retenu) : {kgWeek(trendPerWeek)} → <strong style={{ color: PALETTE.ink }}>{fr(measuredTDEE)} kcal</strong>
        </div>
        {control && (
          <div style={line}>
            Moindres carrés (contrôle) : {kgWeek(control.slopeKgPerWeek)} → {fr(control.tdee)} kcal
          </div>
        )}
        <div style={line}>
          Apport moyen {fr(avgIntake)} kcal · fenêtre {windowSize} j · balance {String(resolutionKg).replace('.', ',')} kg
        </div>
      </div>
    </details>
  );
}
