import { describe, it, expect } from 'vitest';
import { computeRecovery, BASELINE_NIGHTS, RECOVERY_WINDOW_DAYS } from '../recoveryBaseline.js';
const DEVICES_SEPT = [{ source: 'apple_watch', from: '2026-09-01', to: null }];
import { addDays } from '../dateUtils.js';

/** n°4 — référence de récupération Apple Watch, lecture seule. */

const DEVICES = [
  { source: 'garmin', from: null, to: '2026-10-18' },
  { source: 'apple_watch', from: '2026-10-19', to: null },
];
const night = (hrv, rhr) => ({ sleep: { hrv: String(hrv), rhr: String(rhr) } });
const nights = (from, n, f) => Object.fromEntries(Array.from({ length: n }, (_, i) => [addDays(from, i), f(i)]));

describe('computeRecovery', () => {
  it('ne compte que la montre portée aujourd’hui : les nuits Garmin sont exclues', () => {
    const days = { ...nights('2026-10-10', 9, () => night(70, 50)), ...nights('2026-10-19', 6, () => night(48, 56)) };
    const r = computeRecovery({ days, devices: DEVICES }, { today: '2026-10-24' });
    expect(r.source).toBe('apple_watch');
    expect(r.since).toBe('2026-10-19');
    expect(r.hrv.nights).toBe(6);
    expect(r.hrv.recent).toBe(48);
    expect(r.hrv.values).toHaveLength(RECOVERY_WINDOW_DAYS);
  });

  it('référence en construction : pas de plage avant 28 nuits', () => {
    const days = nights('2026-10-19', 6, () => night(48, 56));
    const r = computeRecovery({ days, devices: DEVICES }, { today: '2026-10-24' });
    expect(r.hrv.baseline).toBeNull();
    expect(r.rhr.baseline).toBeNull();
  });

  it('28 nuits : plage habituelle = moyenne ± écart-type', () => {
    const days = nights('2026-10-19', BASELINE_NIGHTS, (i) => night(i % 2 ? 50 : 46, 56));
    const r = computeRecovery({ days, devices: DEVICES }, { today: addDays('2026-10-19', BASELINE_NIGHTS - 1) });
    expect(r.hrv.baseline.mean).toBe(48);
    expect(r.hrv.baseline.lo).toBeLessThan(48);
    expect(r.hrv.baseline.hi).toBeGreaterThan(48);
    expect(r.rhr.baseline).toEqual({ mean: 56, lo: 56, hi: 56 });
  });

  it('jours partiels exclus (période recovery), valeurs implausibles ignorées', () => {
    const days = { ...nights('2026-10-19', 6, () => night(48, 56)), '2026-10-22': night(480, 56) };
    const periods = [{ id: 'p', type: 'partial', start: '2026-10-19', end: '2026-10-19', scope: 'recovery' }];
    const r = computeRecovery({ days, devices: DEVICES, periods }, { today: '2026-10-24' });
    expect(r.hrv.nights).toBe(4); // 6 − 1 partiel − 1 faute de frappe
    expect(r.rhr.nights).toBe(5);
  });

  it('sans chronologie de montres : toutes les nuits comptent (comportement v1)', () => {
    const r = computeRecovery({ days: nights('2026-10-19', 3, () => night(48, 56)) }, { today: '2026-10-24' });
    expect(r.source).toBeNull();
    expect(r.hrv.nights).toBe(3);
  });

  it('ne modifie pas les données', () => {
    const data = { days: nights('2026-10-19', 3, () => night(48, 56)), devices: DEVICES };
    const before = JSON.stringify(data);
    computeRecovery(data, { today: '2026-10-24' });
    expect(JSON.stringify(data)).toBe(before);
  });

  it('quelques nuits manquantes ne bloquent pas la référence (fenêtre de 60 jours)', () => {
    const days = nights('2026-09-15', 40, () => night(48, 56));
    delete days['2026-09-20']; delete days['2026-10-02'];
    const r = computeRecovery({ days, devices: DEVICES_SEPT }, { today: '2026-10-24' });
    expect(r.hrv.nights).toBe(38);
    expect(r.hrv.baseline).not.toBeNull();
    expect(r.hrv.values).toHaveLength(RECOVERY_WINDOW_DAYS);
  });

  it('recentNights compte les nuits réellement mesurées sur 7 jours', () => {
    const days = nights('2026-10-19', 5, () => night(48, 56));
    expect(computeRecovery({ days, devices: DEVICES }, { today: '2026-10-24' }).hrv.recentNights).toBe(5);
  });
});
