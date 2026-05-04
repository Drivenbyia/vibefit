import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PALETTE } from '../../constants/config.js';
import { toKey, addDays, fmtFr } from '../../utils/dateUtils.js';
import { dayType } from '../../models/day.js';

export default function Header({ dateKey, setDateKey, day, updateDay, targets }) {
  const t = dayType(dateKey, day);
  const dt = targets[t];
  const today = toKey(new Date());

  return (
    <div
      style={{
        background: PALETTE.ink,
        color: '#fff',
        padding: '20px 18px 16px',
        borderRadius: '0 0 18px 18px',
        boxShadow: '0 6px 16px rgba(0,0,0,0.05)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
        <div className="vf-display" style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em' }}>
          VIBE<span style={{ color: PALETTE.accent }}>FIT</span>
        </div>
        <div className="vf-mono" style={{ fontSize: 11, opacity: 0.6 }}>
          {dateKey === today ? "AUJOURD'HUI" : 'JOURNAL'}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <button
          onClick={() => setDateKey(addDays(dateKey, -1))}
          style={{
            background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 10,
            padding: 10, cursor: 'pointer', color: '#fff', display: 'flex',
          }}
          aria-label="Jour précédent"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          onClick={() => setDateKey(today)}
          className="vf-body"
          style={{
            flex: 1, margin: '0 10px', background: 'transparent', border: 'none',
            color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer',
            textTransform: 'capitalize',
          }}
        >
          {fmtFr(dateKey)}
        </button>
        <button
          onClick={() => setDateKey(addDays(dateKey, 1))}
          style={{
            background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 10,
            padding: 10, cursor: 'pointer', color: '#fff', display: 'flex',
          }}
          aria-label="Jour suivant"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {['train', 'off', 'we'].map((t2) => {
          const active = t === t2;
          const colorMap = { train: PALETTE.deep, off: PALETTE.accent, we: '#888' };
          return (
            <button
              key={t2}
              onClick={() => updateDay({ typeOverride: t === t2 ? null : t2 })}
              className="vf-body"
              style={{
                flex: 1,
                padding: '8px 10px',
                borderRadius: 8,
                border: 'none',
                background: active ? colorMap[t2] : 'rgba(255,255,255,0.08)',
                color: '#fff',
                fontWeight: 700,
                fontSize: 11,
                letterSpacing: '0.08em',
                cursor: 'pointer',
                textTransform: 'uppercase',
              }}
            >
              {targets[t2].label}
              {dt.kcal && t === t2 && (
                <span className="vf-mono" style={{ marginLeft: 6, opacity: 0.85, fontSize: 10 }}>
                  {dt.kcal}kcal
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
