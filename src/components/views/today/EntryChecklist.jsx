import { Check } from 'lucide-react';
import { PALETTE } from '../../../constants/config.js';
import YesterdayGap from './YesterdayGap.jsx';

/**
 * Liste de saisie — ce qui est fait, ce qui manque, en une ligne au-dessus du
 * bilan. Chaque pastille mène à sa carte. Sur un jour PASSÉ, un manque est en
 * or (`warn` = manque, DESIGN.md §1) ; aujourd'hui il reste neutre : à 8 h,
 * une journée non saisie n'est pas un défaut. La coche porte le sens, la
 * couleur le renforce.
 */
export default function EntryChecklist({ items, isToday, yesterday, onJump, onOpenYesterday }) {
  const done = items.filter((i) => i.done).length;
  const missingColor = isToday ? PALETTE.muted : PALETTE.warn;
  return (
    <div>
      <div className="vf-display" style={{ fontSize: 10, color: PALETTE.muted, letterSpacing: '0.12em', margin: '2px 2px 6px' }}>
        SAISIE · {done}/{items.length}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {items.map(({ id, label, done: ok }) => (
          <button
            key={id}
            type="button"
            onClick={() => onJump(id)}
            aria-label={`${label} : ${ok ? 'saisi' : 'à saisir'} — aller à la carte`}
            className="vf-body"
            style={{
              flex: 1, minHeight: 44, padding: '0 4px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              background: ok ? PALETTE.deepSoft : 'transparent',
              border: `1px ${ok ? 'solid' : 'dashed'} ${ok ? PALETTE.deep : missingColor}`,
              borderRadius: 12, fontSize: 12, fontWeight: 600,
              color: ok ? PALETTE.deep : missingColor,
            }}
          >
            {ok && <Check size={13} strokeWidth={3} style={{ flexShrink: 0 }} />}
            {label}
          </button>
        ))}
      </div>
      {yesterday && (
        <div style={{ marginTop: 6 }}>
          <YesterdayGap yesterday={yesterday} onOpen={onOpenYesterday} />
        </div>
      )}
    </div>
  );
}
