import { describe, it, expect, vi, afterEach } from 'vitest';
import { formatInfoActivities } from '../../models/protocol.js';
import { dayType } from '../../models/day.js';
import { mergeDays } from '../backupUtils.js';
import { extractSignals } from '../adaptiveTDEE.js';
import { getHistoricalWeeks } from '../exportUtils.js';
import { addDays } from '../dateUtils.js';

/** Étape 7 — saisie Apple (option A), activités à titre d'info, import non destructif. */

afterEach(() => vi.useRealTimers());

const WALK = [{ type: 'walking', durationMin: 5, source: 'Apple Watch' }];

describe('activités d’info — lues par aucun calcul', () => {
  it('format lisible', () => {
    expect(formatInfoActivities([
      { type: 'cycling', durationMin: 22.8, source: 'Fitness' },
      { type: 'walking', durationMin: 3.5, source: 'Fitness' },
    ])).toBe('vélo 23 min (Fitness) · marche 4 min (Fitness)');
    expect(formatInfoActivities(undefined)).toBe('');
    expect(formatInfoActivities([{ type: 'walking' }])).toBe('');
  });

  it('ne changent pas le type de jour', () => {
    expect(dayType('2026-10-27', { infoActivities: WALK })).toBe(dayType('2026-10-27', {}));
  });

  it('ne changent pas le TDEE', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 20, 12));
    const days = {};
    for (let k = '2026-10-22'; k <= '2026-11-20'; k = addDays(k, 1)) days[k] = { weight: '77', intake: { kcal: '2050' } };
    const withActs = Object.fromEntries(Object.entries(days).map(([k, d]) => [k, { ...d, infoActivities: WALK }]));
    expect(extractSignals({ days: withActs })).toEqual(extractSignals({ days }));
  });

  it('sont publiées dans l’export, marquées « info »', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 24, 12));
    const report = getHistoricalWeeks({ days: { '2026-10-22': { infoActivities: WALK } } }, 1);
    expect(report).toContain('Activités (info): marche 5 min (Apple Watch)');
  });
});

describe('import Apple par « Fusionner » — ne remplit que le vide', () => {
  it('ne touche jamais une valeur déjà saisie à la main', () => {
    const prev = { '2026-10-24': { intake: { kcal: '2040' }, sleep: { durationMin: '500', hrv: '' } } };
    const incoming = { '2026-10-24': { sleep: { durationMin: '518', hrv: '51', hrvSdnn: '50', rhr: '56', source: 'apple_watch' } } };
    const { days } = mergeDays(prev, incoming);
    expect(days['2026-10-24'].sleep).toEqual({ durationMin: '500', hrv: '51', hrvSdnn: '50', rhr: '56', source: 'apple_watch' });
    expect(days['2026-10-24'].intake.kcal).toBe('2040');
  });

  it('crée un jour absent avec sa source de pas explicite', () => {
    const { days, added } = mergeDays({}, { '2026-10-21': { expenditure: { steps: '11211', stepsSource: 'apple_watch' } } });
    expect(added).toBe(1);
    expect(days['2026-10-21'].expenditure).toEqual({ kcal: '', steps: '11211', stepsSource: 'apple_watch' });
  });
});
