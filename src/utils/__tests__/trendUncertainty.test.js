import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { extractSignals } from '../adaptiveTDEE.js';
import { slopeWithError, tdeeCi95, precisionOf, PRECISION, fmtTDEE, sanitizeScaleResolution } from '../trendUncertainty.js';
import { recalibrationBlock } from '../recalibration.js';
import { summarizeStatus, STATUS_KIND } from '../vibeStatus.js';
import { getHistoricalWeeks } from '../exportUtils.js';
import { TDEE_CHECK } from '../plausibility.js';
import { migrateData, restorableProtocol } from '../../models/protocol.js';
import { addDays } from '../dateUtils.js';

const TODAY = '2026-11-07';
const PROFILE = { sex: 'male', birthYear: 1991, heightCm: 175 };

// Série réelle 24/10 → 06/11 (pesées au kg rond, balance à aiguille).
const REAL = [
  ['2026-10-24', '77', 1000], ['2026-10-25', '76.7', 1741], ['2026-10-26', '77', 1977],
  ['2026-10-27', '76', 2074], ['2026-10-28', '77', 2152], ['2026-10-29', '77.5', 2073],
  ['2026-10-30', '78', 1772], ['2026-10-31', '78', 2296], ['2026-11-01', '78', 1941],
  ['2026-11-02', '78', 2289], ['2026-11-03', '78', 2257], ['2026-11-04', '78', 1526],
  ['2026-11-05', '78', 1835], ['2026-11-06', '78', 2000],
];
const realData = (extra = {}) => ({
  days: Object.fromEntries(REAL.map(([k, w, kcal]) => [k, { weight: w, intake: { kcal: String(kcal) } }])),
  periods: [{ id: 'cut', type: 'untracked', start: '2026-08-20', end: '2026-10-23', scope: 'nutrition' }],
  calibration: { start: '2026-10-24', seedTDEE: 2050, requiredDays: 14 },
  baseTDEE: 2050,
  profile: PROFILE,
  ...extra,
});

// Poids stable autour de 78 kg, bruit jour à jour de ±0,5 kg (lu au 0,5),
// apport 2300 : TDEE vrai ≈ 2300. 28 jours jusqu'à hier.
const NOISE = [0, 0.5, -0.5, 0.5, 0, -0.5, 0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, -0.5];
const noisyData = (extra = {}) => {
  const days = {};
  for (let i = 0; i < 28; i++) {
    const key = addDays(TODAY, -28 + i);
    days[key] = { weight: String(78 + NOISE[i % NOISE.length]), intake: { kcal: '2300' } };
  }
  return { days, baseTDEE: 2050, profile: PROFILE, ...extra };
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 7, 12, 0));
});
afterEach(() => vi.useRealTimers());

describe('slopeWithError', () => {
  const line = Array.from({ length: 14 }, (_, x) => ({ x, y: 80 - 0.05 * x }));

  it('retrouve la pente, erreur nulle sans bruit ni quantification', () => {
    const fit = slopeWithError(line, 0);
    expect(fit.slope).toBeCloseTo(-0.05, 10);
    expect(fit.se).toBeCloseTo(0, 10);
  });

  it('le bruit de quantification élargit l’intervalle même sur des lectures identiques', () => {
    const flat = Array.from({ length: 14 }, (_, x) => ({ x, y: 78 }));
    const ci = (r) => tdeeCi95(slopeWithError(flat, r));
    expect(ci(0)).toBe(0);
    expect(ci(0.1)).toBeLessThan(ci(0.5));
    expect(ci(0.5)).toBeLessThan(ci(1));
  });

  it('null sous 3 points', () => {
    expect(slopeWithError(line.slice(0, 2), 0.5)).toBeNull();
  });
});

describe('précision', () => {
  it('bonne ≤ 150, moyenne ≤ 300, insuffisante au-delà', () => {
    expect(precisionOf(150)).toBe(PRECISION.GOOD);
    expect(precisionOf(300)).toBe(PRECISION.MEDIUM);
    expect(precisionOf(301)).toBe(PRECISION.POOR);
  });
  it('affichage « ~X kcal (±Y) »', () => {
    expect(fmtTDEE(1990, 250)).toMatch(/^~1\s990 kcal \(±250\)$/);
  });
});

describe('réglage « Résolution de la balance » — modèle additif', () => {
  it('défaut 0,5, valeur hors liste ramenée au défaut', () => {
    expect(sanitizeScaleResolution(undefined)).toBe(0.5);
    expect(sanitizeScaleResolution(0.3)).toBe(0.5);
    expect(sanitizeScaleResolution(1)).toBe(1);
  });
  it('migration : réglage ajouté, pesées intactes', () => {
    const raw = realData();
    const m = migrateData(raw);
    expect(m.scaleResolutionKg).toBe(0.5);
    expect(m.days).toBe(raw.days);
    expect(m.days['2026-10-29'].weight).toBe('77.5');
  });
  it('restauration : repris s’il est dans le fichier', () => {
    expect(restorableProtocol({ days: {}, scaleResolutionKg: 0.1 }).scaleResolutionKg).toBe(0.1);
    expect(restorableProtocol({ days: {} })).not.toHaveProperty('scaleResolutionKg');
  });
});

describe('série réelle 24/10 → 06/11', () => {
  it('±491 kcal à 0,5 kg : tendance illisible, fenêtre non allongeable (calibration)', () => {
    const s = extractSignals(realData());
    expect(s.measuredTDEE).toBe(963);
    expect(s.tdeeCi95).toBe(491);
    expect(s.trendReadable).toBe(false);
    expect(s.windowSize).toBe(14);
  });

  it('la résolution change l’intervalle : 0,1 → ±466, 1 → ±565', () => {
    expect(extractSignals(realData({ scaleResolutionKg: 0.1 })).tdeeCi95).toBe(466);
    expect(extractSignals(realData({ scaleResolutionKg: 1 })).tdeeCi95).toBe(565);
  });

  it('le statut « Mesure incohérente » reste prioritaire', () => {
    const s = extractSignals(realData());
    expect(s.tdeeCheck.status).toBe(TDEE_CHECK.IMPLAUSIBLE);
    expect(recalibrationBlock(s, 2050).blockedReason).toMatch(/^Mesure incohérente/);
  });

  it('export : complétude et précision séparées', () => {
    const header = getHistoricalWeeks(realData()).split('\n').find((l) => l.startsWith('⚡'));
    expect(header).toContain('Complétude : sans objet, mesure incohérente (14 j croisés)');
    expect(header).toContain('Précision : sans objet');
    expect(header).not.toMatch(/Confiance/);
  });
});

describe('fenêtre qui s’allonge', () => {
  it('14 j illisibles, 21 j lisibles : la fenêtre passe à 21 j', () => {
    const s = extractSignals(noisyData());
    expect(s.windowSize).toBe(21);
    expect(s.trendReadable).toBe(true);
    expect(s.tdeeCi95).toBeLessThanOrEqual(300);
    expect(s.adaptiveTDEE).toBeGreaterThan(2150);
    expect(s.adaptiveTDEE).toBeLessThan(2450);
  });

  it('allongement bloqué par une période non suivie : reste 14 j, illisible, pas de recalibration', () => {
    const cutEnd = addDays(TODAY, -16);
    const s = extractSignals(noisyData({
      periods: [{ id: 'cut', type: 'untracked', start: '2026-08-01', end: cutEnd, scope: 'nutrition' }],
    }));
    expect(s.windowSize).toBe(14);
    expect(s.trendReadable).toBe(false);
    const r = recalibrationBlock(s, 2050);
    expect(r.canRecalibrate).toBe(false);
    expect(r.blockedReason).toMatch(/^Tendance pas encore lisible — ±\d+ kcal à 95 % sur 14 j/);
    expect(r.blockedReason).toContain('La fenêtre s\'allonge (21 puis 28 j)');
  });

  it('bande d’état : « Tendance pas encore lisible », TDEE en « ~X (±Y) »', () => {
    const cutEnd = addDays(TODAY, -16);
    const s = extractSignals(noisyData({
      periods: [{ id: 'cut', type: 'untracked', start: '2026-08-01', end: cutEnd, scope: 'nutrition' }],
    }));
    const status = summarizeStatus({ diagnosis: null, signals: s });
    expect(status.kind).toBe(STATUS_KIND.TREND_UNREADABLE);
    expect(status.readout).toMatch(/TDEE ~[\d\s]+ kcal \(±\d+\)/);
  });

  it('export : TDEE « ~X kcal (±Y) », complétude et précision', () => {
    const header = getHistoricalWeeks(noisyData()).split('\n').find((l) => l.startsWith('⚡'));
    expect(header).toMatch(/TDEE adaptatif : ~[\d\s]+ kcal \(±\d+\)/);
    expect(header).toMatch(/Complétude : 100% \(21 j croisés sur 21 j\)/);
    expect(header).toMatch(/Précision : ±\d+ kcal \((bonne|moyenne)\)/);
  });
});
