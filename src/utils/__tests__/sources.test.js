import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { computeWeeklyHistory, calculateWeeklyBalance, watchStepsAverage, proteinAverage } from '../mathUtils.js';
import { diagnoseSleep, SLEEP } from '../sleepDiagnosis.js';
import { diagnoseNeat, NEAT } from '../neatDrift.js';
import { phaseLeversCopy, targetGapReminderCopy } from '../reminderUtils.js';
import { formatContext, formatSleep } from '../exportUtils.js';
import { isExcluded, isReferenceMeasure } from '../../models/protocol.js';
import { computePresetTargets, resolveTargets } from '../presetUtils.js';
import { addDays } from '../dateUtils.js';

/** Étape 6 — sources, nouvelles références Apple, calories montre hors calcul. */

const DEVICES = [
  { source: 'garmin', from: null, to: '2026-10-18' },
  { source: 'apple_watch', from: '2026-10-19', to: null },
];
const partial = (d) => ({ id: `p-${d}`, type: 'partial', start: d, end: d, scope: 'recovery', label: 'Mesure montre partielle' });
const CUT = { id: 'cut', type: 'untracked', start: '2026-08-20', end: '2026-10-23', scope: 'nutrition' };

const setToday = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  vi.setSystemTime(new Date(y, m - 1, d, 12, 0));
};
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

/** Jours [from, to] avec pas et sommeil. */
function watchDays(from, to, { steps = 9000, hrv = 50, rhr = 55, durationMin = 450, extra = {} } = {}) {
  const days = {};
  for (let k = from; k <= to; k = addDays(k, 1)) {
    days[k] = { expenditure: { steps: String(steps) }, sleep: { durationMin: String(durationMin), hrv: String(hrv), rhr: String(rhr) }, ...extra };
  }
  return days;
}

describe('jours partiels — exclus des références, sans effet sur la nutrition', () => {
  it('périmètre recovery uniquement', () => {
    const p = [partial('2026-10-19')];
    expect(isExcluded('2026-10-19', p, 'recovery')).toBe(true);
    expect(isExcluded('2026-10-19', p, 'nutrition')).toBe(false);
  });

  it('isReferenceMeasure : montre courante, jour non partiel', () => {
    const ref = { devices: DEVICES, periods: [partial('2026-10-19')], referenceSource: 'apple_watch' };
    expect(isReferenceMeasure('2026-10-20', {}, 'steps', ref)).toBe(true);
    expect(isReferenceMeasure('2026-10-19', {}, 'steps', ref)).toBe(false);          // partiel
    expect(isReferenceMeasure('2026-10-10', {}, 'steps', ref)).toBe(false);          // Garmin
    expect(isReferenceMeasure('2026-10-21', { expenditure: { stepsSource: 'iphone' } }, 'steps', ref)).toBe(false);
    expect(isReferenceMeasure('2026-10-10', {}, 'steps', { referenceSource: null })).toBe(true); // sans chronologie
  });
});

describe('historique hebdo — pas et sommeil de la montre courante seulement', () => {
  it('les semaines Garmin ne nourrissent aucune référence Apple', () => {
    setToday('2026-11-03');
    const days = { ...watchDays('2026-09-28', '2026-10-18', { steps: 15000, hrv: 46 }), ...watchDays('2026-10-19', '2026-11-02', { steps: 9000, hrv: 56 }) };
    const h = computeWeeklyHistory({ days, devices: DEVICES, periods: [CUT, partial('2026-10-19')] }, computePresetTargets('maintenance', 2050), 6);
    const byStart = Object.fromEntries(h.map((w) => [w.weekStart, w]));
    expect(byStart['2026-10-12'].stepsDays).toBe(0);           // Garmin : hors référence
    expect(byStart['2026-10-12'].sleep.nights).toBe(0);
    expect(byStart['2026-10-19'].stepsDays).toBe(6);           // 19/10 partiel exclu
    expect(byStart['2026-10-19'].sleep.hrv).toBe(56);
  });

  it('sans chronologie de montres : comportement d’avant', () => {
    setToday('2026-11-03');
    const days = watchDays('2026-10-12', '2026-11-02');
    const h = computeWeeklyHistory({ days }, computePresetTargets('maintenance', 2050), 3);
    expect(h[1].stepsDays).toBe(7);
  });

  it('NEAT : une chute Garmin → Apple n’est pas une « chute d’activité »', () => {
    setToday('2026-11-03');
    // Garmin 15 000 pas, Apple 9 000 : sans séparation des sources, −40 %.
    const days = { ...watchDays('2026-09-21', '2026-10-18', { steps: 15000 }), ...watchDays('2026-10-19', '2026-11-02', { steps: 9000 }) };
    const weeklyHistory = computeWeeklyHistory({ days, devices: DEVICES, periods: [partial('2026-10-19')] }, computePresetTargets('maintenance', 2050), 6);
    const neat = diagnoseNeat({ weeklyHistory, weightKg: 77 });
    expect(neat.status).not.toBe(NEAT.SUSTAINED_DRIFT);
    expect(neat.status).not.toBe(NEAT.ACUTE_DROP);
  });
});

describe('sommeil — VFC / FC repos en affichage seul', () => {
  const week = (over = {}) => ({ elapsedDays: 7, sleep: { nights: 7, durationMin: 450, hrv: 50, rhr: 55, ...over } });
  // 4 semaines de référence puis une semaine « dégradée » : VFC −30 %, FC +8.
  const history = [week(), week(), week(), week(), week({ hrv: 35, rhr: 63 })];

  it('hors phase, avec 4 semaines de référence : tension détectée (référence)', () => {
    expect(diagnoseSleep({ weeklyHistory: history, minStrainBaselineWeeks: 4 }).status).toBe(SLEEP.STRAIN);
  });

  it('pendant la phase : aucun verdict VFC / FC repos', () => {
    const s = diagnoseSleep({ weeklyHistory: history, strainEnabled: false, minStrainBaselineWeeks: 4 });
    expect(s.status).not.toBe(SLEEP.STRAIN);
    expect(s.detail).not.toMatch(/VFC|FC repos/);
  });

  it('moins de 4 semaines de la montre courante : pas de seuil', () => {
    expect(diagnoseSleep({ weeklyHistory: history.slice(2), minStrainBaselineWeeks: 4 }).status).not.toBe(SLEEP.STRAIN);
  });

  it('la dette de sommeil (seuil absolu 6 h 30) reste active pendant la phase', () => {
    const short = [week(), week(), week({ durationMin: 360 })];
    expect(diagnoseSleep({ weeklyHistory: short, strainEnabled: false, minStrainBaselineWeeks: 4 }).status).toBe(SLEEP.DEBT);
  });

  it('export : RMSSD et SDNN publiés séparément', () => {
    expect(formatSleep({ hrv: '56', hrvSdnn: '53' })).toBe('VFC 56 ms · SDNN 53 ms');
  });
});

describe('leviers de la phase — protéines et pas montre', () => {
  it('pas montre : l’iPhone seul et les jours partiels ne comptent pas', () => {
    const days = [
      { key: '2026-10-19', day: { expenditure: { steps: '2582' } } },                          // partiel
      { key: '2026-10-20', day: { expenditure: { steps: '8623' } } },
      { key: '2026-10-21', day: { expenditure: { steps: '11211' } } },
      { key: '2026-10-22', day: { expenditure: { steps: '6003', stepsSource: 'iphone' } } },   // iPhone seul
    ];
    expect(watchStepsAverage(days, { devices: DEVICES, periods: [partial('2026-10-19')] })).toEqual({ avg: 9917, days: 2 });
  });

  it('protéines : moyenne des jours saisis seulement', () => {
    const days = [
      { key: 'a', day: { intake: { kcal: '2000', protein: '150' } } },
      { key: 'b', day: { intake: { kcal: '2100', protein: '170' } } },
      { key: 'c', day: null },
    ];
    expect(proteinAverage(days)).toEqual({ avg: 160, days: 2 });
  });

  const base = { proteinFloor: 160, stepsTarget: 8000 };

  it('alerte écrite sous le plancher de protéines', () => {
    const [p] = phaseLeversCopy({ ...base, proteinAvg: 142.4, proteinDays: 4, stepsAvg: 9000, stepsDays: 4 });
    expect(p).toEqual({ text: '⚠ Protéines : 142 g/j en moyenne sur 4 jours — sous le plancher de 160 g.', under: true, alert: true });
  });

  it('pas sous l’objectif : signalé, sans alerte', () => {
    const [, s] = phaseLeversCopy({ ...base, proteinAvg: 165, proteinDays: 4, stepsAvg: 6500, stepsDays: 3 });
    expect(s.under).toBe(true);
    expect(s.alert).toBe(false);
    expect(s.text).toMatch(/^Pas montre : 6\s500\/j en moyenne sur 3 jours — sous l’objectif de 8\s000\.$/);
  });

  it('tout dans la cible ; semaine vide dite sans chiffre', () => {
    const ok = phaseLeversCopy({ ...base, proteinAvg: 168, proteinDays: 5, stepsAvg: 9100, stepsDays: 5 });
    expect(ok.every((l) => !l.under)).toBe(true);
    const empty = phaseLeversCopy({ ...base, proteinAvg: null, proteinDays: 0, stepsAvg: null, stepsDays: 0 });
    expect(empty.map((l) => l.text)).toEqual([
      'Protéines : aucun jour saisi cette semaine.',
      'Pas montre : aucun jour mesuré par la montre cette semaine.',
    ]);
  });
});

describe('calories montre — hors de tout calcul affiché', () => {
  const targets = resolveTargets({ targets: computePresetTargets('maintenance', 2050), presetId: 'maintenance', baseTDEE: 2050 });
  const PHASE = { id: 'm', type: 'medical_stop', start: '2026-08-29', plannedEnd: '2027-03-01', endedAt: null };

  it('l’écart à la cible ignore la dépense montre', () => {
    const days = [
      { key: '2026-10-24', day: { intake: { kcal: '2150' }, expenditure: { kcal: '3500' } } },
      { key: '2026-10-25', day: { intake: { kcal: '2000' }, expenditure: { kcal: '' } } },
    ];
    const w = calculateWeeklyBalance(days, targets, [PHASE]);
    expect(w.targetGap).toBe(50);   // (2150 − 2050) + (2000 − 2050)
  });

  it('rappel hors phase : formulé sur l’écart, sans montre ni Garmin', () => {
    const t = targetGapReminderCopy(-350, 5);
    expect(t).toBe('Écart cumulé à la cible : −350 kcal sur 5 jours saisis. Dans la cible.');
    expect(t).not.toMatch(/Garmin|montre/);
    expect(targetGapReminderCopy(0, 0)).toBe('Aucun jour saisi cette semaine pour l’instant.');
  });
});

describe('export — jours partiels groupés', () => {
  it('une seule ligne, pas une par jour', () => {
    const lines = formatContext({ periods: [CUT, partial('2026-08-20'), partial('2026-10-19')] });
    expect(lines.filter((l) => l.startsWith('◐'))).toEqual([
      '◐ Mesures montre partielles, exclues des références pas/sommeil : 20/08/2026, 19/10/2026',
    ]);
    expect(lines.filter((l) => l.startsWith('⛔'))).toHaveLength(1);
  });
});
