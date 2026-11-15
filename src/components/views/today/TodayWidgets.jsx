import { memo } from 'react';
import { HeartPulse } from 'lucide-react';
import { PALETTE } from '../../../constants/config.js';
import { num } from '../../../utils/mathUtils.js';
import { fmtDec, fmtInt } from '../../../utils/format.js';
import { formatSleep } from '../../../utils/quickEntry.js';
import WidgetTile from '../../ui/WidgetTile.jsx';
import Sparkline from '../../ui/Sparkline.jsx';
import MiniBar from './MiniBar.jsx';

const big = { fontSize: 32, lineHeight: 1 };
const unit = { fontSize: 13, color: PALETTE.muted, textTransform: 'none' };

/** Grille 2 × 2 : poids, sommeil, macros, cœur. Poids et sommeil ouvrent la saisie rapide. */
function TodayWidgets({ day, dt, weightSeries, isToday, onPick }) {
  const weight = num(day.weight);
  const sleepMin = num(day.sleep?.durationMin);
  const rhr = num(day.sleep?.rhr);
  const sdnn = num(day.sleep?.hrvSdnn);
  const tone = isToday ? PALETTE.muted : PALETTE.warn;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
      <WidgetTile label="POIDS" missing={!weight} missingTone={tone} onPress={() => onPick('weight')} delay={0.05}>
        <span className="vf-hero vf-tabular" style={big}>{weight ? fmtDec(weight) : '—'}<span className="vf-body" style={unit}> kg</span></span>
        <span style={{ fontSize: 12, color: weight ? PALETTE.muted : tone }}>{weight ? 'pesée du matin' : 'à saisir · touche'}</span>
        <span style={{ marginTop: 'auto' }}>
          <Sparkline points={weightSeries} color={PALETTE.ink} height={30} minSpan={2} label="Pesées des 14 derniers jours" />
        </span>
      </WidgetTile>
      <WidgetTile label="SOMMEIL" missing={!sleepMin} missingTone={tone} onPress={() => onPick('sleep')} delay={0.1}>
        <span className="vf-hero vf-tabular" style={big}>{sleepMin ? formatSleep(sleepMin) : '—'}</span>
        <span style={{ fontSize: 12, color: sleepMin ? PALETTE.muted : tone }}>
          {sleepMin ? (num(day.sleep?.score) ? `score ${num(day.sleep.score)}/100` : 'nuit dernière') : 'à saisir · touche'}
        </span>
      </WidgetTile>
      <WidgetTile label="MACROS" delay={0.15}>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
          <MiniBar label="GLU" value={num(day.intake.carbs)} target={dt.carbs} color={PALETTE.slate} />
          <MiniBar label="LIP" value={num(day.intake.fat)} target={dt.fat} color={PALETTE.umber} />
        </span>
      </WidgetTile>
      <WidgetTile label="CŒUR" delay={0.2}>
        <span style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span className="vf-hero vf-tabular" style={big}>{rhr ? fmtInt(rhr) : '—'}</span>
          <span style={unit}>bpm repos</span>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 'auto' }}>
          <HeartPulse size={16} color={PALETTE.alert} className={rhr ? 'vf-pulse' : ''} aria-hidden="true" />
          <span className="vf-mono" style={{ fontSize: 11 }}>{sdnn ? `VFC ${fmtInt(sdnn)} ms` : 'VFC —'}</span>
        </span>
      </WidgetTile>
    </div>
  );
}

export default memo(TodayWidgets);
