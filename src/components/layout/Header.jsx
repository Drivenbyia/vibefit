import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PALETTE, SUNSET } from '../../constants/config.js';
import { toKey, addDays, fmtFr } from '../../utils/dateUtils.js';
import { dayType } from '../../models/day.js';
import DayTypeSwitcher from './DayTypeSwitcher.jsx';
import PhaseBadge from './PhaseBadge.jsx';
import { phaseAt } from '../../models/protocol.js';
import { REST_DAY_TYPE } from '../../constants/config.js';

// Palmier stylisé : tronc + 5 palmes. Silhouette pure (fill uni), pensée pour
// se découper sur le dégradé coucher de soleil — voir DESIGN.md §3.
function Palm({ x, scale = 1 }) {
  return (
    <g transform={`translate(${x} 0) scale(${scale})`} fill={PALETTE.bg}>
      <path d="M19 40 Q17 24 20 15 Q23 24 21 40 Z" />
      <path d="M20 16 Q6 10 2 2 Q14 6 20 16 Z" />
      <path d="M20 16 Q10 4 12 -6 Q22 4 20 16 Z" />
      <path d="M20 16 Q20 2 20 -8 Q26 2 20 16 Z" />
      <path d="M20 16 Q30 4 28 -6 Q20 4 20 16 Z" />
      <path d="M20 16 Q34 10 38 2 Q26 6 20 16 Z" />
    </g>
  );
}

// L'horizon de Los Santos : silhouette d'immeubles bas + palmiers, découpée
// sur la bande basse du dégradé SUNSET. Purement décoratif — voir DESIGN.md §3.
function Skyline() {
  return (
    <svg
      viewBox="0 0 390 40"
      preserveAspectRatio="none"
      style={{ position: 'absolute', left: 0, right: 0, bottom: -1, width: '100%', height: 30 }}
    >
      <g fill={PALETTE.bg}>
        <rect x="0" y="18" width="26" height="22" />
        <rect x="30" y="10" width="18" height="30" />
        <rect x="140" y="14" width="22" height="26" />
        <rect x="250" y="8" width="16" height="32" />
        <rect x="270" y="20" width="30" height="20" />
        <rect x="360" y="12" width="20" height="28" />
      </g>
      <Palm x={70} scale={0.75} />
      <Palm x={190} scale={0.6} />
      <Palm x={310} scale={0.85} />
    </svg>
  );
}

export default function Header({ dateKey, setDateKey, day, updateDay, targets, phases = [] }) {
  const t = dayType(dateKey, day, phases);
  const phase = t === REST_DAY_TYPE ? phaseAt(dateKey, phases) : null;
  const today = toKey(new Date());

  const navButtonStyle = {
    background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 12,
    padding: 10, cursor: 'pointer', color: PALETTE.ink, display: 'flex',
    minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center',
  };

  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: SUNSET,
        color: PALETTE.ink,
        padding: '20px 18px 40px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
        {/* Wordmark : blackletter en casse mixte (les capitales sont
            illisibles en textura), « Vibe » chromé sur le coucher de soleil,
            « Fit » en vert Grove Street pour garder l'accent de marque. */}
        <div className="vf-gothic" style={{ fontSize: 30, lineHeight: 1 }}>
          <span className="vf-chrome">Vibe</span>
          <span style={{ color: PALETTE.deep, textShadow: `0 0 14px ${PALETTE.deep}` }}>Fit</span>
        </div>
        <div className="vf-mono" style={{ fontSize: 11, opacity: 0.75 }}>
          {dateKey === today ? "AUJOURD'HUI" : 'JOURNAL'}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <button onClick={() => setDateKey(addDays(dateKey, -1))} style={navButtonStyle} aria-label="Jour précédent">
          <ChevronLeft size={20} />
        </button>
        <button
          onClick={() => setDateKey(today)}
          className="vf-body"
          style={{
            flex: 1, minHeight: 44, margin: '0 10px', background: 'transparent', border: 'none',
            color: PALETTE.ink, fontSize: 15, fontWeight: 600, cursor: 'pointer',
            textTransform: 'capitalize',
          }}
        >
          {fmtFr(dateKey)}
        </button>
        <button onClick={() => setDateKey(addDays(dateKey, 1))} style={navButtonStyle} aria-label="Jour suivant">
          <ChevronRight size={20} />
        </button>
      </div>

      {phase ? (
        <PhaseBadge label={phase.label ?? phase.type} kcal={targets[REST_DAY_TYPE]?.kcal} plannedEnd={phase.plannedEnd} />
      ) : (
        <DayTypeSwitcher
          activeType={t}
          targets={targets}
          onToggle={(t2) => updateDay({ typeOverride: t === t2 ? null : t2 })}
        />
      )}

      <Skyline />
    </div>
  );
}
