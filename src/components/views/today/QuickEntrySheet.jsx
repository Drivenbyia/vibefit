import { useEffect } from 'react';
import { Minus, Plus } from 'lucide-react';
import { PALETTE, sticker } from '../../../constants/config.js';
import { QUICK_METRICS } from '../../../utils/quickEntry.js';
import HealthImportButton from './HealthImportButton.jsx';

const COLORS = { kcal: PALETTE.ember, protein: PALETTE.aqua, steps: PALETTE.sky, weight: PALETTE.ink, sleep: PALETTE.umber };
const roundBtn = { width: 56, height: 56, borderRadius: 28, border: 'none', background: PALETTE.surfaceRaised, color: PALETTE.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 };

/**
 * Panneau de saisie rapide : une mesure à la fois, réglée du pouce sur une
 * réglette (± pour le cran fin), import Santé à portée. Rien n'est écrit
 * avant « Enregistrer » ; toucher le fond ou Échap referme sans écrire.
 */
export default function QuickEntrySheet({ entry, healthImport }) {
  const { metric, range, draft, open, close, change, nudge, save } = entry;
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  const color = COLORS[metric.id];
  return (
    <div role="dialog" aria-modal="true" aria-label={`Saisie rapide — ${metric.label}`} style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <button type="button" aria-label="Fermer sans enregistrer" onClick={close} className="vf-fadein" style={{ position: 'absolute', inset: 0, border: 'none', background: 'rgba(10,6,14,.75)', cursor: 'pointer' }} />
      <div className="vf-sheet" style={{ position: 'relative', width: '100%', maxWidth: 720, margin: '0 auto', background: PALETTE.surface, borderRadius: '28px 28px 0 0', padding: '12px 18px max(22px, env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <span aria-hidden="true" style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 9, background: PALETTE.line }} />
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
          {QUICK_METRICS.map((m) => {
            const on = m.id === metric.id;
            return (
              <button key={m.id} type="button" aria-pressed={on} onClick={() => open(m.id)} className="vf-display"
                style={{ flexShrink: 0, minHeight: 44, padding: '0 14px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: 11, letterSpacing: '0.06em', background: on ? PALETTE.ink : PALETTE.surfaceRaised, color: on ? PALETTE.inkSoft : PALETTE.ink }}>
                {m.label.toUpperCase()}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <button type="button" aria-label="Un cran de moins" onClick={() => nudge(-1)} style={roundBtn}><Minus size={24} /></button>
          <div style={{ textAlign: 'center', minWidth: 0 }}>
            <div className="vf-hero vf-tabular" aria-live="polite" style={{ fontSize: 76, lineHeight: 1, color, textShadow: `0 0 26px ${color}66` }}>{metric.format(draft)}</div>
            <div style={{ fontSize: 14, color: PALETTE.muted }}>{metric.unit}</div>
          </div>
          <button type="button" aria-label="Un cran de plus" onClick={() => nudge(1)} style={roundBtn}><Plus size={24} /></button>
        </div>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span className="vf-mono" style={{ fontSize: 10, color: PALETTE.muted, display: 'flex', justifyContent: 'space-between' }}>
            <span>{metric.format(range.min)}</span><span>GLISSE</span><span>{metric.format(range.max)}</span>
          </span>
          <input className="vf-ruler" type="range" min={range.min} max={range.max} step={range.step} value={draft}
            onChange={(e) => change(e.target.value)} aria-label={metric.label} style={{ '--vf-ruler': color }} />
        </label>
        <HealthImportButton status={healthImport.status} onImport={healthImport.importFromClipboard} compact />
        <button type="button" onClick={save} className="vf-display"
          style={{ minHeight: 56, border: 'none', borderRadius: 18, cursor: 'pointer', background: PALETTE.deep, color: PALETTE.inkSoft, fontSize: 15, letterSpacing: '0.06em', boxShadow: sticker('#0B3F14', 4) }}>
          ENREGISTRER
        </button>
      </div>
    </div>
  );
}
