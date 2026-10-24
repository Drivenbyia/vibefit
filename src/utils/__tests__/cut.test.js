import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { extractSignals } from '../adaptiveTDEE.js';
import { computeWeeklyHistory } from '../mathUtils.js';
import { diagnose, DIAGNOSIS } from '../plateauProtocol.js';
import { getHistoricalWeeks } from '../exportUtils.js';
import { addDays } from '../dateUtils.js';
import { computePresetTargets } from '../presetUtils.js';

/**
 * Étape 2 — la coupure « période non suivie » dans les calculs nutritionnels.
 * Horloge figée : les cas sont datés comme la vraie reprise (coupure du 20/08
 * au 23/10/2026), et ne dépendent pas du jour où la suite tourne.
 */

const cut = (start, end) => ({
  id: `cut-${start}`, type: 'untracked', start, end, scope: 'nutrition', label: 'Période non suivie',
});

/** Jours quotidiens poids + apport sur [from, to], TDEE connu par construction. */
function series(from, to, { intake = 2000, tdee = 2400, startWeight = 80 } = {}) {
  const days = {};
  const kgPerDay = -(tdee - intake) / 7700;
  for (let i = 0, k = from; k <= to; i++, k = addDays(k, 1)) {
    days[k] = { weight: (startWeight + kgPerDay * i).toFixed(2), intake: { kcal: String(intake) } };
  }
  return days;
}

const setToday = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  vi.setSystemTime(new Date(y, m - 1, d, 12, 0));
};

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('extractSignals — la coupure n’est jamais traversée', () => {
  it('sans coupure, le résultat est strictement celui d’avant', () => {
    setToday('2026-11-20');
    const days = series('2026-10-22', '2026-11-20');
    const withEmpty = extractSignals({ days, periods: [] });
    const without = extractSignals({ days });
    expect(withEmpty).toEqual(without);
    expect(without.adaptiveTDEE).toBeGreaterThan(0);
    expect(without.excludedDays).toBe(0);
  });

  it('une valeur SAISIE dans la coupure n’entre pas dans le calcul', () => {
    setToday('2026-11-20');
    const days = series('2026-10-24', '2026-11-20');
    // Saisie isolée au milieu de la coupure — elle doit être ignorée, pas
    // reliée par interpolation au premier jour de la reprise.
    days['2026-10-22'] = { weight: '95', intake: { kcal: '4000' } };
    const signals = extractSignals({ days, periods: [cut('2026-08-20', '2026-10-23')] });
    const clean = extractSignals({ days: series('2026-10-24', '2026-11-20'), periods: [cut('2026-08-20', '2026-10-23')] });
    expect(signals).toEqual(clean);
  });

  it('pas d’interpolation à travers une coupure courte, au cœur de l’horizon', () => {
    setToday('2026-11-20');
    // Avant : poids stable à 80. Après : stable à 76. Une coupure de 6 jours
    // entre les deux. Interpolée, la série inventerait une pente de −4 kg.
    const before = series('2026-10-22', '2026-10-30', { tdee: 2000, startWeight: 80 });
    const after = series('2026-11-06', '2026-11-20', { tdee: 2000, startWeight: 76 });
    const signals = extractSignals({
      days: { ...before, ...after },
      periods: [cut('2026-10-31', '2026-11-05')],
    });
    // Seule une fenêtre de 14 jours entièrement après la coupure est candidate.
    expect(signals.windowStart >= '2026-11-06').toBe(true);
    expect(signals.weightTrendPerWeek).toBeCloseTo(0, 5);
    expect(signals.adaptiveTDEE).toBe(2000);
    expect(signals.interpolatedCount).toBe(0);
    // Le tracé ne montre que l'après : aucun segment ne relie 80 à 76 kg.
    expect(Math.max(...signals.weightSeries.map((p) => p.y))).toBeCloseTo(76, 5);
    expect(signals.smoothedWeight).toBeCloseTo(76, 5);
  });

  it('reprise de moins de 14 jours : aucune fenêtre, aucun TDEE — pas de fenêtre tronquée', () => {
    setToday('2026-10-30');
    const signals = extractSignals({
      days: series('2026-10-24', '2026-10-30'),
      periods: [cut('2026-08-20', '2026-10-23')],
    });
    expect(signals.adaptiveTDEE).toBeNull();
    expect(signals.hasEnoughData).toBe(false);
    expect(signals.confidence).toBe(0);
    expect(signals.windowStart).toBeNull();
    expect(signals.windowAgeDays).toBeNull();
    expect(signals.excludedDays).toBeGreaterThan(0);
    // Le poids courant reste affiché : c'est une vraie mesure de la reprise.
    expect(signals.smoothedWeight).not.toBeNull();
  });

  it('dès 14 jours après la reprise, la fenêtre se forme sur la reprise seule', () => {
    setToday('2026-11-06');
    const signals = extractSignals({
      days: series('2026-10-24', '2026-11-06', { intake: 2050, tdee: 2050 }),
      periods: [cut('2026-08-20', '2026-10-23')],
    });
    expect(signals.windowStart).toBe('2026-10-24');
    expect(signals.windowEnd).toBe('2026-11-06');
    expect(signals.overlapDays).toBe(14);
    expect(signals.adaptiveTDEE).toBe(2050);
  });
});

describe('computeWeeklyHistory — périmètre nutrition seulement', () => {
  it('vide apport, poids et adhérence des jours coupés, garde pas et sommeil', () => {
    setToday('2026-10-26');
    const days = {
      '2026-10-21': {
        intake: { kcal: '2100' }, weight: '77', expenditure: { steps: '11211' },
        sleep: { durationMin: '374', hrv: '53' },
      },
      '2026-10-24': { intake: { kcal: '2050' }, weight: '76.5', expenditure: { steps: '9000' } },
    };
    const [week] = computeWeeklyHistory(
      { days, periods: [cut('2026-08-20', '2026-10-23')] },
      computePresetTargets('maintenance', 2050),
      2
    );
    expect(week.weekStart).toBe('2026-10-19');
    expect(week.excludedDays).toBe(5);
    expect(week.recordedDays).toBe(1);   // seul le 24/10 compte
    expect(week.avgIntake).toBe(2050);
    expect(week.avgWeight).toBe(76.5);
    expect(week.stepsDays).toBe(2);       // la nuit / les pas du 21/10 restent
    expect(week.sleep.nights).toBe(1);
  });
});

describe('diagnose — une semaine coupée n’est jamais jugée', () => {
  const signals = { hasEnoughData: true, adaptiveTDEE: 2050, confidence: 90, overlapDays: 13 };
  const week = (over) => ({ recordedDays: 7, avgIntake: 2050, avgWeight: 76, avgWaist: null, elapsedDays: 7, excludedDays: 0, ...over });

  it('ne compare pas une semaine d’avant la coupure à une semaine d’après', () => {
    const d = diagnose({
      signals,
      weeklyHistory: [
        week({ avgWeight: 78 }),
        week({ avgWeight: 78 }),
        week({ excludedDays: 7, recordedDays: 0, avgIntake: null, avgWeight: null }),
        week({ excludedDays: 5, recordedDays: 2 }),
        week({}),
        week({}),
      ],
    });
    // 2 semaines propres depuis la coupure : pas de verdict, et surtout pas
    // « adhérence insuffisante » à cause des semaines coupées.
    expect(d.status).toBe(DIAGNOSIS.INSUFFICIENT_DATA);
    expect(d.weeksEvaluated).toBe(2);
    expect(d.detail).toContain('depuis la période non suivie');
  });

  it('reprise sans fenêtre complète : ne prétend pas « 0 jour croisé »', () => {
    const d = diagnose({
      signals: { hasEnoughData: false, adaptiveTDEE: null, overlapDays: 0, windowStart: null, excludedDays: 20 },
      weeklyHistory: [],
    });
    expect(d.status).toBe(DIAGNOSIS.INSUFFICIENT_DATA);
    expect(d.detail).toBe('Fenêtre de 14 jours pas encore complète depuis la période non suivie.');
  });

  it('sans coupure, rien ne change (les semaines anciennes restent jugeables)', () => {
    const d = diagnose({
      signals,
      weeklyHistory: [week({}), week({}), week({}), week({ recordedDays: 3 })],
    });
    expect(d.status).toBe(DIAGNOSIS.LOW_ADHERENCE);
  });
});

describe('export — la période dit pourquoi elle est vide', () => {
  it('annonce l’absence de fenêtre hors coupure', () => {
    setToday('2026-10-24');
    const report = getHistoricalWeeks(
      { days: series('2026-10-24', '2026-10-24'), periods: [cut('2026-08-20', '2026-10-23')] },
      1
    );
    expect(report).toContain('Période : N/A (aucune fenêtre de 14 j hors période non suivie)');
  });
});
