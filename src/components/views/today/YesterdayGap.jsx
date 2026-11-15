import { ChevronRight } from 'lucide-react';
import { PALETTE } from '../../../constants/config.js';

/** « Hier à compléter : … » — ouvre la veille. Rien si hier est complet. */
export default function YesterdayGap({ yesterday, onOpen }) {
  if (!yesterday) return null;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="vf-body"
      style={{
        width: '100%', minHeight: 44, padding: '0 12px', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 6, textAlign: 'left',
        background: PALETTE.warnSoft, border: `1px solid ${PALETTE.warn}`, borderRadius: 12,
        fontSize: 12, color: PALETTE.ink,
      }}
    >
      <span>
        <strong style={{ color: PALETTE.warn }}>Hier à compléter</strong> : {yesterday.missing.join(', ')}
      </span>
      <ChevronRight size={16} color={PALETTE.warn} style={{ marginLeft: 'auto', flexShrink: 0 }} />
    </button>
  );
}
