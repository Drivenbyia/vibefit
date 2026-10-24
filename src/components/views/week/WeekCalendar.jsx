import { PALETTE } from '../../../constants/config.js';
import { shortFr } from '../../../utils/dateUtils.js';
import { dayType } from '../../../models/day.js';
import { num } from '../../../utils/mathUtils.js';
import { toKey } from '../../../utils/dateUtils.js';
import CalibrationMark, { CalibrationLegend, CALIBRATION_ARIA } from './CalibrationMark.jsx';

/**
 * `calibration` : statut de calibration par clé de jour, ou null hors
 * calibration active. Le point garde son sens (type de jour, saisi ou non) ;
 * la marque en dessous dit si le jour COMPTE — un jour à pas seuls est
 * « saisi » sans faire avancer la calibration.
 */
export default function WeekCalendar({ days, dateKey, setDateKey, phases = [], calibration = null }) {
  const realToday = toKey(new Date());
  return (
    <>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
      {days.map(({ key, day }) => {
        const t = dayType(key, day, phases);
        const recorded = day && (num(day.intake?.kcal) > 0 || day.workout || num(day.expenditure?.steps) > 0);
        const isToday = key === dateKey;
        // `rest` (cible unique de phase) : encre neutre — ni entraînement, ni repos programmé.
        const dotColor = { train: PALETTE.deep, off: PALETTE.slate, we: PALETTE.muted, rest: PALETTE.ink }[t];
        return (
          <button
            key={key}
            onClick={() => setDateKey(key)}
            aria-label={`${shortFr(key)} ${key.slice(8, 10)}${calibration?.[key] ? ` — ${CALIBRATION_ARIA[calibration[key]]}` : ''}`}
            style={{
              background: isToday ? PALETTE.ink : PALETTE.bg,
              border: `2px solid ${isToday ? PALETTE.ink : 'transparent'}`,
              borderRadius: 12,
              padding: '8px 4px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              color: isToday ? PALETTE.inkSoft : PALETTE.ink,
            }}
          >
            <span className="vf-body" style={{ fontSize: 9, fontWeight: 700, opacity: 0.7, textTransform: 'uppercase' }}>
              {shortFr(key)}
            </span>
            <span className="vf-hero vf-tabular" style={{ fontSize: 17 }}>
              {key.slice(8, 10)}
            </span>
            <span style={{
              width: 6, height: 6, borderRadius: 999,
              background: recorded ? dotColor : 'transparent',
              border: `1.5px solid ${dotColor}`,
            }} />
            {calibration && (
              <CalibrationMark status={calibration[key]} selected={isToday} pending={key === realToday} />
            )}
          </button>
        );
      })}
    </div>
    {calibration && <CalibrationLegend />}
    </>
  );
}
