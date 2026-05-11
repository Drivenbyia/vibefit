import { useMemo, useState, useCallback } from 'react';
import { Ruler, Scale, TrendingDown, TrendingUp, Minus, Zap, Beef, Wheat, Droplets, ClipboardCopy, Check } from 'lucide-react';
import { getHistoricalWeeks } from '../../utils/exportUtils.js';
import { PALETTE, DEFAULT_TARGETS } from '../../constants/config.js';
import { addDays, startOfWeek, fmtFr, shortFr } from '../../utils/dateUtils.js';
import { num, calculateWeeklyBalance, calculateWeightStats } from '../../utils/mathUtils.js';
import { dayType } from '../../models/day.js';
import Card from '../ui/Card.jsx';

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 10,
      fontWeight: 700,
      color: PALETTE.muted,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      marginBottom: 12,
    }}>
      {children}
    </div>
  );
}

function MacroBar({ label, icon: Icon, value, target, color }) {
  const pct = target > 0 ? Math.min((value / target) * 100, 120) : 0;
  const isOver = pct > 108;

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Icon size={12} color={color} strokeWidth={2.5} />
          <span style={{ fontSize: 11, fontWeight: 700, color: PALETTE.muted, letterSpacing: '0.08em' }}>
            {label}
          </span>
        </div>
        <span style={{ fontSize: 13, fontWeight: 800, color: isOver ? PALETTE.accent : PALETTE.ink }}>
          {Math.round(value)}
          <span style={{ fontSize: 10, fontWeight: 500, color: PALETTE.muted, marginLeft: 3 }}>
            / {Math.round(target)} g
          </span>
        </span>
      </div>
      <div style={{ height: 5, background: PALETTE.paper, borderRadius: 999, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${Math.min(pct, 100)}%`,
          background: isOver ? PALETTE.accent : color,
          borderRadius: 999,
          transition: 'width 0.5s cubic-bezier(.4,0,.2,1)',
        }} />
      </div>
    </div>
  );
}

function DayBar({ day, dayKey, target, isToday, onPress }) {
  const kcal = day ? num(day.intake?.kcal) : 0;
  const hasData = kcal > 0;
  const pct = target > 0 ? (kcal / target) * 100 : 0;
  const isOver = pct > 110;
  const isLow = hasData && pct < 80;
  const barColor = !hasData ? PALETTE.line
    : isOver ? PALETTE.accent
    : isLow ? PALETTE.warn
    : PALETTE.deep;
  const barH = hasData ? Math.max((pct / 130) * 52, 6) : 3;

  return (
    <button
      onClick={() => onPress(dayKey)}
      style={{
        flex: 1,
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: '0 2px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
      }}
    >
      <div style={{
        fontSize: 9,
        fontWeight: 700,
        color: isToday ? PALETTE.accent : PALETTE.muted,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
      }}>
        {shortFr(dayKey)}
      </div>
      <div style={{ height: 56, display: 'flex', alignItems: 'flex-end', width: '100%' }}>
        <div style={{
          width: '100%',
          height: barH,
          background: barColor,
          borderRadius: '3px 3px 0 0',
          opacity: hasData ? 1 : 0.35,
          outline: isToday ? `2px solid ${PALETTE.accent}` : 'none',
          outlineOffset: 1,
        }} />
      </div>
      <div style={{
        fontSize: 9,
        fontWeight: hasData ? 700 : 400,
        color: hasData ? PALETTE.ink : PALETTE.muted,
        letterSpacing: '0.02em',
      }}>
        {hasData ? `${(kcal / 1000).toFixed(1)}k` : '—'}
      </div>
    </button>
  );
}

export default function WeekView({ dateKey, data, setDateKey, targets, stepsTarget }) {
  const [copied, setCopied] = useState(false);

  const handleExport = useCallback(async () => {
    const markdown = getHistoricalWeeks(8);
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {
      // clipboard refusé — silencieux
    }
  }, []);
  const resolvedTargets = targets ?? DEFAULT_TARGETS;
  const start = startOfWeek(dateKey);

  const days = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const k = addDays(start, i);
      return { key: k, day: data?.days?.[k] ?? null };
    })
  , [start, data?.days]);

  const weekly = useMemo(
    () => calculateWeeklyBalance(days, resolvedTargets),
    [days, resolvedTargets]
  );

  const plannedTrain = days.filter(({ key, day }) => dayType(key, day) === 'train').length;

  const waistSeries = days
    .map(({ key, day }) => ({ key, w: day?.waist ? num(day.waist) : null }))
    .filter((p) => p.w !== null);

  const { avgWeight, weightDelta, weightSeries } = calculateWeightStats(days);

  const balanceColor = weekly.netBalance < -100
    ? PALETTE.deep
    : weekly.netBalance > 100
    ? PALETTE.accent
    : PALETTE.muted;

  const BalanceIcon = weekly.netBalance < -100
    ? TrendingDown
    : weekly.netBalance > 100
    ? TrendingUp
    : Minus;

  const protTarget = resolvedTargets.train?.protein ?? 160;
  const carbsTargetTrain = resolvedTargets.train?.carbs ?? 280;
  const carbsTargetOff = resolvedTargets.off?.carbs ?? 120;
  const avgCarbsTarget = (carbsTargetTrain + carbsTargetOff) / 2;
  const fatTargetTrain = resolvedTargets.train?.fat ?? 70;
  const fatTargetOff = resolvedTargets.off?.fat ?? 75;
  const avgFatTarget = (fatTargetTrain + fatTargetOff) / 2;

  return (
    <div style={{ padding: '14px 14px 100px', display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* ── Header + calendrier ─────────────────────────────── */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: PALETTE.muted, letterSpacing: '0.12em', marginBottom: 3 }}>
              SEMAINE DU
            </div>
            <div className="vf-display" style={{ fontSize: 18, fontWeight: 700 }}>
              {fmtFr(start)}
            </div>
            <div style={{ fontSize: 11, color: PALETTE.muted, marginTop: 2 }}>
              {weekly.recordedDays} / 7 jours saisis
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: PALETTE.muted, letterSpacing: '0.12em', marginBottom: 3 }}>
              SOLDE NET
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
              <BalanceIcon size={16} color={balanceColor} strokeWidth={2.5} />
              <span
                className="vf-display vf-tabular"
                style={{ fontSize: 22, fontWeight: 900, color: balanceColor }}
              >
                {weekly.netBalance >= 0 ? '+' : ''}{Math.round(weekly.netBalance)}
              </span>
              <span className="vf-body" style={{ fontSize: 11, fontWeight: 500, color: PALETTE.muted }}>
                kcal
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {days.map(({ key, day }) => {
            const t = dayType(key, day);
            const recorded = day && (num(day.intake?.kcal) > 0 || day.workout || num(day.expenditure?.steps) > 0);
            const isToday = key === dateKey;
            const dotColor = { train: PALETTE.deep, off: PALETTE.accent, we: PALETTE.muted }[t];
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
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: recorded ? dotColor : 'transparent',
                  border: `1.5px solid ${dotColor}`,
                }} />
              </button>
            );
          })}
        </div>
      </Card>

      {/* ── Section 1 : Bilan Net ───────────────────────────── */}
      <Card>
        <SectionLabel>Bilan Net</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[
            { label: 'APPORT', value: Math.round(weekly.totalIntake), unit: 'kcal', color: PALETTE.ink },
            { label: 'DÉPENSE', value: Math.round(weekly.totalExp), unit: 'kcal', color: PALETTE.ink },
            { label: 'SÉANCES', value: `${weekly.trainDone}/${plannedTrain || 3}`, unit: '', color: weekly.trainDone >= (plannedTrain || 3) ? PALETTE.deep : PALETTE.accent },
          ].map(({ label, value, unit, color }) => (
            <div
              key={label}
              style={{
                background: PALETTE.paper,
                borderRadius: 10,
                padding: '10px 8px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 9, fontWeight: 700, color: PALETTE.muted, letterSpacing: '0.1em', marginBottom: 4 }}>
                {label}
              </div>
              <div className="vf-display vf-tabular" style={{ fontSize: 18, fontWeight: 900, color }}>
                {value}
              </div>
              {unit && (
                <div style={{ fontSize: 9, color: PALETTE.muted, marginTop: 2 }}>{unit}</div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* ── Section 2 : Tendance kcal (barres CSS) ─────────── */}
      <Card>
        <SectionLabel>Tendance calorique</SectionLabel>
        <div style={{ display: 'flex', gap: 0, alignItems: 'flex-end' }}>
          {days.map(({ key, day }) => {
            const t = dayType(key, day);
            const target = resolvedTargets[t]?.kcal ?? resolvedTargets.off.kcal;
            return (
              <DayBar
                key={key}
                dayKey={key}
                day={day}
                target={target}
                isToday={key === dateKey}
                onPress={setDateKey}
              />
            );
          })}
        </div>
        <div style={{
          marginTop: 10,
          paddingTop: 10,
          borderTop: `1px solid ${PALETTE.line}`,
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
        }}>
          {[
            { color: PALETTE.deep, label: 'Dans la cible' },
            { color: PALETTE.accent, label: 'Surplus' },
            { color: PALETTE.warn, label: 'Sous la cible' },
            { color: PALETTE.line, label: 'Non saisi' },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
              <span style={{ fontSize: 10, color: PALETTE.muted }}>{label}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Section 3 : Moyennes par jour saisi ─────────────── */}
      <Card>
        <SectionLabel>
          Moyennes / jour saisi
          {weekly.recordedDays > 0 && (
            <span style={{ color: PALETTE.accent, marginLeft: 6 }}>
              ÷ {weekly.recordedDays}
            </span>
          )}
        </SectionLabel>

        {weekly.recordedDays === 0 ? (
          <div style={{ fontSize: 13, color: PALETTE.muted, padding: '4px 0 8px' }}>
            Aucun jour saisi cette semaine.
          </div>
        ) : (
          <>
            <MacroBar
              label="Protéines"
              icon={Beef}
              value={weekly.avgProt}
              target={protTarget}
              color="#4CAF50"
            />
            <MacroBar
              label="Glucides"
              icon={Wheat}
              value={weekly.avgCarbs}
              target={avgCarbsTarget}
              color="#2196F3"
            />
            <MacroBar
              label="Lipides"
              icon={Droplets}
              value={weekly.avgFat}
              target={avgFatTarget}
              color="#FF9800"
            />
            <div style={{
              marginTop: 12,
              paddingTop: 10,
              borderTop: `1px solid ${PALETTE.line}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Zap size={12} color={PALETTE.muted} strokeWidth={2.5} />
                <span style={{ fontSize: 11, fontWeight: 700, color: PALETTE.muted, letterSpacing: '0.08em' }}>
                  KCAL MOY.
                </span>
              </div>
              <div className="vf-tabular" style={{ fontSize: 16, fontWeight: 800, color: PALETTE.ink }}>
                {Math.round(weekly.avgIntake)}
                <span style={{ fontSize: 10, fontWeight: 500, color: PALETTE.muted, marginLeft: 4 }}>
                  kcal / {Math.round(weekly.avgKcalTarget)} cible
                </span>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* ── Tour de taille ──────────────────────────────────── */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Ruler size={16} color={PALETTE.deep} />
          <div className="vf-body" style={{ fontSize: 14, fontWeight: 700, color: PALETTE.ink, letterSpacing: '0.02em' }}>
            TOUR DE TAILLE
          </div>
        </div>
        {waistSeries.length === 0 ? (
          <div style={{ fontSize: 13, color: PALETTE.muted, padding: '4px 0' }}>
            Aucune mesure cette semaine. Mesure-toi le lundi à jeun.
          </div>
        ) : (
          waistSeries.map(({ key, w }) => (
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
          ))
        )}
      </Card>

      {/* ── Poids ───────────────────────────────────────────── */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Scale size={16} color={PALETTE.deep} />
          <div className="vf-body" style={{ fontSize: 14, fontWeight: 700, color: PALETTE.ink, letterSpacing: '0.02em' }}>
            POIDS
          </div>
          {avgWeight !== null && (
            <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: PALETTE.ink }}>
              moy. {avgWeight.toFixed(1)} kg
            </span>
          )}
        </div>
        {weightSeries.length === 0 ? (
          <div style={{ fontSize: 13, color: PALETTE.muted, padding: '4px 0' }}>
            Aucune pesée cette semaine. Pèse-toi chaque matin à jeun.
          </div>
        ) : (
          <>
            {weightSeries.map(({ key, w }) => (
              <div key={key} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '8px 0', borderBottom: `1px solid ${PALETTE.line}`,
              }}>
                <span className="vf-body" style={{ fontSize: 13, color: PALETTE.muted, textTransform: 'capitalize' }}>
                  {fmtFr(key)}
                </span>
                <span className="vf-mono vf-tabular" style={{ fontSize: 14, fontWeight: 700, color: PALETTE.ink }}>
                  {w.toFixed(1)} kg
                </span>
              </div>
            ))}
            {weightDelta !== null && (
              <div style={{
                marginTop: 10, padding: '8px 10px',
                background: weightDelta < 0 ? PALETTE.deepSoft : weightDelta > 0 ? PALETTE.highlight : PALETTE.paper,
                borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {weightDelta < 0
                  ? <TrendingDown size={14} color={PALETTE.deep} strokeWidth={2.5} />
                  : weightDelta > 0
                  ? <TrendingUp size={14} color={PALETTE.accent} strokeWidth={2.5} />
                  : <Minus size={14} color={PALETTE.muted} strokeWidth={2.5} />}
                <span className="vf-body" style={{
                  fontSize: 12, fontWeight: 700,
                  color: weightDelta < 0 ? PALETTE.deep : weightDelta > 0 ? PALETTE.accent : PALETTE.muted,
                }}>
                  {weightDelta >= 0 ? '+' : ''}{weightDelta.toFixed(1)} kg sur la semaine
                </span>
              </div>
            )}
          </>
        )}
      </Card>

      {/* ── Rappel hebdo ────────────────────────────────────── */}
      <Card style={{ background: PALETTE.deepSoft, borderColor: PALETTE.deep }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ flexShrink: 0, width: 4, alignSelf: 'stretch', background: PALETTE.deep, borderRadius: 2 }} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: PALETTE.deep, letterSpacing: '0.04em', marginBottom: 6, textTransform: 'uppercase' }}>
              Rappel hebdo
            </div>
            <div style={{ fontSize: 13, color: PALETTE.ink, lineHeight: 1.5 }}>
              Le solde ({Math.round(weekly.netBalance)} kcal) est fiable <strong>uniquement si tu saisis les calories
              TOTALES Garmin</strong> (BMR + actif), pas juste les calories de séance.
              {' '}Le déficit hebdo cible est <strong>≈ −1900 kcal</strong>.
              {weekly.netBalance > -1000 && weekly.netBalance < 0 && weekly.recordedDays > 0 && " Continue, c'est bon."}
              {weekly.netBalance >= 0 && weekly.recordedDays > 0 && ' Vérifie que tu saisis bien les calories totales Garmin.'}
              {weekly.netBalance <= -2500 && ' Déficit important : assure-toi de bien recharger les jours TRAIN.'}
            </div>
          </div>
        </div>
      </Card>

      {/* ── Export AI Bridge ────────────────────────────────── */}
      <button
        onClick={handleExport}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          width: '100%',
          padding: '12px 16px',
          background: 'transparent',
          border: `1.5px solid ${PALETTE.line}`,
          borderRadius: 12,
          cursor: 'pointer',
          color: copied ? PALETTE.deep : PALETTE.muted,
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: '0.04em',
          transition: 'color 0.2s, border-color 0.2s',
          borderColor: copied ? PALETTE.deep : PALETTE.line,
        }}
      >
        {copied
          ? <Check size={15} strokeWidth={2.5} />
          : <ClipboardCopy size={15} strokeWidth={2.5} />}
        {copied ? 'Copié !' : 'Partager au Coach'}
      </button>

    </div>
  );
}
