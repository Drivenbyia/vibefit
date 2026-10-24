import { PALETTE } from '../../../constants/config.js';
import Sparkline from '../../ui/Sparkline.jsx';

// Échantillon de trait repris à l'identique du tracé (même épaisseur, mêmes
// tirets, mêmes bouts ronds) : la légende doit montrer la ligne, pas une pastille
// qui lui ressemble. Le tireté est ici l'encodage secondaire qui rend les deux
// séries séparables même sans couleur.
function Swatch({ color, dashed }) {
  return (
    <svg width="14" height="6" viewBox="0 0 14 6" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path
        d="M1 3 L13 3"
        stroke={color}
        strokeWidth={dashed ? 1.5 : 2}
        strokeDasharray={dashed ? '4 4' : undefined}
        strokeLinecap="round"
      />
    </svg>
  );
}

function LegendItem({ color, dashed, children }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <Swatch color={color} dashed={dashed} />
      <span style={{ fontSize: 10, color: PALETTE.muted, letterSpacing: '0.04em' }}>{children}</span>
    </span>
  );
}

/** Tracé de tendance de la bande d'état : légende, valeur d'arrivée, courbe. */
export default function StatusTrend({ trend, line }) {
  return (
    <>
      {/* Légende à gauche, valeur d'arrivée à droite — un seul libellé
          direct, sur le point qui compte, jamais un chiffre par point. */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        flexWrap: 'wrap', marginTop: 2,
      }}>
        <LegendItem color={line}>Réel</LegendItem>
        {trend.guide && <LegendItem color={PALETTE.tick} dashed>Prévu</LegendItem>}
        <span className="vf-mono vf-tabular" style={{
          marginLeft: 'auto', fontSize: 11, color: PALETTE.ink,
        }}>
          {trend.latestLabel}
        </span>
      </div>

      {/* Fenêtre minimale de 1 kg : c'est l'ordre de grandeur d'un mois de
          sèche réelle. En dessous, le tracé serait du bruit de pesée
          grossi jusqu'à ressembler à une tendance. */}
      <Sparkline
        points={trend.points}
        guide={trend.guide}
        color={line}
        label={trend.ariaLabel}
        minSpan={1}
      />
    </>
  );
}
