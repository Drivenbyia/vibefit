import { memo } from 'react';
import { PALETTE } from '../../../constants/config.js';
import { fmtInt } from '../../../utils/format.js';
import WidgetTile from '../../ui/WidgetTile.jsx';

const big = { fontSize: 30, lineHeight: 1 };
const sub = { fontSize: 12, color: PALETTE.muted, textTransform: 'none' };

function Kcal({ value }) {
  return <span className="vf-hero vf-tabular" style={big}>{value != null ? fmtInt(value) : '—'}<span className="vf-body" style={sub}> kcal</span></span>;
}

/**
 * Tes cibles en un coup d'œil, avant les réglages. Pendant une phase : cible
 * unique et ses protéines ; sinon les deux cibles cyclées. Lecture seule —
 * chaque réglage reste dans sa carte en dessous.
 */
function TargetsWidgets({ phaseTarget, train, off, stepsTarget, baseTDEE }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
      {phaseTarget ? (
        <>
          <WidgetTile label="CIBLE UNIQUE" delay={0}>
            <Kcal value={phaseTarget.kcal} />
            <span style={sub}>pendant la phase</span>
          </WidgetTile>
          <WidgetTile label="PROTÉINES" delay={0.05}>
            <span className="vf-hero vf-tabular" style={{ ...big, color: PALETTE.aqua }}>{phaseTarget.protein}<span className="vf-body" style={sub}> g/j</span></span>
            <span style={sub}>G {phaseTarget.carbs} · L {phaseTarget.fat}</span>
          </WidgetTile>
        </>
      ) : (
        <>
          <WidgetTile label="JOUR TRAIN" delay={0}>
            <Kcal value={train?.kcal} />
            <span style={sub}>P {train?.protein ?? '—'} · G {train?.carbs ?? '—'} · L {train?.fat ?? '—'}</span>
          </WidgetTile>
          <WidgetTile label="JOUR OFF" delay={0.05}>
            <Kcal value={off?.kcal} />
            <span style={sub}>P {off?.protein ?? '—'} · G {off?.carbs ?? '—'} · L {off?.fat ?? '—'}</span>
          </WidgetTile>
        </>
      )}
      <WidgetTile label="PAS / JOUR" delay={0.1}>
        <span className="vf-hero vf-tabular" style={{ ...big, color: PALETTE.sky }}>{stepsTarget ? fmtInt(stepsTarget) : '—'}</span>
        <span style={sub}>objectif quotidien</span>
      </WidgetTile>
      <WidgetTile label="BASE TDEE" delay={0.15}>
        <Kcal value={baseTDEE} />
        <span style={sub}>maintenance retenue</span>
      </WidgetTile>
    </div>
  );
}

export default memo(TargetsWidgets);
