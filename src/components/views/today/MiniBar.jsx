import { fmtInt } from '../../../utils/format.js';
import { ringProgress } from '../../../utils/quickEntry.js';

/** Barre compacte d'un widget : libellé, valeur / cible, remplissage animé. Sans cible : valeur seule. */
export default function MiniBar({ label, value, target, color }) {
  const p = ringProgress(value, target);
  return (
    <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span className="vf-mono vf-tabular" style={{ fontSize: 10, display: 'flex', justifyContent: 'space-between' }}>
        <span>{label}</span>
        <span>{value > 0 ? fmtInt(value) : '—'}{target ? `/${fmtInt(target)}` : ''} g</span>
      </span>
      <span style={{ height: 6, borderRadius: 9, background: `${color}2E`, overflow: 'hidden' }}>
        <span style={{
          display: 'block', height: '100%', width: `${(p ?? 0) * 100}%`, background: color, borderRadius: 9,
          transition: 'width .8s cubic-bezier(.3,.7,.2,1)',
        }} />
      </span>
    </span>
  );
}
