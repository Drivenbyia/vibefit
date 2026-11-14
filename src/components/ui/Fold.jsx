import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { PALETTE } from '../../constants/config.js';

/**
 * Section repliable — pour ce qui se consulte ou se règle rarement. Une barre
 * de titre (≥ 44 px) et, ouverte, les cartes qu'elle contient, inchangées.
 * `<details>` natif : état géré par le navigateur, accessible au clavier et
 * aux lecteurs d'écran sans code. L'ouverture initiale est figée au montage :
 * une section ne se referme pas sous les doigts parce qu'une valeur change.
 */
export default function Fold({ title, hint, defaultOpen = false, children }) {
  const [initiallyOpen] = useState(defaultOpen);
  return (
    <details className="vf-fold" open={initiallyOpen}>
      <summary
        className="vf-body"
        style={{
          minHeight: 44, padding: '0 14px', cursor: 'pointer', listStyle: 'none',
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'transparent', border: `1px solid ${PALETTE.line}`, borderRadius: 16,
        }}
      >
        <span className="vf-display" style={{ fontSize: 11, color: PALETTE.ink, letterSpacing: '0.1em', textTransform: 'uppercase', flexShrink: 0 }}>
          {title}
        </span>
        {hint && (
          <span style={{ fontSize: 11, color: PALETTE.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {hint}
          </span>
        )}
        <ChevronDown className="vf-fold-chevron" size={16} color={PALETTE.muted} style={{ marginLeft: 'auto', flexShrink: 0 }} />
      </summary>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
        {children}
      </div>
    </details>
  );
}
