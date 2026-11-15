import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { PALETTE } from '../../constants/config.js';

/**
 * Pile de cartes façon Wallet : la première carte entière, les suivantes
 * dépassent dessous en languettes (titre lisible, couleur d'état). Un appui
 * sur une languette déplie la pile ; « Replier » la referme. Une seule carte :
 * pas de pile.
 *
 * `items` : [{ id, label, tone, toneSoft, node }] — `label` nomme la carte
 * sur sa languette, `tone`/`toneSoft` = paire AA de DESIGN.md §1.
 */
export default function CardStack({ items }) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;
  if (items.length === 1) return items[0].node;

  if (open) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map((item) => <div key={item.id} className="vf-rise">{item.node}</div>)}
        <button type="button" onClick={() => setOpen(false)} className="vf-display"
          style={{ alignSelf: 'center', minHeight: 44, padding: '0 18px', borderRadius: 999, border: 'none', cursor: 'pointer', background: PALETTE.surface, color: PALETTE.muted, fontSize: 10, letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 6 }}>
          <ChevronUp size={14} /> REPLIER LA PILE
        </button>
      </div>
    );
  }

  const [front, ...rest] = items;
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'relative', zIndex: rest.length + 1 }}>{front.node}</div>
      {rest.map((item, i) => (
        <button
          key={item.id}
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`${item.label} — déplier les ${items.length} cartes`}
          className="vf-press"
          style={{
            position: 'relative', zIndex: rest.length - i,
            margin: `-18px ${(i + 1) * 10}px 0`, padding: '24px 16px 8px', minHeight: 44,
            border: 'none', borderRadius: '0 0 20px 20px', cursor: 'pointer',
            background: item.toneSoft, filter: `brightness(${1 - (i + 1) * 0.12})`,
            display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left',
          }}
        >
          <span className="vf-display" style={{ fontSize: 10, letterSpacing: '0.08em', color: item.tone, textTransform: 'uppercase' }}>
            {item.label}
          </span>
          {i === rest.length - 1 && <ChevronDown size={14} color={item.tone} style={{ marginLeft: 'auto' }} />}
        </button>
      ))}
    </div>
  );
}
