import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { extractSignals, theilSenSlope, olsSlope } from '../adaptiveTDEE.js';
import { TDEE_CHECK } from '../plausibility.js';
import { addDays } from '../dateUtils.js';

// Série réelle 24/10 → 06/11/2026.
const REAL = [
  ['2026-10-24', '77', 1000], ['2026-10-25', '76.7', 1741], ['2026-10-26', '77', 1977],
  ['2026-10-27', '76', 2074], ['2026-10-28', '77', 2152], ['2026-10-29', '77.5', 2073],
  ['2026-10-30', '78', 1772], ['2026-10-31', '78', 2296], ['2026-11-01', '78', 1941],
  ['2026-11-02', '78', 2289], ['2026-11-03', '78', 2257], ['2026-11-04', '78', 1526],
  ['2026-11-05', '78', 1835], ['2026-11-06', '78', 2000],
];
const realData = () => ({
  days: Object.fromEntries(REAL.map(([k, w, kcal]) => [k, { weight: w, intake: { kcal: String(kcal) } }])),
  periods: [{ id: 'cut', type: 'untracked', start: '2026-08-20', end: '2026-10-23', scope: 'nutrition' }],
  calibration: { start: '2026-10-24', seedTDEE: 2050, requiredDays: 14 },
  profile: { sex: 'male', birthYear: 1991, heightCm: 175 },
});
const points = REAL.map(([, w], x) => ({ x, y: Number(w) }));

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 7, 12, 0));
});
afterEach(() => vi.useRealTimers());

describe('theilSenSlope', () => {
  it('retrouve la pente d’une droite', () => {
    expect(theilSenSlope([{ x: 0, y: 0 }, { x: 1, y: 2 }, { x: 2, y: 4 }])).toBeCloseTo(2, 10);
  });
  it('ignore un point de début aberrant, là où l’OLS le suit', () => {
    const line = Array.from({ length: 14 }, (_, x) => ({ x, y: 78 }));
    line[0] = { x: 0, y: 75 };
    expect(theilSenSlope(line)).toBe(0);
    expect(olsSlope(line)).toBeGreaterThan(0.05);
  });
  it('respecte les index réels en présence de trous', () => {
    expect(theilSenSlope([{ x: 0, y: 0 }, { x: 5, y: 5 }, { x: 10, y: 10 }])).toBeCloseTo(1, 10);
  });
  it('null sans paire exploitable', () => {
    expect(theilSenSlope([{ x: 0, y: 1 }])).toBeNull();
  });
});

describe('série réelle — comparaison des deux pentes', () => {
  it('Theil-Sen +0,100 kg/j (+0,70/sem) contre OLS +0,125 kg/j (+0,87/sem)', () => {
    expect(theilSenSlope(points)).toBeCloseTo(0.1, 10);
    expect(olsSlope(points)).toBeCloseTo(0.1248, 4);
  });

  it('TDEE : 1154 kcal (Theil-Sen, retenu) contre 963 (OLS, contrôle) — tous deux incohérents', () => {
    const s = extractSignals(realData());
    expect(s.slopeMethod).toBe('theil-sen');
    expect(s.avgIntake).toBe(1924);
    expect(s.weightTrendPerWeek).toBe(0.7);
    expect(s.measuredTDEE).toBe(1154);
    expect(s.control).toEqual({ method: 'ols', slopeKgPerWeek: 0.87, tdee: 963 });
    // Plancher 1874 : la hausse s'étale sur les 6 premiers jours, ce n'est
    // pas un point isolé — l'estimateur robuste la garde.
    expect(s.tdeeCheck.status).toBe(TDEE_CHECK.IMPLAUSIBLE);
    expect(s.adaptiveTDEE).toBeNull();
  });

  it('un seul jour atypique en tête de fenêtre ne déplace plus le TDEE', () => {
    // Poids stable à 78, apport 2300, sauf le premier jour pesé à 76 (jeûne).
    const today = '2026-11-07';
    const days = {};
    for (let i = 0; i < 14; i++) {
      days[addDays(today, -14 + i)] = { weight: i === 0 ? '76' : '78', intake: { kcal: '2300' } };
    }
    const s = extractSignals({ days });
    expect(s.measuredTDEE).toBe(2300);
    expect(s.control.tdee).toBeLessThan(1900);
  });
});
