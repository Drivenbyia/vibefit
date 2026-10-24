import { PALETTE } from '../../../constants/config.js';

const ITEMS = [
  ['Pas', 'total de la journée mesuré par la montre (le soir ou le lendemain matin).'],
  ['Sommeil — durée', 'temps endormi de la nuit, phases d’éveil exclues.'],
  ['VFC RMSSD nuit', 'valeur principale — moyenne de la nuit.'],
  ['VFC SDNN', 'complément — ne se compare pas au RMSSD.'],
  ['FC repos', 'fréquence cardiaque au repos du jour.'],
];

/**
 * Aide de saisie manuelle (option A) depuis Apple Santé. Repliée par défaut :
 * un rappel de méthode, pas un écran à relire chaque matin. Les calories de la
 * montre n'y figurent pas — elles ne servent à rien pour les cibles.
 */
export default function AppleEntryGuide() {
  return (
    <details
      className="vf-body"
      style={{ background: PALETTE.surface, border: `1px solid ${PALETTE.line}`, borderRadius: 20, padding: '12px 16px' }}
    >
      <summary style={{ minHeight: 24, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: PALETTE.ink }}>
        Saisie depuis l’Apple Watch — les 5 valeurs
      </summary>
      <ul style={{ margin: '10px 0 0', paddingLeft: 18, fontSize: 12, color: PALETTE.muted, lineHeight: 1.6 }}>
        {ITEMS.map(([label, text]) => (
          <li key={label}><strong style={{ color: PALETTE.ink }}>{label}</strong> : {text}</li>
        ))}
      </ul>
      <div style={{ fontSize: 11, color: PALETTE.muted, marginTop: 8, lineHeight: 1.4 }}>
        Montre non portée ? Saisis quand même les pas de l’iPhone et active « Pas iPhone seul ».
      </div>
    </details>
  );
}
