import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { extractSignals } from '../adaptiveTDEE.js';
import { mifflinBMR, checkTDEE, sanitizeProfile, TDEE_CHECK } from '../plausibility.js';
import { recalibrationBlock } from '../recalibration.js';
import { diagnose, DIAGNOSIS } from '../plateauProtocol.js';
import { summarizeStatus, STATUS_KIND } from '../vibeStatus.js';
import { getHistoricalWeeks } from '../exportUtils.js';
import { formatCoachContext } from '../coachContext.js';
import { weeklyCheckIn } from '../weeklyCheckIn.js';
import { migrateData, restorableProtocol } from '../../models/protocol.js';

/**
 * Série réelle du 24/10 au 06/11/2026 — premier TDEE mesuré après la
 * calibration : 963 kcal à « confiance 100 % ». Balance à aiguille, pesées
 * au kg rond, fenêtre ouverte sur un jour de jeûne.
 */
const REAL = [
  ['2026-10-24', '77', 1000], ['2026-10-25', '76.7', 1741], ['2026-10-26', '77', 1977],
  ['2026-10-27', '76', 2074], ['2026-10-28', '77', 2152], ['2026-10-29', '77.5', 2073],
  ['2026-10-30', '78', 1772], ['2026-10-31', '78', 2296], ['2026-11-01', '78', 1941],
  ['2026-11-02', '78', 2289], ['2026-11-03', '78', 2257], ['2026-11-04', '78', 1526],
  ['2026-11-05', '78', 1835], ['2026-11-06', '78', 2000],
];

const PROFILE = { sex: 'male', birthYear: 1991, heightCm: 175 };

const realData = (extra = {}) => ({
  days: Object.fromEntries(REAL.map(([k, w, kcal]) => [k, { weight: w, intake: { kcal: String(kcal) } }])),
  periods: [{ id: 'cut', type: 'untracked', start: '2026-08-20', end: '2026-10-23', scope: 'nutrition' }],
  phases: [{ id: 'ms', type: 'medical_stop', start: '2026-08-29', plannedEnd: '2027-03-01', endedAt: null }],
  calibration: { start: '2026-10-24', seedTDEE: 2050, requiredDays: 14 },
  presetId: 'maintenance',
  baseTDEE: 2050,
  targets: { train: { kcal: 2250, protein: 160 }, off: { kcal: 1850, protein: 160 }, we: { kcal: 2050, protein: 160 } },
  profile: PROFILE,
  ...extra,
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 7, 12, 0)); // 07/11/2026
});
afterEach(() => vi.useRealTimers());

describe('Mifflin-St Jeor', () => {
  it('homme 35 ans, 175 cm, 78 kg ≈ 1704 kcal', () => {
    expect(mifflinBMR({ sex: 'male', age: 35, heightCm: 175, weightKg: 78 })).toBe(1704);
  });
  it('femme : −166 kcal par rapport à l’homme', () => {
    expect(mifflinBMR({ sex: 'female', age: 35, heightCm: 175, weightKg: 78 })).toBe(1538);
  });
  it('donnée manquante ⇒ null', () => {
    expect(mifflinBMR({ sex: null, age: 35, heightCm: 175, weightKg: 78 })).toBeNull();
    expect(mifflinBMR({ sex: 'male', age: 35, heightCm: 175, weightKg: null })).toBeNull();
  });
});

describe('checkTDEE', () => {
  const at = '2026-11-07';
  it('sous 1,2 × BMR ⇒ incohérent', () => {
    const c = checkTDEE(963, PROFILE, 78, at);
    expect(c.status).toBe(TDEE_CHECK.IMPLAUSIBLE);
    expect(c.bmr).toBe(1704);
    expect(c.minKcal).toBe(2045);
  });
  it('au-dessus de 4000 ⇒ incohérent, même sans profil', () => {
    expect(checkTDEE(4200, null, 78, at).status).toBe(TDEE_CHECK.IMPLAUSIBLE);
  });
  it('dans la plage ⇒ valide', () => {
    expect(checkTDEE(2300, PROFILE, 78, at).status).toBe(TDEE_CHECK.VALID);
  });
  it('profil incomplet ⇒ non vérifié', () => {
    expect(checkTDEE(963, { sex: 'male' }, 78, at).status).toBe(TDEE_CHECK.UNCHECKED);
  });
  it('sans TDEE calculé ⇒ null', () => {
    expect(checkTDEE(null, PROFILE, 78, at)).toBeNull();
  });
});

describe('profil — modèle de données additif', () => {
  it('valeur hors bornes écartée, jamais inventée', () => {
    expect(sanitizeProfile({ sex: 'x', birthYear: 1800, heightCm: 17.5 }))
      .toEqual({ sex: null, birthYear: null, heightCm: null });
  });
  it('la migration ajoute un profil vide sans toucher aux jours', () => {
    const raw = realData({ profile: undefined });
    const m = migrateData(raw);
    expect(m.days).toBe(raw.days);
    expect(m.profile).toEqual({ sex: null, birthYear: null, heightCm: null });
  });
  it('restauration : profil repris s’il est dans le fichier, intact sinon', () => {
    expect(restorableProtocol({ days: {}, profile: PROFILE }).profile).toEqual(PROFILE);
    expect(restorableProtocol({ days: {} })).not.toHaveProperty('profile');
  });
});

describe('série réelle 24/10 → 06/11 — 963 kcal', () => {
  it('le calcul brut reste 963 kcal, mais n’est pas publié', () => {
    const s = extractSignals(realData());
    expect(s.measuredTDEE).toBe(963);
    expect(s.confidence).toBe(100);
    expect(s.tdeeCheck.status).toBe(TDEE_CHECK.IMPLAUSIBLE);
    expect(s.tdeeCheck.minKcal).toBe(2045);
    expect(s.adaptiveTDEE).toBeNull();
  });

  it('pas de recalibration, cibles maintenues sur la base 2050', () => {
    const s = extractSignals(realData());
    const { blockedReason, delta } = recalibrationBlock(s, 2050);
    expect(blockedReason).toMatch(/^Mesure incohérente — vérifie pesées et saisie/);
    expect(blockedReason).toMatch(/dernière base valide : 2\s050 kcal/);
    expect(delta).toBeNull();
  });

  it('le diagnostic ne prétend pas manquer de données', () => {
    const s = extractSignals(realData());
    const d = diagnose({ signals: s, trainingSuspended: true });
    expect(d.status).toBe(DIAGNOSIS.IMPLAUSIBLE_MEASURE);
  });

  it('la bande d’état affiche le statut, sans pourcentage de confiance', () => {
    const s = extractSignals(realData());
    const status = summarizeStatus({ diagnosis: diagnose({ signals: s, trainingSuspended: true }), signals: s });
    expect(status.kind).toBe(STATUS_KIND.MEASURE_IMPLAUSIBLE);
    expect(status.headline).toBe('Mesure incohérente');
    expect(status.readout ?? '').not.toMatch(/conf\./);
  });

  it('export : statut à la place du TDEE, la confiance ne le valide pas', () => {
    const report = getHistoricalWeeks(realData());
    const header = report.split('\n').find((l) => l.startsWith('⚡'));
    expect(header).toContain('Mesure incohérente — vérifie pesées et saisie');
    expect(header).toContain('calcul brut 963 kcal');
    expect(header).toContain('cibles sur la dernière base valide 2050 kcal');
    expect(header).not.toMatch(/Confiance : 100%/);
  });

  it('contexte coach : statut, pas de « confiance 100 % »', () => {
    const ctx = formatCoachContext(realData(), { today: '2026-11-07' }).join('\n');
    expect(ctx).toContain('Mesure incohérente');
    expect(ctx).not.toContain('confiance 100 %');
  });

  it('bilan : ligne TDEE incohérent, aucune action de recalibration', () => {
    const s = extractSignals(realData());
    const { canRecalibrate } = recalibrationBlock(s, 2050);
    const out = weeklyCheckIn({
      week: { weekStart: '2026-11-02', days: [], comparableDays: 0, gapPerDay: null },
      inProgress: true, waistMissing: false, isMonday: false, prevWeek: null,
      protein: { days: 0, underDays: 0, floor: 160 }, steps: { avg: null }, stepsTarget: 8000,
      calibration: s.calibration,
      tdee: { adaptiveTDEE: s.adaptiveTDEE, measuredTDEE: s.measuredTDEE, check: s.tdeeCheck, delta: null, canRecalibrate },
    });
    const line = out.lines.find((l) => l.label === 'TDEE mesuré');
    expect(line.value).toBe('incohérent');
    expect(out.action?.kind).not.toBe('recalibrate');
  });

  it('sans profil : 963 publié « non vérifié », recalibration bloquée', () => {
    const s = extractSignals(realData({ profile: undefined }));
    expect(s.tdeeCheck.status).toBe(TDEE_CHECK.UNCHECKED);
    expect(recalibrationBlock(s, 2050).canRecalibrate).toBe(false);
    expect(recalibrationBlock(s, 2050).blockedReason).toMatch(/Profil incomplet/);
  });

  it('segment plat 30/10 → 06/11 (~1990 kcal) : sous le plancher 2045 aussi', () => {
    // Signalé dans la PR : à 1,2 × BMR, une maintenance plausible de ~2000
    // kcal serait elle aussi marquée incohérente pour ce profil.
    expect(checkTDEE(1990, PROFILE, 78, '2026-11-07').status).toBe(TDEE_CHECK.IMPLAUSIBLE);
  });
});
