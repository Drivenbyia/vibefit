import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, Activity, Database, Download, Upload,
  Trash2, Flame, Footprints, Dumbbell, Ruler, FileText,
  AlertCircle, Check, ArrowRight, RotateCcw, Target
} from 'lucide-react';

/* =========================================================================
   VIBEFIT — Daily tracker
   Architecture en 3 vues : Aujourd'hui / Semaine / Données
   Stockage : window.storage (persistant côté Claude) + export/import JSON
   ========================================================================= */

// --- VIBEFIT protocol targets (defaults) ---
const DEFAULT_TARGETS = {
  train: { kcal: 2400, protein: 160, carbs: 280, fat: 70, label: 'TRAIN' },
  off:   { kcal: 1900, protein: 160, carbs: 120, fat: 75, label: 'OFF' },
  we:    { kcal: null, protein: 160, carbs: null, fat: null, label: 'WE' },
};
const DEFAULT_STEPS_TARGET = 8000;
const STORAGE_KEY = 'vibefit_v1';

// --- Presets (for cutting / bulking phases) ---
// Each preset defines full kcal/P/G/L per day type.
// Strategy: keep protein at 160g (muscle protection), keep lipids ~stable,
// adjust carbs for the kcal delta.
const PRESETS = {
  maintenance: {
    label: 'Maintenance',
    sub: 'Protocole VIBEFIT par défaut',
    targets: {
      train: { kcal: 2400, protein: 160, carbs: 280, fat: 70, label: 'TRAIN' },
      off:   { kcal: 1900, protein: 160, carbs: 120, fat: 75, label: 'OFF' },
      we:    { kcal: null, protein: 160, carbs: null, fat: null, label: 'WE' },
    },
  },
  cut_light: {
    label: 'Sèche légère',
    sub: '−200 kcal / jour — perte ~250 g/sem',
    targets: {
      train: { kcal: 2200, protein: 160, carbs: 230, fat: 70, label: 'TRAIN' },
      off:   { kcal: 1700, protein: 160, carbs: 90, fat: 70, label: 'OFF' },
      we:    { kcal: null, protein: 160, carbs: null, fat: null, label: 'WE' },
    },
  },
  cut_strong: {
    label: 'Sèche forte',
    sub: '−400 kcal / jour — perte ~500 g/sem',
    targets: {
      train: { kcal: 2000, protein: 170, carbs: 180, fat: 65, label: 'TRAIN' },
      off:   { kcal: 1500, protein: 170, carbs: 60, fat: 65, label: 'OFF' },
      we:    { kcal: null, protein: 170, carbs: null, fat: null, label: 'WE' },
    },
  },
  bulk: {
    label: 'Prise de masse',
    sub: '+250 kcal / jour — gain ~250 g/sem',
    targets: {
      train: { kcal: 2700, protein: 160, carbs: 350, fat: 75, label: 'TRAIN' },
      off:   { kcal: 2200, protein: 160, carbs: 180, fat: 80, label: 'OFF' },
      we:    { kcal: null, protein: 160, carbs: null, fat: null, label: 'WE' },
    },
  },
};

// --- Date utils ---
const toKey = (d) => {
  const x = new Date(d);
  x.setHours(12, 0, 0, 0);
  return x.toISOString().slice(0, 10);
};
const dayTypeFromKey = (key) => {
  const d = new Date(key + 'T12:00:00').getDay();
  if (d === 1 || d === 3 || d === 5) return 'train';
  if (d === 2 || d === 4) return 'off';
  return 'we';
};
const fmtFr = (key) =>
  new Date(key + 'T12:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
const shortFr = (key) =>
  new Date(key + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short' }).slice(0, 3);

const addDays = (key, n) => {
  const d = new Date(key + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return toKey(d);
};
const startOfWeek = (key) => {
  const d = new Date(key + 'T12:00:00');
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // start Monday
  d.setDate(d.getDate() + diff);
  return toKey(d);
};

// --- Empty day record ---
const emptyDay = () => ({
  typeOverride: null, // null = auto
  intake: { kcal: '', protein: '', carbs: '', fat: '' },
  expenditure: { kcal: '', steps: '' },
  workout: null, // 'haut' | 'bas' | null
  waist: '',
  notes: '',
});

const dayType = (key, day) => day?.typeOverride || dayTypeFromKey(key);

// --- Storage hook — localStorage (sync, no loading state needed) ---
function useVibefitStorage() {
  const [data, setData] = useState(() => {
    try {
      if (typeof window === 'undefined') throw new Error('no window');
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          days: parsed.days || {},
          targets: parsed.targets || DEFAULT_TARGETS,
          stepsTarget: parsed.stepsTarget ?? DEFAULT_STEPS_TARGET,
          presetId: parsed.presetId || 'maintenance',
        };
      }
    } catch (e) {
      // First run / SSR / privacy mode — fall through to defaults
    }
    return {
      days: {},
      targets: DEFAULT_TARGETS,
      stepsTarget: DEFAULT_STEPS_TARGET,
      presetId: 'maintenance',
    };
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('VibeFit: failed to persist data', e);
    }
  }, [data]);

  // Always loaded (sync) — third tuple value kept for API parity with prior version
  return [data, setData, true];
}

// --- Number coerce ---
const num = (v) => {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

/* ============================== UI primitives ============================== */

const PALETTE = {
  ink: '#0E1116',
  inkSoft: '#1A1F26',
  paper: '#F6F2EC',
  surface: '#FFFFFF',
  line: '#D9D2C7',
  muted: '#5A6472',
  accent: '#FF5A1F',
  accentDark: '#C73E10',
  deep: '#0B3D2E',
  deepSoft: '#E8F1ED',
  highlight: '#FFF3E6',
  warn: '#B45309',
};

const FontStyles = () => (
  <style>{`
    .vf-display { font-family: 'Archivo', system-ui, sans-serif; letter-spacing: -0.02em; }
    .vf-body { font-family: 'Inter Tight', system-ui, sans-serif; }
    .vf-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }
    .vf-tabular { font-variant-numeric: tabular-nums; }
    .vf-app * { box-sizing: border-box; }
    .vf-no-spin::-webkit-outer-spin-button,
    .vf-no-spin::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
    .vf-no-spin { -moz-appearance: textfield; }
    .vf-pulse { animation: vfpulse 2s ease-in-out infinite; }
    @keyframes vfpulse {
      0%, 100% { opacity: 1; } 50% { opacity: 0.55; }
    }
    .vf-fadein { animation: vffadein 200ms ease-out; }
    @keyframes vffadein {
      from { opacity: 0; transform: translateY(4px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `}</style>
);

function Card({ children, style = {}, className = '' }) {
  return (
    <div
      className={`vf-fadein ${className}`}
      style={{
        background: PALETTE.surface,
        border: `1px solid ${PALETTE.line}`,
        borderRadius: 14,
        padding: 16,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function NumberInput({ value, onChange, placeholder, suffix, min = 0 }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        background: PALETTE.paper,
        border: `1px solid ${PALETTE.line}`,
        borderRadius: 10,
        padding: '10px 12px',
        gap: 6,
      }}
    >
      <input
        type="number"
        inputMode="decimal"
        min={min}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="vf-no-spin vf-tabular vf-body"
        style={{
          flex: 1,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          fontSize: 18,
          fontWeight: 600,
          color: PALETTE.ink,
          width: '100%',
          minWidth: 0,
        }}
      />
      {suffix && (
        <span className="vf-mono" style={{ fontSize: 12, color: PALETTE.muted }}>
          {suffix}
        </span>
      )}
    </div>
  );
}

function Pill({ active, children, onClick, color = PALETTE.ink, bg }) {
  return (
    <button
      onClick={onClick}
      className="vf-body"
      style={{
        flex: 1,
        padding: '10px 12px',
        borderRadius: 10,
        border: `1px solid ${active ? color : PALETTE.line}`,
        background: active ? (bg || color) : 'transparent',
        color: active ? '#fff' : PALETTE.ink,
        fontWeight: 700,
        fontSize: 13,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        cursor: 'pointer',
        transition: 'all 120ms',
      }}
    >
      {children}
    </button>
  );
}

function Bar({ value, target, color, label, unit = 'g' }) {
  const pct = target ? Math.min(120, Math.round((value / target) * 100)) : 0;
  const over = target && value > target * 1.05;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: PALETTE.muted, letterSpacing: '0.06em' }}>
          {label}
        </span>
        <span className="vf-mono vf-tabular" style={{ fontSize: 12, color: PALETTE.ink }}>
          <strong>{Math.round(value)}</strong>
          {target ? <span style={{ color: PALETTE.muted }}> / {target}{unit}</span> : <span style={{ color: PALETTE.muted }}>{unit}</span>}
        </span>
      </div>
      <div style={{ height: 8, background: PALETTE.paper, borderRadius: 99, overflow: 'hidden', border: `1px solid ${PALETTE.line}` }}>
        <div
          style={{
            height: '100%',
            width: `${Math.min(100, pct)}%`,
            background: over ? PALETTE.accent : color,
            borderRadius: 99,
            transition: 'width 200ms ease',
          }}
        />
      </div>
    </div>
  );
}

/* ============================== Header ============================== */

function Header({ dateKey, setDateKey, day, updateDay, targets }) {
  const t = dayType(dateKey, day);
  const dt = targets[t];
  const today = toKey(new Date());

  return (
    <div
      style={{
        background: PALETTE.ink,
        color: '#fff',
        padding: '20px 18px 16px',
        borderRadius: '0 0 18px 18px',
        boxShadow: '0 6px 16px rgba(0,0,0,0.05)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
        <div className="vf-display" style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em' }}>
          VIBE<span style={{ color: PALETTE.accent }}>FIT</span>
        </div>
        <div className="vf-mono" style={{ fontSize: 11, opacity: 0.6 }}>
          {dateKey === today ? 'AUJOURD\'HUI' : 'JOURNAL'}
        </div>
      </div>

      {/* Date navigator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <button
          onClick={() => setDateKey(addDays(dateKey, -1))}
          style={{
            background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 10,
            padding: 10, cursor: 'pointer', color: '#fff', display: 'flex',
          }}
          aria-label="Jour précédent"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          onClick={() => setDateKey(today)}
          className="vf-body"
          style={{
            flex: 1, margin: '0 10px', background: 'transparent', border: 'none',
            color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer',
            textTransform: 'capitalize',
          }}
        >
          {fmtFr(dateKey)}
        </button>
        <button
          onClick={() => setDateKey(addDays(dateKey, 1))}
          style={{
            background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 10,
            padding: 10, cursor: 'pointer', color: '#fff', display: 'flex',
          }}
          aria-label="Jour suivant"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Day type pills */}
      <div style={{ display: 'flex', gap: 8 }}>
        {['train', 'off', 'we'].map((t2) => {
          const active = t === t2;
          const colorMap = { train: PALETTE.deep, off: PALETTE.accent, we: '#888' };
          return (
            <button
              key={t2}
              onClick={() => updateDay({ typeOverride: t === t2 ? null : t2 })}
              className="vf-body"
              style={{
                flex: 1,
                padding: '8px 10px',
                borderRadius: 8,
                border: 'none',
                background: active ? colorMap[t2] : 'rgba(255,255,255,0.08)',
                color: '#fff',
                fontWeight: 700,
                fontSize: 11,
                letterSpacing: '0.08em',
                cursor: 'pointer',
                textTransform: 'uppercase',
              }}
            >
              {targets[t2].label}
              {dt.kcal && t === t2 && (
                <span className="vf-mono" style={{ marginLeft: 6, opacity: 0.85, fontSize: 10 }}>
                  {dt.kcal}kcal
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ============================== Today View ============================== */

function BalanceRing({ intake, expenditure, target }) {
  const balance = intake - expenditure;
  const targetBalance = target ? intake - target : null; // negative means deficit
  const r = 70, c = 2 * Math.PI * r;
  // Show progress towards intake target (or just show intake if no target)
  const pctOfTarget = target ? Math.min(110, (intake / target) * 100) : 0;
  const dash = target ? (Math.min(100, pctOfTarget) / 100) * c : 0;

  let label = '—';
  let sub = 'Pas de cible';
  let color = PALETTE.muted;

  if (target) {
    if (intake === 0) {
      label = `${target}`;
      sub = 'kcal ciblé';
      color = PALETTE.muted;
    } else {
      const delta = intake - target;
      label = (delta >= 0 ? '+' : '') + delta;
      sub = delta < 0 ? 'sous la cible' : delta > 0 ? 'au-dessus' : 'pile';
      color = delta < -100 ? PALETTE.accent : delta > 100 ? PALETTE.warn : PALETTE.deep;
    }
  } else if (intake > 0) {
    label = intake;
    sub = 'kcal apport';
    color = PALETTE.deep;
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
      <svg width="160" height="160" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r={r} fill="none" stroke={PALETTE.paper} strokeWidth="14" />
        {target > 0 && (
          <circle
            cx="80" cy="80" r={r}
            fill="none"
            stroke={color}
            strokeWidth="14"
            strokeDasharray={`${dash} ${c}`}
            strokeDashoffset={c / 4}
            transform="rotate(-90 80 80)"
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 300ms ease' }}
          />
        )}
        <text
          x="80" y="80"
          textAnchor="middle"
          dominantBaseline="central"
          className="vf-display vf-tabular"
          style={{ fontSize: 30, fontWeight: 900, fill: PALETTE.ink }}
        >
          {label}
        </text>
        <text
          x="80" y="105"
          textAnchor="middle"
          className="vf-body"
          style={{ fontSize: 10, fontWeight: 600, fill: PALETTE.muted, letterSpacing: '0.1em' }}
        >
          {sub.toUpperCase()}
        </text>
      </svg>

      <div style={{ flex: 1 }}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: PALETTE.muted, letterSpacing: '0.1em', marginBottom: 4 }}>
            APPORT
          </div>
          <div className="vf-display vf-tabular" style={{ fontSize: 26, fontWeight: 900, color: PALETTE.ink, lineHeight: 1 }}>
            {intake || 0}
            <span className="vf-body" style={{ fontSize: 12, fontWeight: 500, color: PALETTE.muted, marginLeft: 4 }}>
              kcal
            </span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: PALETTE.muted, letterSpacing: '0.1em', marginBottom: 4 }}>
            DÉPENSE GARMIN
          </div>
          <div className="vf-display vf-tabular" style={{ fontSize: 26, fontWeight: 900, color: PALETTE.ink, lineHeight: 1 }}>
            {expenditure || 0}
            <span className="vf-body" style={{ fontSize: 12, fontWeight: 500, color: PALETTE.muted, marginLeft: 4 }}>
              kcal
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TodayView({ dateKey, day, updateDay, targets, stepsTarget }) {
  const t = dayType(dateKey, day);
  const dt = targets[t];
  const intake = num(day.intake.kcal);
  const expenditure = num(day.expenditure.kcal);
  const steps = num(day.expenditure.steps);
  const isMonday = new Date(dateKey + 'T12:00:00').getDay() === 1;

  const computedKcal = num(day.intake.protein) * 4 + num(day.intake.carbs) * 4 + num(day.intake.fat) * 9;
  const macroDelta = Math.abs(computedKcal - intake);
  const showMacroWarning = intake > 0 && computedKcal > 0 && macroDelta > 100;

  return (
    <div style={{ padding: '14px 14px 100px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Balance hero */}
      <Card>
        <div style={{ fontSize: 11, fontWeight: 700, color: PALETTE.muted, letterSpacing: '0.1em', marginBottom: 12 }}>
          BILAN DU JOUR
        </div>
        <BalanceRing intake={intake} expenditure={expenditure} target={dt.kcal} />
      </Card>

      {/* Macros */}
      <Card>
        <div style={{ fontSize: 11, fontWeight: 700, color: PALETTE.muted, letterSpacing: '0.1em', marginBottom: 12 }}>
          MACRONUTRIMENTS
        </div>
        <Bar
          label="PROTÉINES"
          value={num(day.intake.protein)}
          target={dt.protein}
          color={PALETTE.deep}
        />
        <Bar
          label="GLUCIDES"
          value={num(day.intake.carbs)}
          target={dt.carbs}
          color={PALETTE.accent}
        />
        <Bar
          label="LIPIDES"
          value={num(day.intake.fat)}
          target={dt.fat}
          color="#7C5E3C"
        />
        {showMacroWarning && (
          <div style={{
            marginTop: 8, padding: '8px 10px', background: PALETTE.highlight,
            borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 12, color: PALETTE.accentDark,
          }}>
            <AlertCircle size={14} />
            <span>
              Macros calculent <strong>{Math.round(computedKcal)} kcal</strong>
              {' '}mais tu as saisi <strong>{intake}</strong>. Écart {Math.round(macroDelta)}.
            </span>
          </div>
        )}
      </Card>

      {/* Apport */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Flame size={16} color={PALETTE.accent} />
          <div className="vf-body" style={{ fontSize: 14, fontWeight: 700, color: PALETTE.ink, letterSpacing: '0.02em' }}>
            APPORT — depuis FatSecret
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ gridColumn: 'span 2' }}>
            <Label>Calories totales</Label>
            <NumberInput
              value={day.intake.kcal}
              onChange={(v) => updateDay({ intake: { ...day.intake, kcal: v } })}
              placeholder="0"
              suffix="kcal"
            />
          </div>
          <div>
            <Label>Protéines</Label>
            <NumberInput
              value={day.intake.protein}
              onChange={(v) => updateDay({ intake: { ...day.intake, protein: v } })}
              placeholder="0"
              suffix="g"
            />
          </div>
          <div>
            <Label>Glucides</Label>
            <NumberInput
              value={day.intake.carbs}
              onChange={(v) => updateDay({ intake: { ...day.intake, carbs: v } })}
              placeholder="0"
              suffix="g"
            />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <Label>Lipides</Label>
            <NumberInput
              value={day.intake.fat}
              onChange={(v) => updateDay({ intake: { ...day.intake, fat: v } })}
              placeholder="0"
              suffix="g"
            />
          </div>
        </div>
      </Card>

      {/* Dépense Garmin */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Activity size={16} color={PALETTE.deep} />
          <div className="vf-body" style={{ fontSize: 14, fontWeight: 700, color: PALETTE.ink, letterSpacing: '0.02em' }}>
            DÉPENSE — Garmin Connect
          </div>
        </div>
        <div style={{ fontSize: 11, color: PALETTE.muted, marginBottom: 12, lineHeight: 1.4 }}>
          Saisis les <strong>calories TOTALES</strong> de la journée (BMR + actif),
          pas juste celles de ta séance. Dans Garmin Connect : onglet <em>Aujourd'hui</em> → chiffre "Calories".
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <Label>Calories brûlées</Label>
            <NumberInput
              value={day.expenditure.kcal}
              onChange={(v) => updateDay({ expenditure: { ...day.expenditure, kcal: v } })}
              placeholder="0"
              suffix="kcal"
            />
          </div>
          <div>
            <Label>
              Pas <span style={{ color: PALETTE.muted, fontWeight: 500 }}>(cible {stepsTarget})</span>
            </Label>
            <NumberInput
              value={day.expenditure.steps}
              onChange={(v) => updateDay({ expenditure: { ...day.expenditure, steps: v } })}
              placeholder="0"
            />
          </div>
        </div>
        {steps > 0 && (
          <div style={{ marginTop: 10 }}>
            <Bar
              label="PROGRESSION DES PAS"
              value={steps}
              target={stepsTarget}
              color={steps >= stepsTarget ? PALETTE.deep : PALETTE.accent}
              unit=""
            />
          </div>
        )}
      </Card>

      {/* Workout */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Dumbbell size={16} color={PALETTE.ink} />
          <div className="vf-body" style={{ fontSize: 14, fontWeight: 700, color: PALETTE.ink, letterSpacing: '0.02em' }}>
            SÉANCE
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Pill
            active={day.workout === 'haut'}
            onClick={() => updateDay({ workout: day.workout === 'haut' ? null : 'haut' })}
            color={PALETTE.deep}
          >
            Haut
          </Pill>
          <Pill
            active={day.workout === 'bas'}
            onClick={() => updateDay({ workout: day.workout === 'bas' ? null : 'bas' })}
            color={PALETTE.accent}
            bg={PALETTE.accent}
          >
            Bas ★
          </Pill>
          <Pill
            active={day.workout === null && day.notes.includes('séance:none')}
            onClick={() => updateDay({ workout: null })}
            color={PALETTE.muted}
          >
            Aucune
          </Pill>
        </div>
      </Card>

      {/* Tour de taille */}
      {(isMonday || day.waist) && (
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Ruler size={16} color={PALETTE.deep} />
            <div className="vf-body" style={{ fontSize: 14, fontWeight: 700, color: PALETTE.ink, letterSpacing: '0.02em' }}>
              TOUR DE TAILLE
              {isMonday && (
                <span style={{ marginLeft: 8, fontSize: 11, color: PALETTE.accent, fontWeight: 600 }}>
                  • Mesure du lundi
                </span>
              )}
            </div>
          </div>
          <NumberInput
            value={day.waist}
            onChange={(v) => updateDay({ waist: v })}
            placeholder="ex. 84.5"
            suffix="cm"
          />
        </Card>
      )}

      {/* Notes */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <FileText size={14} color={PALETTE.muted} />
          <Label noMargin>Note du jour</Label>
        </div>
        <textarea
          value={day.notes}
          onChange={(e) => updateDay({ notes: e.target.value })}
          placeholder="Sensations, faim, sommeil, chantier, écarts..."
          className="vf-body"
          style={{
            width: '100%',
            minHeight: 60,
            padding: 10,
            background: PALETTE.paper,
            border: `1px solid ${PALETTE.line}`,
            borderRadius: 10,
            outline: 'none',
            resize: 'vertical',
            fontSize: 13,
            color: PALETTE.ink,
          }}
        />
      </Card>
    </div>
  );
}

function Label({ children, noMargin }) {
  return (
    <div
      className="vf-body"
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: PALETTE.muted,
        marginBottom: noMargin ? 0 : 6,
        letterSpacing: '0.04em',
      }}
    >
      {children}
    </div>
  );
}

/* ============================== Week View ============================== */

function WeekView({ dateKey, data, setDateKey, targets, stepsTarget }) {
  const start = startOfWeek(dateKey);
  const days = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const k = addDays(start, i);
      return { key: k, day: data.days[k] || null };
    })
  , [start, data.days]);

  let totalIntake = 0, totalExp = 0, totalSteps = 0, totalProt = 0;
  let trainCompleted = 0, trainPlanned = 0;
  days.forEach(({ key, day }) => {
    if (!day) return;
    totalIntake += num(day.intake.kcal);
    totalExp += num(day.expenditure.kcal);
    totalSteps += num(day.expenditure.steps);
    totalProt += num(day.intake.protein);
    const t = dayType(key, day);
    if (t === 'train') trainPlanned += 1;
    if (day.workout) trainCompleted += 1;
  });
  // count planned train days from week structure even without records
  const plannedTrainTotal = days.filter(d => dayType(d.key, d.day) === 'train').length;
  const balance = totalIntake - totalExp;
  const recordedDays = days.filter(d => d.day && (num(d.day.intake.kcal) > 0 || num(d.day.expenditure.kcal) > 0)).length;

  // Waist series
  const waistSeries = days
    .map(({ key, day }) => ({ key, w: day && day.waist ? num(day.waist) : null }))
    .filter((p) => p.w !== null);

  return (
    <div style={{ padding: '14px 14px 100px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Week header */}
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

        {/* 7-day strip */}
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

      {/* Totals grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <StatCard
          label="APPORT TOTAL"
          value={Math.round(totalIntake)}
          unit="kcal"
          sub={`${recordedDays}/7 jours saisis`}
        />
        <StatCard
          label="DÉPENSE TOTALE"
          value={Math.round(totalExp)}
          unit="kcal"
          sub="Garmin"
        />
        <StatCard
          label="PAS CUMULÉS"
          value={Math.round(totalSteps).toLocaleString('fr-FR')}
          unit=""
          sub={`Cible : ${(stepsTarget * 5).toLocaleString('fr-FR')} (Lun-Ven)`}
        />
        <StatCard
          label="PROTÉINES"
          value={Math.round(totalProt)}
          unit="g"
          sub={`Cible : ${(targets.train.protein || 160) * 7}g`}
        />
        <StatCard
          label="SÉANCES"
          value={`${trainCompleted}/${plannedTrainTotal || 3}`}
          unit=""
          sub="dont 1× Bas du corps obligatoire"
          colSpan={2}
        />
      </div>

      {/* Waist evolution */}
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

      {/* Reminder block */}
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
              {balance > -1000 && balance < 0 && ' Continue, c\'est bon.'}
              {balance >= 0 && recordedDays > 0 && ' Vérifie que tu saisis bien les calories totales Garmin.'}
              {balance <= -2500 && ' Déficit important : assure-toi de bien recharger les jours TRAIN.'}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function StatCard({ label, value, unit, sub, colSpan = 1 }) {
  return (
    <div
      style={{
        gridColumn: colSpan === 2 ? 'span 2' : 'auto',
        background: PALETTE.surface,
        border: `1px solid ${PALETTE.line}`,
        borderRadius: 14,
        padding: 14,
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, color: PALETTE.muted, letterSpacing: '0.1em', marginBottom: 6 }}>
        {label}
      </div>
      <div className="vf-display vf-tabular" style={{ fontSize: 22, fontWeight: 900, color: PALETTE.ink, lineHeight: 1.1 }}>
        {value}
        {unit && <span className="vf-body" style={{ fontSize: 11, fontWeight: 500, color: PALETTE.muted, marginLeft: 4 }}>{unit}</span>}
      </div>
      {sub && <div style={{ fontSize: 11, color: PALETTE.muted, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

/* ============================== Data View ============================== */

function DataView({ data, setData }) {
  const [importStatus, setImportStatus] = useState(null);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vibefit-${toKey(new Date())}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importJson = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (!parsed.days || typeof parsed.days !== 'object') {
          throw new Error('Format invalide');
        }
        // Merge: imported keys take precedence
        setData((prev) => ({ ...prev, days: { ...prev.days, ...parsed.days } }));
        setImportStatus({ ok: true, msg: `Importé ${Object.keys(parsed.days).length} jour(s)` });
      } catch (err) {
        setImportStatus({ ok: false, msg: 'Fichier invalide : ' + err.message });
      }
      setTimeout(() => setImportStatus(null), 3000);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const reset = () => {
    if (confirm('Effacer TOUTES les données ? Cette action est irréversible.')) {
      setData({ days: {} });
    }
  };

  const dayCount = Object.keys(data.days).length;

  return (
    <div style={{ padding: '14px 14px 100px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Card>
        <div style={{ fontSize: 11, fontWeight: 700, color: PALETTE.muted, letterSpacing: '0.1em', marginBottom: 12 }}>
          ÉTAT
        </div>
        <div className="vf-display vf-tabular" style={{ fontSize: 32, fontWeight: 900, lineHeight: 1 }}>
          {dayCount}
          <span className="vf-body" style={{ fontSize: 13, fontWeight: 500, color: PALETTE.muted, marginLeft: 6 }}>
            {dayCount > 1 ? 'jours saisis' : 'jour saisi'}
          </span>
        </div>
      </Card>

      <Card>
        <div style={{ fontSize: 11, fontWeight: 700, color: PALETTE.muted, letterSpacing: '0.1em', marginBottom: 12 }}>
          BACKUP
        </div>
        <button
          onClick={exportJson}
          style={{
            width: '100%', padding: '14px',
            background: PALETTE.ink, color: '#fff', border: 'none',
            borderRadius: 10, fontWeight: 700, fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            cursor: 'pointer', marginBottom: 8,
          }}
          className="vf-body"
        >
          <Download size={18} />
          Exporter en JSON
        </button>
        <label
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            width: '100%', padding: '14px',
            background: PALETTE.paper, color: PALETTE.ink,
            border: `1px solid ${PALETTE.line}`,
            borderRadius: 10, fontWeight: 700, fontSize: 14,
            cursor: 'pointer',
          }}
          className="vf-body"
        >
          <Upload size={18} />
          Importer un JSON
          <input
            type="file"
            accept="application/json"
            onChange={importJson}
            style={{ display: 'none' }}
          />
        </label>
        {importStatus && (
          <div
            style={{
              marginTop: 10, padding: 10, borderRadius: 8,
              background: importStatus.ok ? PALETTE.deepSoft : PALETTE.highlight,
              color: importStatus.ok ? PALETTE.deep : PALETTE.accentDark,
              fontSize: 12, display: 'flex', gap: 8, alignItems: 'center',
            }}
          >
            {importStatus.ok ? <Check size={14} /> : <AlertCircle size={14} />}
            {importStatus.msg}
          </div>
        )}
      </Card>

      <Card>
        <div style={{ fontSize: 11, fontWeight: 700, color: PALETTE.muted, letterSpacing: '0.1em', marginBottom: 12 }}>
          DANGER
        </div>
        <button
          onClick={reset}
          style={{
            width: '100%', padding: '14px',
            background: 'transparent', color: PALETTE.accentDark,
            border: `1px solid ${PALETTE.accentDark}`,
            borderRadius: 10, fontWeight: 700, fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            cursor: 'pointer',
          }}
          className="vf-body"
        >
          <Trash2 size={18} />
          Tout effacer
        </button>
      </Card>

      <Card style={{ background: PALETTE.highlight, borderColor: PALETTE.accent }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flexShrink: 0, width: 4, alignSelf: 'stretch', background: PALETTE.accent, borderRadius: 2 }} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: PALETTE.accentDark, letterSpacing: '0.04em', marginBottom: 6, textTransform: 'uppercase' }}>
              Backup
            </div>
            <div style={{ fontSize: 13, color: PALETTE.ink, lineHeight: 1.5 }}>
              Tes données sont stockées dans le
              <code style={{ background: '#fff', padding: '1px 6px', borderRadius: 4, fontSize: 12, margin: '0 4px' }}>
                localStorage
              </code>
              de ton navigateur (uniquement sur cet appareil).
              Pense à <strong>exporter le JSON chaque dimanche</strong> en backup —
              si tu changes de navigateur ou nettoies tes données, tu pourras tout réimporter.
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ============================== Targets View ============================== */

function TargetsView({ data, setData }) {
  const { targets, stepsTarget, presetId } = data;
  const [savedFlash, setSavedFlash] = useState(false);

  const setTargets = (newTargets, newPresetId = 'custom') => {
    setData((prev) => ({
      ...prev,
      targets: newTargets,
      presetId: newPresetId,
    }));
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1200);
  };

  const setStepsTarget = (v) => {
    setData((prev) => ({ ...prev, stepsTarget: num(v) || DEFAULT_STEPS_TARGET }));
  };

  const applyPreset = (id) => {
    const p = PRESETS[id];
    if (!p) return;
    setTargets(p.targets, id);
  };

  const resetDefaults = () => {
    if (confirm('Restaurer les cibles VIBEFIT par défaut ?')) {
      setTargets(DEFAULT_TARGETS, 'maintenance');
      setData((prev) => ({ ...prev, stepsTarget: DEFAULT_STEPS_TARGET }));
    }
  };

  const updateField = (dayKey, field, value) => {
    const v = value === '' ? null : num(value);
    setTargets({
      ...targets,
      [dayKey]: { ...targets[dayKey], [field]: v },
    }, 'custom');
  };

  return (
    <div style={{ padding: '14px 14px 100px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Mode actuel + presets */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: PALETTE.muted, letterSpacing: '0.1em' }}>
              MODE ACTUEL
            </div>
            <div className="vf-display" style={{ fontSize: 22, fontWeight: 900, color: PALETTE.ink }}>
              {presetId === 'custom' ? 'Personnalisé' : (PRESETS[presetId]?.label || 'Maintenance')}
            </div>
            <div style={{ fontSize: 12, color: PALETTE.muted, marginTop: 2 }}>
              {presetId === 'custom' ? 'Tu as ajusté les valeurs à la main' : (PRESETS[presetId]?.sub || '')}
            </div>
          </div>
          {savedFlash && (
            <div className="vf-fadein" style={{
              fontSize: 11, fontWeight: 700, color: PALETTE.deep,
              background: PALETTE.deepSoft, padding: '4px 8px', borderRadius: 6,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <Check size={12} /> ENREGISTRÉ
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {Object.entries(PRESETS).map(([id, p]) => {
            const active = presetId === id;
            return (
              <button
                key={id}
                onClick={() => applyPreset(id)}
                className="vf-body"
                style={{
                  textAlign: 'left',
                  padding: '12px',
                  background: active ? PALETTE.ink : PALETTE.paper,
                  color: active ? '#fff' : PALETTE.ink,
                  border: `1px solid ${active ? PALETTE.ink : PALETTE.line}`,
                  borderRadius: 10,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 700 }}>{p.label}</span>
                <span style={{ fontSize: 10, opacity: 0.75, lineHeight: 1.3 }}>{p.sub}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Steps target */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Footprints size={16} color={PALETTE.deep} />
          <div className="vf-body" style={{ fontSize: 14, fontWeight: 700, color: PALETTE.ink, letterSpacing: '0.02em' }}>
            OBJECTIF DE PAS QUOTIDIEN
          </div>
        </div>
        <NumberInput
          value={stepsTarget}
          onChange={setStepsTarget}
          placeholder="8000"
          suffix="pas"
        />
      </Card>

      {/* TRAIN targets */}
      <TargetEditor
        title="JOUR D'ENTRAÎNEMENT"
        subtitle="Lundi · Mercredi · Vendredi"
        accent={PALETTE.deep}
        target={targets.train}
        onChange={(field, val) => updateField('train', field, val)}
      />

      {/* OFF targets */}
      <TargetEditor
        title="JOUR DE REPOS"
        subtitle="Mardi · Jeudi"
        accent={PALETTE.accent}
        target={targets.off}
        onChange={(field, val) => updateField('off', field, val)}
      />

      {/* WE targets */}
      <TargetEditor
        title="WEEK-END"
        subtitle="Samedi · Dimanche · Laisse vide pour 'pas de cible'"
        accent={PALETTE.muted}
        target={targets.we}
        onChange={(field, val) => updateField('we', field, val)}
        allowEmpty
      />

      {/* Reset */}
      <Card>
        <button
          onClick={resetDefaults}
          style={{
            width: '100%', padding: '14px',
            background: 'transparent', color: PALETTE.muted,
            border: `1px solid ${PALETTE.line}`,
            borderRadius: 10, fontWeight: 700, fontSize: 13,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            cursor: 'pointer',
          }}
          className="vf-body"
        >
          <RotateCcw size={16} />
          Restaurer les valeurs VIBEFIT
        </button>
      </Card>

      {/* Help block */}
      <Card style={{ background: PALETTE.highlight, borderColor: PALETTE.accent }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flexShrink: 0, width: 4, alignSelf: 'stretch', background: PALETTE.accent, borderRadius: 2 }} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: PALETTE.accentDark, letterSpacing: '0.04em', marginBottom: 6, textTransform: 'uppercase' }}>
              Comment ça marche
            </div>
            <div style={{ fontSize: 13, color: PALETTE.ink, lineHeight: 1.5 }}>
              Les <strong>presets</strong> ajustent kcal/macros automatiquement.
              Les <strong>protéines restent à 160g</strong> dans tous les modes (protection musculaire),
              les <strong>glucides absorbent</strong> la différence calorique.
              Édite à la main pour passer en mode <em>Personnalisé</em>.
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function TargetEditor({ title, subtitle, accent, target, onChange, allowEmpty }) {
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ width: 4, height: 28, background: accent, borderRadius: 2 }} />
        <div>
          <div className="vf-body" style={{ fontSize: 13, fontWeight: 800, color: PALETTE.ink, letterSpacing: '0.04em' }}>
            {title}
          </div>
          <div style={{ fontSize: 11, color: PALETTE.muted }}>{subtitle}</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ gridColumn: 'span 2' }}>
          <Label>Calories</Label>
          <NumberInput
            value={target.kcal ?? ''}
            onChange={(v) => onChange('kcal', v)}
            placeholder={allowEmpty ? 'Aucune cible' : '0'}
            suffix="kcal"
          />
        </div>
        <div>
          <Label>Protéines</Label>
          <NumberInput
            value={target.protein ?? ''}
            onChange={(v) => onChange('protein', v)}
            placeholder={allowEmpty ? '—' : '160'}
            suffix="g"
          />
        </div>
        <div>
          <Label>Glucides</Label>
          <NumberInput
            value={target.carbs ?? ''}
            onChange={(v) => onChange('carbs', v)}
            placeholder={allowEmpty ? '—' : '0'}
            suffix="g"
          />
        </div>
        <div style={{ gridColumn: 'span 2' }}>
          <Label>Lipides</Label>
          <NumberInput
            value={target.fat ?? ''}
            onChange={(v) => onChange('fat', v)}
            placeholder={allowEmpty ? '—' : '0'}
            suffix="g"
          />
        </div>
      </div>
    </Card>
  );
}

/* ============================== App Root ============================== */

function BottomNav({ tab, setTab }) {
  const items = [
    { id: 'today', label: 'Jour', Icon: Flame },
    { id: 'week', label: 'Semaine', Icon: Activity },
    { id: 'targets', label: 'Cibles', Icon: Target },
    { id: 'data', label: 'Données', Icon: Database },
  ];
  return (
    <div
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff', borderTop: `1px solid ${PALETTE.line}`,
        padding: '8px 8px max(8px, env(safe-area-inset-bottom))',
        display: 'flex', justifyContent: 'space-around',
        zIndex: 100,
        boxShadow: '0 -4px 14px rgba(0,0,0,0.04)',
      }}
    >
      {items.map(({ id, label, Icon }) => {
        const active = tab === id;
        return (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              flex: 1, padding: '8px 4px',
              background: 'transparent', border: 'none',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              color: active ? PALETTE.ink : PALETTE.muted,
              cursor: 'pointer',
            }}
          >
            <Icon size={22} strokeWidth={active ? 2.4 : 1.8} />
            <span
              className="vf-body"
              style={{
                fontSize: 10, fontWeight: active ? 700 : 500,
                letterSpacing: '0.04em',
              }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function VibeFit() {
  const [data, setData, loaded] = useVibefitStorage();
  const [dateKey, setDateKey] = useState(() => toKey(new Date()));
  const [tab, setTab] = useState('today');

  const day = useMemo(
    () => ({ ...emptyDay(), ...(data.days[dateKey] || {}) }),
    [data.days, dateKey]
  );

  const updateDay = useCallback(
    (patch) => {
      setData((prev) => ({
        ...prev,
        days: {
          ...prev.days,
          [dateKey]: { ...emptyDay(), ...(prev.days[dateKey] || {}), ...patch },
        },
      }));
    },
    [dateKey, setData]
  );

  if (!loaded) {
    return (
      <div className="vf-app vf-body" style={{ minHeight: '100vh', background: PALETTE.paper, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <FontStyles />
        <div className="vf-pulse vf-display" style={{ fontSize: 24, fontWeight: 900, color: PALETTE.ink }}>
          VIBE<span style={{ color: PALETTE.accent }}>FIT</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="vf-app vf-body"
      style={{
        minHeight: '100vh',
        background: PALETTE.paper,
        color: PALETTE.ink,
        maxWidth: 720,
        margin: '0 auto',
        boxShadow: '0 0 40px rgba(0,0,0,0.04)',
      }}
    >
      <FontStyles />
      <Header dateKey={dateKey} setDateKey={setDateKey} day={day} updateDay={updateDay} targets={data.targets} />
      {tab === 'today' && <TodayView dateKey={dateKey} day={day} updateDay={updateDay} targets={data.targets} stepsTarget={data.stepsTarget} />}
      {tab === 'week' && <WeekView dateKey={dateKey} data={data} setDateKey={setDateKey} targets={data.targets} stepsTarget={data.stepsTarget} />}
      {tab === 'targets' && <TargetsView data={data} setData={setData} />}
      {tab === 'data' && <DataView data={data} setData={setData} />}
      <BottomNav tab={tab} setTab={setTab} />
    </div>
  );
}
