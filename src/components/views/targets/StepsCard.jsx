import { Footprints, Minus, Plus } from 'lucide-react';
import { PALETTE } from '../../../constants/config.js';
import { fmtInt } from '../../../utils/format.js';
import { snap } from '../../../utils/quickEntry.js';
import Card from '../../ui/Card.jsx';

const RANGE = { min: 2000, max: 20000, step: 500 };
const roundBtn = { width: 48, height: 48, borderRadius: 24, border: 'none', background: PALETTE.surfaceRaised, color: PALETTE.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 };

/**
 * Objectif de pas réglé à la réglette (comme le panneau « + »), au cran de
 * 500 pas ; ± pour un cran. Une valeur hors réglette (ancienne saisie libre)
 * s'affiche telle quelle jusqu'au premier réglage.
 */
export default function StepsCard({ stepsTarget, onChange }) {
  const value = Number(stepsTarget) || 8000;
  const set = (v) => onChange(String(snap(v, RANGE)));
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Footprints size={16} color={PALETTE.sky} />
        <div className="vf-display" style={{ fontSize: 11, color: PALETTE.ink, letterSpacing: '0.1em' }}>
          OBJECTIF DE PAS QUOTIDIEN
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
        <button type="button" aria-label="500 pas de moins" onClick={() => set(value - RANGE.step)} style={roundBtn}><Minus size={20} /></button>
        <div style={{ textAlign: 'center' }}>
          <div className="vf-hero vf-tabular" aria-live="polite" style={{ fontSize: 48, lineHeight: 1, color: PALETTE.sky, textShadow: `0 0 22px ${PALETTE.sky}55` }}>{fmtInt(value)}</div>
          <div style={{ fontSize: 12, color: PALETTE.muted }}>pas par jour</div>
        </div>
        <button type="button" aria-label="500 pas de plus" onClick={() => set(value + RANGE.step)} style={roundBtn}><Plus size={20} /></button>
      </div>
      <input className="vf-ruler" type="range" min={RANGE.min} max={RANGE.max} step={RANGE.step} value={value}
        onChange={(e) => set(Number(e.target.value))} aria-label="Objectif de pas quotidien" style={{ '--vf-ruler': PALETTE.sky }} />
    </Card>
  );
}
