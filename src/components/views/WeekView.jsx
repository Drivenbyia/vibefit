import { useMemo } from 'react';
import { Ruler } from 'lucide-react';
import { PALETTE } from '../../constants/config.js';
import { addDays, startOfWeek, fmtFr, shortFr } from '../../utils/dateUtils.js';
import { num } from '../../utils/mathUtils.js';
import { dayType } from '../../models/day.js';
import Card from '../ui/Card.jsx';
import StatCard from '../ui/StatCard.jsx';

export default function WeekView({ dateKey, data, setDateKey, targets, stepsTarget }) {
  const start = startOfWeek(dateKey);
  const days = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const k = addDays(start, i);
      return { key: k, day: data.days[k] || null };
    })
  , [start, data.days]);

  let totalIntake = 0, totalExp = 0, totalSteps = 0, totalProt = 0;
  let trainCompleted = 0;
  days.forEach(({ key, day }) => {
    if (!day) return;
    totalIntake += num(day.intake.kcal);
    totalExp += num(day.expenditure.kcal);
    totalSteps += num(day.expenditure.steps);
    totalProt += num(day.intake.protein);
    if (day.workout) trainCompleted += 1;
  });
  const plannedTrainTotal = days.filter(d => dayType(d.key, d.day) === 'train').length;
  const balance = totalIntake - totalExp;
  const recordedDays = days.filter(d => d.day && (num(d.day.intake.kcal) > 0 || num(d.day.expenditure.kcal) > 0)).length;

  const waistSeries = days
    .map(({ key, day }) => ({ key, w: day && day.waist ? num(day.waist) : null }))
    .filter((p) => p.w !== null);

  return (
    <div style={{ padding: '14px 14px 100px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: PALETTE.muted, letterSpacing: '0.1em' }}>
              SEMAINE DU
            </div>
            <div className="vf-display" style={{ fontSize: 18, fontWeight: 700 }}>
              {fmtFr(start)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: PALETTE.muted, letterSpacing: '0.1em' }}>
              SOLDE NET
            </div>
            <div
              className="vf-display vf-tabular"
              style={{
                fontSize: 22, fontWeight: 900,
                color: balance < 0 ? PALETTE.deep : balance > 0 ? PALETTE.accent : PALETTE.ink,
              }}
            >
              {balance >= 0 ? '+' : ''}{Math.round(balance)}
              <span className="vf-body" style={{ fontSize: 12, fontWeight: 500, color: PALETTE.muted, marginLeft: 4 }}>
                kcal
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {days.map(({ key, day }) => {
            const t = dayType(key, day);
            const recorded = day && (num(day.intake.kcal) > 0 || day.workout || num(day.expenditure.steps) > 0);
            const isToday = key === dateKey;
            const colorMap = { train: PALETTE.deep, off: PALETTE.accent, we: PALETTE.muted };
            return (
              <button
                key={key}
                onClick={() => setDateKey(key)}
                style={{
                  background: isToday ? PALETTE.ink : PALETTE.paper,
                  border: `2px solid ${isToday ? PALETTE.accent : 'transparent'}`,
                  borderRadius: 10,
                  padding: '8px 4px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  color: isToday ? '#fff' : PALETTE.ink,
                }}
              >
                <span className="vf-body" style={{ fontSize: 9, fontWeight: 700, opacity: 0.7, textTransform: 'uppercase' }}>
                  {shortFr(key)}
                </span>
                <span className="vf-display vf-tabular" style={{ fontSize: 16, fontWeight: 900 }}>
                  {key.slice(8, 10)}
                </span>
                <span
                  style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: recorded ? colorMap[t] : 'transparent',
                    border: `1.5px solid ${colorMap[t]}`,
                  }}
                />
              </button>
            );
          })}
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <StatCard label="APPORT TOTAL" value={Math.round(totalIntake)} unit="kcal" sub={`${recordedDays}/7 jours saisis`} />
        <StatCard label="DÉPENSE TOTALE" value={Math.round(totalExp)} unit="kcal" sub="Garmin" />
        <StatCard label="PAS CUMULÉS" value={Math.round(totalSteps).toLocaleString('fr-FR')} unit="" sub={`Cible : ${(stepsTarget * 5).toLocaleString('fr-FR')} (Lun-Ven)`} />
        <StatCard label="PROTÉINES" value={Math.round(totalProt)} unit="g" sub={`Cible : ${(targets.train.protein || 160) * 7}g`} />
        <StatCard label="SÉANCES" value={`${trainCompleted}/${plannedTrainTotal || 3}`} unit="" sub="dont 1× Bas du corps obligatoire" colSpan={2} />
      </div>

      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Ruler size={16} color={PALETTE.deep} />
          <div className="vf-body" style={{ fontSize: 14, fontWeight: 700, color: PALETTE.ink, letterSpacing: '0.02em' }}>
            TOUR DE TAILLE
          </div>
        </div>
        {waistSeries.length === 0 ? (
          <div style={{ fontSize: 13, color: PALETTE.muted, padding: '10px 0' }}>
            Aucune mesure cette semaine. Mesure-toi le lundi à jeun.
          </div>
        ) : (
          <div>
            {waistSeries.map(({ key, w }) => (
              <div key={key} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '8px 0', borderBottom: `1px solid ${PALETTE.line}`,
              }}>
                <span className="vf-body" style={{ fontSize: 13, color: PALETTE.muted, textTransform: 'capitalize' }}>
                  {fmtFr(key)}
                </span>
                <span className="vf-mono vf-tabular" style={{ fontSize: 14, fontWeight: 700, color: PALETTE.ink }}>
                  {w} cm
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card style={{ background: PALETTE.deepSoft, borderColor: PALETTE.deep }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ flexShrink: 0, width: 4, alignSelf: 'stretch', background: PALETTE.deep, borderRadius: 2 }} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: PALETTE.deep, letterSpacing: '0.04em', marginBottom: 6, textTransform: 'uppercase' }}>
              Rappel hebdo
            </div>
            <div style={{ fontSize: 13, color: PALETTE.ink, lineHeight: 1.5 }}>
              Le solde ({Math.round(balance)} kcal) est fiable <strong>uniquement si tu saisis les calories TOTALES
              Garmin</strong> (BMR + actif), pas juste les calories de séance.
              Sinon le solde est faussé de +2000 kcal.
              {' '}Le déficit hebdo cible est <strong>≈ −1900 kcal</strong>.
              {balance > -1000 && balance < 0 && " Continue, c'est bon."}
              {balance >= 0 && recordedDays > 0 && ' Vérifie que tu saisis bien les calories totales Garmin.'}
              {balance <= -2500 && ' Déficit important : assure-toi de bien recharger les jours TRAIN.'}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
