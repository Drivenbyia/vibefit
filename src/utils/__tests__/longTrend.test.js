import { describe, it, expect } from 'vitest';
import { computeLongTrend, gapStatus, LONG_TREND_WEEKS, shadedRuns } from '../longTrend.js';
import { weekReadout } from '../longTrendCopy.js';
import { computePresetTargets, resolveTargets } from '../presetUtils.js';

/** n°6 — tendance longue, lecture seule. */

const T2050 = computePresetTargets('maintenance', 2050);
const current = resolveTargets({ targets: T2050, presetId: 'maintenance', baseTDEE: 2050 });
const CUT_LIGHT = computePresetTargets('cut_light', 2000);
const HISTORY = [{ until: '2026-10-23', presetId: 'cut_light', baseTDEE: 2000, targets: CUT_LIGHT }];
const CUT = { id: 'c', type: 'untracked', start: '2026-08-20', end: '2026-10-23', scope: 'nutrition' };
const day = (kcal, weight = '', waist = '') => ({ intake: { kcal: String(kcal) }, weight, waist, expenditure: {} });

describe('computeLongTrend', () => {
  it('12 semaines, la plus ancienne d’abord, la semaine en cours en dernier', () => {
    const t = computeLongTrend({ days: {} }, current, { today: '2026-10-24' });
    expect(t).toHaveLength(LONG_TREND_WEEKS);
    expect(t.at(-1).weekStart).toBe('2026-10-19');
    expect(t[0].weekStart).toBe('2026-08-03');
  });

  it('semaine sans mesure : null partout (le tracé se coupe)', () => {
    const w = computeLongTrend({ days: {} }, current, { today: '2026-10-24' })[0];
    expect(w).toMatchObject({ weight: null, waist: null, gapPerDay: null, comparableDays: 0 });
  });

  it('moyennes de la semaine : poids, tour de taille', () => {
    const days = { '2026-08-03': day(2000, '78', '86'), '2026-08-04': day(1600, '77.6') };
    const w = computeLongTrend({ days, targetHistory: HISTORY }, current, { today: '2026-10-24' })[0];
    expect(w.weight).toBeCloseTo(77.8);
    expect(w.waist).toBe(86);
  });

  it('écart jugé contre la cible de SA date (historique), par jour comparable', () => {
    // lun 03/08 TRAIN 2000, mar 04/08 OFF 1600 en Sèche légère.
    const days = { '2026-08-03': day(2100), '2026-08-04': day(1700) };
    const withHistory = computeLongTrend({ days, targetHistory: HISTORY }, current, { today: '2026-10-24' })[0];
    expect(withHistory.gapPerDay).toBe(100);
    // Sans historique, la même semaine serait jugée contre 2250/1850.
    const without = computeLongTrend({ days }, current, { today: '2026-10-24' })[0];
    expect(without.gapPerDay).toBe(-150);
  });

  it('période non suivie : semaine marquée, aucune mesure nutrition', () => {
    const days = { '2026-09-07': day(2500, '80') };
    const t = computeLongTrend({ days, periods: [CUT] }, current, { today: '2026-10-24' });
    const w = t.find((x) => x.weekStart === '2026-09-07');
    expect(w).toMatchObject({ untracked: true, weight: null, gapPerDay: null });
    expect(t.at(-1).untracked).toBe(false); // 19/10 : 24/10 hors coupure
  });

  it('les jours futurs de la semaine en cours sont ignorés', () => {
    const days = { '2026-10-25': day(3000, '90') };
    expect(computeLongTrend({ days }, current, { today: '2026-10-24' }).at(-1).weight).toBeNull();
  });

  it('ne modifie pas les données', () => {
    const data = { days: { '2026-08-03': day(2000, '78') }, targetHistory: HISTORY };
    const before = JSON.stringify(data);
    computeLongTrend(data, current, { today: '2026-10-24' });
    expect(JSON.stringify(data)).toBe(before);
  });
});

describe('gapStatus', () => {
  it('±100 kcal/j = dans la cible', () => {
    expect(gapStatus(null)).toBeNull();
    expect(gapStatus(100)).toBe('in');
    expect(gapStatus(-100)).toBe('in');
    expect(gapStatus(101)).toBe('over');
    expect(gapStatus(-101)).toBe('under');
  });
});

describe('lisibilité', () => {
  it('shadedRuns : une plage par suite de colonnes', () => {
    expect(shadedRuns([false, true, true, true, false, true])).toEqual([{ start: 1, len: 3 }, { start: 5, len: 1 }]);
    expect(shadedRuns([])).toEqual([]);
  });
  it('une mesure absente est nommée dans la ligne de lecture', () => {
    expect(weekReadout({ weekStart: '2026-10-19', weight: 77, waist: null, gapPerDay: null }))
      .toBe('19/10 · 77,0 kg · taille — · écart —');
  });
});
