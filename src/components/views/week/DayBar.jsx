import { PALETTE } from '../../../constants/config.js';
import { shortFr } from '../../../utils/dateUtils.js';
import { num } from '../../../utils/mathUtils.js';

export default function DayBar({ day, dayKey, target, isToday, onPress }) {
  const kcal = day ? num(day.intake?.kcal) : 0;
  const hasData = kcal > 0;
  const pct = target > 0 ? (kcal / target) * 100 : 0;
  const isOver = pct > 110;
  const isLow = hasData && pct < 80;
  const barColor = !hasData ? PALETTE.line
    : isOver ? PALETTE.alert
    : isLow ? PALETTE.warn
    : PALETTE.deep;
  const barH = hasData ? Math.max((pct / 130) * 52, 6) : 3;

  return (
    <button
      onClick={() => onPress(dayKey)}
      style={{
        flex: 1,
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: '0 2px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
      }}
    >
      <div style={{
        fontSize: 9,
        fontWeight: 700,
        color: isToday ? PALETTE.ink : PALETTE.muted,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
      }}>
        {shortFr(dayKey)}
      </div>
      <div style={{ height: 56, display: 'flex', alignItems: 'flex-end', width: '100%' }}>
        <div style={{
          width: '100%',
          height: barH,
          background: barColor,
          borderRadius: '4px 4px 0 0',
          opacity: hasData ? 1 : 0.35,
          outline: isToday ? `2px solid ${PALETTE.ink}` : 'none',
          outlineOffset: 1,
        }} />
      </div>
      <div style={{
        fontSize: 9,
        fontWeight: hasData ? 700 : 400,
        color: hasData ? PALETTE.ink : PALETTE.muted,
        letterSpacing: '0.02em',
      }}>
        {hasData ? `${(kcal / 1000).toFixed(1)}k` : '—'}
      </div>
    </button>
  );
}
