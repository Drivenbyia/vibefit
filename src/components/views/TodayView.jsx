import { Flame, Activity, Dumbbell, Ruler, FileText, AlertCircle } from 'lucide-react';
import { PALETTE } from '../../constants/config.js';
import { num } from '../../utils/mathUtils.js';
import { dayType } from '../../models/day.js';
import Card from '../ui/Card.jsx';
import NumberInput from '../ui/NumberInput.jsx';
import Pill from '../ui/Pill.jsx';
import Bar from '../ui/Bar.jsx';
import Label from '../ui/Label.jsx';

function BalanceRing({ intake, expenditure, target }) {
  const r = 70, c = 2 * Math.PI * r;
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

export default function TodayView({ dateKey, day, updateDay, targets, stepsTarget }) {
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
      <Card>
        <div style={{ fontSize: 11, fontWeight: 700, color: PALETTE.muted, letterSpacing: '0.1em', marginBottom: 12 }}>
          BILAN DU JOUR
        </div>
        <BalanceRing intake={intake} expenditure={expenditure} target={dt.kcal} />
      </Card>

      <Card>
        <div style={{ fontSize: 11, fontWeight: 700, color: PALETTE.muted, letterSpacing: '0.1em', marginBottom: 12 }}>
          MACRONUTRIMENTS
        </div>
        <Bar label="PROTÉINES" value={num(day.intake.protein)} target={dt.protein} color={PALETTE.deep} />
        <Bar label="GLUCIDES" value={num(day.intake.carbs)} target={dt.carbs} color={PALETTE.accent} />
        <Bar label="LIPIDES" value={num(day.intake.fat)} target={dt.fat} color="#7C5E3C" />
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
            <NumberInput value={day.intake.kcal} onChange={(v) => updateDay({ intake: { ...day.intake, kcal: v } })} placeholder="0" suffix="kcal" />
          </div>
          <div>
            <Label>Protéines</Label>
            <NumberInput value={day.intake.protein} onChange={(v) => updateDay({ intake: { ...day.intake, protein: v } })} placeholder="0" suffix="g" />
          </div>
          <div>
            <Label>Glucides</Label>
            <NumberInput value={day.intake.carbs} onChange={(v) => updateDay({ intake: { ...day.intake, carbs: v } })} placeholder="0" suffix="g" />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <Label>Lipides</Label>
            <NumberInput value={day.intake.fat} onChange={(v) => updateDay({ intake: { ...day.intake, fat: v } })} placeholder="0" suffix="g" />
          </div>
        </div>
      </Card>

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
            <NumberInput value={day.expenditure.kcal} onChange={(v) => updateDay({ expenditure: { ...day.expenditure, kcal: v } })} placeholder="0" suffix="kcal" />
          </div>
          <div>
            <Label>
              Pas <span style={{ color: PALETTE.muted, fontWeight: 500 }}>(cible {stepsTarget})</span>
            </Label>
            <NumberInput value={day.expenditure.steps} onChange={(v) => updateDay({ expenditure: { ...day.expenditure, steps: v } })} placeholder="0" />
          </div>
        </div>
        {steps > 0 && (
          <div style={{ marginTop: 10 }}>
            <Bar label="PROGRESSION DES PAS" value={steps} target={stepsTarget} color={steps >= stepsTarget ? PALETTE.deep : PALETTE.accent} unit="" />
          </div>
        )}
      </Card>

      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Dumbbell size={16} color={PALETTE.ink} />
          <div className="vf-body" style={{ fontSize: 14, fontWeight: 700, color: PALETTE.ink, letterSpacing: '0.02em' }}>
            SÉANCE
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Pill active={day.workout === 'haut'} onClick={() => updateDay({ workout: day.workout === 'haut' ? null : 'haut' })} color={PALETTE.deep}>
            Haut
          </Pill>
          <Pill active={day.workout === 'bas'} onClick={() => updateDay({ workout: day.workout === 'bas' ? null : 'bas' })} color={PALETTE.accent} bg={PALETTE.accent}>
            Bas ★
          </Pill>
          <Pill active={day.workout === null && day.notes.includes('séance:none')} onClick={() => updateDay({ workout: null })} color={PALETTE.muted}>
            Aucune
          </Pill>
        </div>
      </Card>

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
          <NumberInput value={day.waist} onChange={(v) => updateDay({ waist: v })} placeholder="ex. 84.5" suffix="cm" />
        </Card>
      )}

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
