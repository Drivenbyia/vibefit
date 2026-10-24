import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PALETTE } from '../../constants/config.js';
import { addDays, fmtFr } from '../../utils/dateUtils.js';

const navButtonStyle = {
  background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 12,
  padding: 10, cursor: 'pointer', color: PALETTE.ink, display: 'flex',
  minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center',
};

/**
 * Navigation jour par jour de l'en-tête. Un tap sur la date ramène à
 * aujourd'hui. Cibles tactiles ≥ 44 px (DESIGN.md).
 */
export default function DateNav({ dateKey, setDateKey, today }) {
  return (
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
  );
}
