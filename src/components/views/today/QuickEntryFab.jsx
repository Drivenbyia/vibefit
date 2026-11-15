import { memo } from 'react';
import { Plus } from 'lucide-react';
import { PALETTE, glow } from '../../../constants/config.js';

/** Bouton « + » flottant au-dessus de la barre de navigation : ouvre la saisie rapide. */
function QuickEntryFab({ onPress }) {
  return (
    <div style={{ position: 'fixed', left: 0, right: 0, bottom: 'calc(76px + env(safe-area-inset-bottom))', zIndex: 110, pointerEvents: 'none' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', justifyContent: 'flex-end', padding: '0 18px' }}>
        <button
          type="button"
          onClick={onPress}
          aria-label="Saisie rapide"
          className="vf-press"
          style={{
            pointerEvents: 'auto', width: 62, height: 62, borderRadius: 31, cursor: 'pointer',
            border: `4px solid ${PALETTE.bg}`, background: PALETTE.deep, color: PALETTE.inkSoft,
            display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: glow(PALETTE.deep, 22),
          }}
        >
          <Plus size={28} strokeWidth={3} />
        </button>
      </div>
    </div>
  );
}

export default memo(QuickEntryFab);
