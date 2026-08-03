import {
  Activity, AlertTriangle, ChevronRight, Droplet, HeartPulse, Minus, Moon,
  TrendingDown, TrendingUp,
} from 'lucide-react';
import { PALETTE } from '../../../constants/config.js';
import { TONE, STATUS_KIND } from '../../../utils/vibeStatus.js';
import Sparkline from '../../ui/Sparkline.jsx';

// `color` = titre et icône, `bg` = fond de la bande : couples déjà validés AA
// par DESIGN.md §1, identiques à DiagnosisCard/NeatCard.
//
// `line` = la courbe, et il se sépare de `color` sur la SEULE tonalité neutre.
// Mesuré au validateur de palette : `muted` contre le guide `tick` donne ΔE 7.5
// en vision NORMALE (seuil dur 15) — deux gris qu'on ne distingue pas, et
// qu'aucun encodage secondaire ne rachète. `ink` remonte la paire à ΔE 36.
const TONES = {
  [TONE.ALERT]: { color: PALETTE.alert, bg: PALETTE.alertSoft, line: PALETTE.alert },
  [TONE.WARN]: { color: PALETTE.warn, bg: PALETTE.warnSoft, line: PALETTE.warn },
  [TONE.GOOD]: { color: PALETTE.deep, bg: PALETTE.deepSoft, line: PALETTE.deep },
  [TONE.IDLE]: { color: PALETTE.muted, bg: PALETTE.surface, line: PALETTE.ink },
};

const ICONS = {
  [STATUS_KIND.NEAT_DRIFT]: TrendingDown,
  [STATUS_KIND.NEAT_DROP]: TrendingDown,
  [STATUS_KIND.NEAT_IMPROVING]: TrendingUp,
  [STATUS_KIND.PLATEAU]: Minus,
  // La tension se lit sur la VFC et la FC repos — un cœur, pas une lune ; la
  // dette est une affaire de durée — une lune, comme `SleepCard`.
  [STATUS_KIND.SLEEP_STRAIN]: HeartPulse,
  [STATUS_KIND.SLEEP_DEBT]: Moon,
  [STATUS_KIND.WATER_RETENTION]: Droplet,
  [STATUS_KIND.LOW_ADHERENCE]: AlertTriangle,
  [STATUS_KIND.PROGRESSING]: TrendingDown,
  [STATUS_KIND.TREND]: Activity,
};

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

/**
 * Bande d'état du jour — le verdict de `WeekView` remonté au-dessus de la
 * saisie, sans coûter de navigation. Un tap ouvre le détail complet.
 */
export default function StatusBand({ status, onOpenWeek }) {
  if (!status) return null;

  const { color, bg, line } = TONES[status.tone] ?? TONES[TONE.IDLE];
  const Icon = ICONS[status.kind] ?? Activity;
  const isIdle = status.tone === TONE.IDLE;
  const { trend } = status;

  return (
    <button
      type="button"
      onClick={onOpenWeek}
      className="vf-fadein"
      aria-label={`${status.headline} — ouvrir le bilan de la semaine`}
      style={{
        width: '100%', minHeight: 44, textAlign: 'left', cursor: 'pointer',
        background: bg,
        border: `1px solid ${isIdle ? PALETTE.line : color}`,
        borderRadius: 16,
        padding: '12px 14px',
        display: 'flex', flexDirection: 'column', gap: 6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon
          size={16}
          color={color}
          strokeWidth={2.5}
          style={{ flexShrink: 0, filter: isIdle ? 'none' : `drop-shadow(0 0 6px ${color}99)` }}
        />
        {/* Pas de fontWeight sur .vf-display — Archivo Black n'a qu'une graisse
            réelle, un style inline produirait un faux gras (DESIGN.md §2). */}
        <div className="vf-display" style={{ fontSize: 12, color, textTransform: 'uppercase' }}>
          {status.headline}
        </div>
        <ChevronRight size={16} color={PALETTE.muted} style={{ marginLeft: 'auto', flexShrink: 0 }} />
      </div>

      {status.detail && (
        <div className="vf-body" style={{ fontSize: 12, color: PALETTE.ink, lineHeight: 1.45 }}>
          {status.detail}
        </div>
      )}

      {trend && (
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
      )}

      {/* Ligne de mesure à 10px, sans letter-spacing : à 11px elle fait 316 px,
          ce qui tient à 390 px de large mais s'orpheline dès 360 px (Galaxy S),
          où la bande gagne alors une ligne au-dessus de la saisie. */}
      {status.readout && (
        <div className="vf-mono vf-tabular" style={{ fontSize: 10, color: PALETTE.muted }}>
          {status.readout}
        </div>
      )}
    </button>
  );
}
