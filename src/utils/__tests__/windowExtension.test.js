import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { extractSignals } from '../adaptiveTDEE.js';
import { TDEE_CHECK } from '../plausibility.js';
import { summarizeStatus, STATUS_KIND } from '../vibeStatus.js';
import { recalibrationBlock } from '../recalibration.js';
import { emptyDay } from '../../models/day.js';

// Série réelle 24/10 → 13/11 (balance à aiguille, 0,5 kg). Le 24/10 est un
// jeûne après un gros restaurant : pesées basses, puis remplissage du
// glycogène jusqu'au 30/10. Sur 21 j : +0,49 kg/sem, TDEE brut 1375 (absurde).
// Sur les 14 derniers jours (31/10 → 13/11) : poids plat, TDEE ≈ apport moyen ≈ 1956.
const REAL = [
  ['2026-10-24', 77, 1000], ['2026-10-25', 76.7, 1741], ['2026-10-26', 77, 1977],
  ['2026-10-27', 76, 2074], ['2026-10-28', 77, 2152], ['2026-10-29', 77.5, 2073],
  ['2026-10-30', 78, 1772], ['2026-10-31', 78, 2296], ['2026-11-01', 78, 1941],
  ['2026-11-02', 78, 2289], ['2026-11-03', 78, 2257], ['2026-11-04', 78, 1526],
  ['2026-11-05', 78, 1835], ['2026-11-06', 78, 2000], ['2026-11-07', 78.5, 1647],
  ['2026-11-08', 77.5, 2428], ['2026-11-09', 79, 2500], ['2026-11-10', 78, 1588],
  ['2026-11-11', 78.5, 1375], ['2026-11-12', 78, 2159], ['2026-11-13', 78, 1540],
];
const PROFILE = { sex: 'male', birthYear: 1991, heightCm: 175 };
const CUT = { id: 'cut', type: 'untracked', start: '2026-08-20', end: '2026-10-23', scope: 'nutrition' };

const build = ({ atypical = [], withCut = true } = {}) => ({
  days: Object.fromEntries(REAL.map(([k, w, kcal]) => [k, {
    weight: String(w), intake: { kcal: String(kcal) }, atypical: atypical.includes(k),
  }])),
  ...(withCut ? { periods: [CUT], calibration: { start: '2026-10-24', seedTDEE: 2050, requiredDays: 14 } } : {}),
  baseTDEE: 2050,
  profile: PROFILE,
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 14, 12, 0));
});
afterEach(() => vi.useRealTimers());

describe('allongement de la fenêtre — ruptures et plausibilité', () => {
  it('reprise après coupure : reste à 14 j, ~1956 kcal, lecture provisoire (plus de « mesure incohérente »)', () => {
    const s = extractSignals(build());
    expect(s.windowSize).toBe(14);
    expect(s.windowStart).toBe('2026-10-31');
    expect(s.measuredTDEE).toBe(1956);
    expect(s.tdeeCheck.status).not.toBe(TDEE_CHECK.IMPLAUSIBLE);
    expect(s.adaptiveTDEE).toBe(1956);
    expect(s.trendReadable).toBe(false);
    expect(s.extensionBlocked).toEqual({ reason: 'cut', date: '2026-10-23' });
  });

  it('jour atypique coché (24/10), sans coupure connue : allongement refusé', () => {
    const s = extractSignals(build({ withCut: false, atypical: ['2026-10-24'] }));
    expect(s.windowSize).toBe(14);
    expect(s.extensionBlocked).toEqual({ reason: 'atypical', date: '2026-10-24' });
  });

  it('les jours qui SUIVENT un jour atypique bloquent aussi (marge de 3 j)', () => {
    // Fenêtre de 21 j = 24/10 → 13/11 ; un jeûne le 21/10 tombe dans la marge.
    const data = build({ withCut: false });
    data.days['2026-10-21'] = { weight: '', intake: { kcal: '900' }, atypical: true };
    const s = extractSignals(data);
    expect(s.extensionBlocked).toEqual({ reason: 'atypical', date: '2026-10-21' });
  });

  it('filet de sécurité : rien de coché, l’allongement donnerait 1375 kcal → refusé', () => {
    const s = extractSignals(build({ withCut: false }));
    expect(s.windowSize).toBe(14);
    expect(s.measuredTDEE).toBe(1956);
    expect(s.extensionBlocked).toMatchObject({ reason: 'implausible' });
  });

  it('jour atypique DANS la fenêtre de 14 j : aucune donnée retirée (l’apport est réel)', () => {
    const plain = extractSignals(build());
    const tagged = extractSignals(build({ atypical: ['2026-11-09'] }));
    expect(tagged.measuredTDEE).toBe(plain.measuredTDEE);
    expect(tagged.avgIntake).toBe(plain.avgIntake);
  });

  it('bande d’état et recalibration : « lecture provisoire », pas « la fenêtre s’allonge »', () => {
    const s = extractSignals(build({ withCut: false, atypical: ['2026-10-24'] }));
    const status = summarizeStatus({ diagnosis: null, signals: s });
    expect(status.kind).toBe(STATUS_KIND.TREND_UNREADABLE);
    expect(status.headline).toBe('Lecture provisoire');
    expect(status.detail).toMatch(/^TDEE ~1\s956 kcal \(±454\) sur 14 j : fenêtre non allongée \(jour atypique du 24\/10\)/);
    expect(status.detail).not.toContain('s’allonge');
    const r = recalibrationBlock(s, 2050);
    expect(r.canRecalibrate).toBe(false);
    expect(r.blockedReason).toContain('Lecture provisoire : fenêtre non allongée (jour atypique du 24/10)');
  });

  it('un jour vide porte `atypical: false`', () => {
    expect(emptyDay().atypical).toBe(false);
  });
});
