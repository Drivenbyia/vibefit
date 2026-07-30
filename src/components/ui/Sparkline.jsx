import { PALETTE } from '../../constants/config.js';

// --- Tracé de tendance (extension de la signature — voir DESIGN.md §4) ---
//
// La signature VibeFit est une valeur CONTRE UNE CIBLE : piste pleine à bouts
// ronds qui glowe, plus un marqueur de cible. Ici la cible n'est pas un point
// mais une trajectoire — celle que le preset prévoit — donc le marqueur devient
// une ligne de guide. Mêmes bouts ronds, même glow porté par la seule valeur
// réelle, même règle de couleur (la teinte suit l'état, jamais la décoration).
//
// Le guide est TIRETÉ. Un tireté sur une grille est du bruit, mais ici la ligne
// est réellement une projection — c'est le seul cas où le tireté dit la vérité.
//
// Une seule échelle verticale, partagée par les deux séries : même mesure (kg),
// donc jamais deux axes.

const PAD_Y = 6;

/**
 * Amplitude verticale, avec un PLANCHER — le paramètre le plus important du
 * composant.
 *
 * Une échelle qui s'ajuste toujours au contenu ment par construction : sans axe
 * pour donner l'ordre de grandeur, une dérive de 0,1 kg remplit la même hauteur
 * qu'une perte de 3 kg. Constaté au rendu — un guide « maintenance » écarté de
 * 0,12 kg occupait 40 % du tracé et se lisait comme une divergence grave.
 * Au-dessus du plancher on ajuste normalement ; en dessous on centre la série
 * dans une fenêtre fixe, et un petit écart a enfin l'air petit.
 */
const extent = (values, minSpan) => {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max - min >= minSpan && minSpan > 0) return [min, max];
  const mid = (min + max) / 2;
  const half = Math.max(minSpan, 0.05) / 2;
  return [mid - half, mid + half];
};

export default function Sparkline({
  points, guide = null, color, width = 300, height = 36, label = null, minSpan = 0,
}) {
  if (!points || points.length < 2) return null;

  const all = [...points.map((p) => p.y), ...(guide ?? []).map((p) => p.y)];
  const [lo, hi] = extent(all, minSpan);
  const xs = points.map((p) => p.x);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);

  const sx = (x) => ((x - x0) / (x1 - x0 || 1)) * width;
  const sy = (y) => PAD_Y + (1 - (y - lo) / (hi - lo)) * (height - PAD_Y * 2);
  const path = (pts) => pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`).join(' ');

  const last = points[points.length - 1];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      width="100%"
      height={height}
      role="img"
      aria-label={label ?? undefined}
      style={{ display: 'block', overflow: 'visible' }}
    >
      {guide && (
        <path
          d={path(guide)}
          fill="none"
          stroke={PALETTE.tick}
          strokeWidth="1.5"
          strokeDasharray="4 4"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      )}

      {/* Valeur réelle : seule à glower, comme le remplissage de `Bar`. */}
      <path
        d={path(points)}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        style={{ filter: `drop-shadow(0 0 5px ${color}99)` }}
      />

      {/* Point d'arrivée. PAS un <circle> : le viewBox est étiré en x
          (`preserveAspectRatio="none"`), un cercle y deviendrait une ellipse.
          Un sous-tracé de longueur nulle à bout rond se dessine dans l'espace
          écran via `non-scaling-stroke`, donc parfaitement rond quelle que soit
          la largeur. L'anneau de fond en dessous l'empêche de se confondre avec
          le guide là où les deux lignes se croisent. */}
      {[[11, PALETTE.bg], [7, color]].map(([w, c]) => (
        <path
          key={c}
          d={`M${sx(last.x).toFixed(1)} ${sy(last.y).toFixed(1)} L${sx(last.x).toFixed(1)} ${sy(last.y).toFixed(1)}`}
          stroke={c}
          strokeWidth={w}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}
