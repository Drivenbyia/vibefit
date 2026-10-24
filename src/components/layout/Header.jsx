import { PALETTE, SUNSET } from '../../constants/config.js';
import { toKey } from '../../utils/dateUtils.js';
import { dayType } from '../../models/day.js';
import DayTypeSwitcher from './DayTypeSwitcher.jsx';
import PhaseBadge from './PhaseBadge.jsx';
import DateNav from './DateNav.jsx';
import Skyline from './Skyline.jsx';
import { phaseAt } from '../../models/protocol.js';
import { REST_DAY_TYPE } from '../../constants/config.js';

export default function Header({ dateKey, setDateKey, day, updateDay, targets, phases = [] }) {
  const t = dayType(dateKey, day, phases);
  const phase = t === REST_DAY_TYPE ? phaseAt(dateKey, phases) : null;
  const today = toKey(new Date());

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

      <DateNav dateKey={dateKey} setDateKey={setDateKey} today={today} />

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
