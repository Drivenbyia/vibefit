import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatCoachContext } from '../coachContext.js';
import { getHistoricalWeeks } from '../exportUtils.js';
import { computePresetTargets } from '../presetUtils.js';
import { addDays } from '../dateUtils.js';

/** Bloc « Contexte courant » de l'export : « — » plutôt qu'une valeur inventée. */

const TODAY = '2026-10-24';
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 9, 24, 20)); });
afterEach(() => vi.useRealTimers());

const field = (lines, name) => lines.find((l) => l.startsWith(`- ${name}`))?.split(' : ').slice(1).join(' : ');

const PHASE = { id: 'm', type: 'medical_stop', label: 'Arrêt médical', start: '2026-08-29', plannedEnd: '2027-03-01', endedAt: null };
const real = () => {
  const days = {};
  for (let i = 0; i < 6; i++) {
    const k = addDays('2026-10-19', i);
    days[k] = { weight: '77', intake: { kcal: '2000', protein: String(140 + i * 5) },
      expenditure: { steps: String(8000 + i * 100) }, sleep: { durationMin: '450', hrv: '55', rhr: '60' } };
  }
  days['2026-10-05'] = { waist: '88' }; days['2026-10-12'] = { waist: '87.5' }; days['2026-10-19'].waist = '87';
  days['2026-09-28'] = { waist: '89' };
  return {
    days, phases: [PHASE], presetId: 'maintenance', baseTDEE: 2050, targets: computePresetTargets('maintenance', 2050),
    devices: [{ source: 'apple_watch', from: '2026-10-19', to: null }],
    calibration: { start: '2026-10-24', seedTDEE: 2050, requiredDays: 14 },
  };
};

describe('formatCoachContext', () => {
  it('état vide : chaque champ mesuré vaut « — »', () => {
    const lines = formatCoachContext({ days: {} }, { today: TODAY });
    for (const f of ['Phase', 'TDEE adaptatif', 'Poids lissé', 'Tour de taille', 'Pas montre', 'Protéines', 'Sommeil', 'VFC RMSSD', 'FC repos']) {
      expect(field(lines, f), f).toBe('—');
    }
    expect(lines.join('\n')).not.toMatch(/NaN|undefined|null/);
  });

  it('état réel : phase, calibration, cible unique, 3 dernières tailles, moyennes 7 j', () => {
    const lines = formatCoachContext(real(), { today: TODAY });
    expect(field(lines, 'Phase')).toBe('Arrêt médical depuis le 29/08/2026 · fin prévue le 01/03/2027');
    expect(field(lines, 'Preset')).toMatch(/^Maintenance · base 2\s050 kcal$/);
    expect(field(lines, 'TDEE adaptatif')).toMatch(/^calibration 1\/14 j croisés depuis le 24\/10\/2026 · 14\/14 au plus tôt le 06\/11/);
    expect(field(lines, 'Cible')).toMatch(/^cible unique 2\s050 kcal\/j$/);
    expect(field(lines, 'Tour de taille (3 dernières mesures)')).toBe('87,0 cm (19/10) · 87,5 cm (12/10) · 88,0 cm (05/10)');
    expect(field(lines, 'Pas montre (7 j)')).toMatch(/^8\s250\/j sur 6 jours · objectif 8\s000$/);
    expect(field(lines, 'Protéines (7 j)')).toBe('153 g/j sur 6 jours · plancher 130 g');
    expect(field(lines, 'Sommeil (7 j)')).toBe('7 h 30 sur 6 nuits');
    expect(field(lines, 'VFC RMSSD (nuit)')).toBe('55 ms sur 6 nuits (7 j)');
    expect(field(lines, 'FC repos')).toBe('60 bpm sur 6 nuits (7 j)');
    expect(lines.join('\n')).not.toMatch(/NaN|undefined/);
  });

  it('le rapport exporté contient le bloc, avant les semaines', () => {
    const report = getHistoricalWeeks(real(), 2);
    expect(report.indexOf('## Contexte courant')).toBeGreaterThan(-1);
    expect(report.indexOf('## Contexte courant')).toBeLessThan(report.indexOf('## Semaine du'));
  });

  it('ne modifie pas les données', () => {
    const data = real();
    const before = JSON.stringify(data);
    formatCoachContext(data, { today: TODAY });
    expect(JSON.stringify(data)).toBe(before);
  });

  describe('coupure : mesures d’avant marquées « avant coupure »', () => {
    const CUT = { id: 'c', type: 'untracked', start: '2026-08-20', end: '2026-10-23', scope: 'nutrition' };
    const before = {
      '2026-08-03': { waist: '91', weight: '78.6' },
      '2026-08-10': { waist: '88.5', weight: '78.3' },
      '2026-08-17': { waist: '90.5', weight: '78', sleep: { hrv: '52', rhr: '57', durationMin: '420' },
        intake: { kcal: '2100', protein: '165' }, expenditure: { steps: '9100' } },
    };
    const DEVICES = [{ source: 'garmin', from: null, to: '2026-10-18' }, { source: 'apple_watch', from: '2026-10-19', to: null }];
    const base = { periods: [CUT], devices: DEVICES };

    it('aucune mesure depuis la reprise : « — (dernière : …, avant coupure) », montre nommée pour la VFC', () => {
      const lines = formatCoachContext({ ...base, days: before }, { today: TODAY });
      expect(field(lines, 'Tour de taille (3 dernières mesures)')).toBe('— (dernière : 90,5 cm le 17/08, avant coupure)');
      expect(field(lines, 'Poids lissé')).toBe('— (dernière : 78,0 kg le 17/08, avant coupure)');
      expect(field(lines, 'Pas montre (7 j)')).toMatch(/^— \(dernière : 9\s100 pas le 17\/08, avant coupure\)$/);
      expect(field(lines, 'Protéines (7 j)')).toBe('— (dernière : 165 g le 17/08, avant coupure)');
      expect(field(lines, 'Sommeil (7 j)')).toBe('— (dernière : 7 h 00 le 17/08, avant coupure)');
      expect(field(lines, 'VFC RMSSD (nuit)')).toBe('— (dernière : 52 ms (Garmin) le 17/08, avant coupure)');
      expect(field(lines, 'FC repos')).toBe('— (dernière : 57 bpm (Garmin) le 17/08, avant coupure)');
    });

    it('une mesure depuis la reprise : listée en premier, les anciennes marquées', () => {
      vi.setSystemTime(new Date(2026, 9, 26, 20));
      const days = { ...before, '2026-10-26': { waist: '87' } };
      const lines = formatCoachContext({ ...base, days }, { today: '2026-10-26' });
      expect(field(lines, 'Tour de taille (3 dernières mesures)'))
        .toBe('87,0 cm (26/10) · 90,5 cm (17/08, avant coupure) · 88,5 cm (10/08, avant coupure)');
    });

    it('moyenne 7 j qui inclut un jour d’avant une coupure courte : signalé', () => {
      const short = { id: 's', type: 'untracked', start: '2026-10-22', end: '2026-10-23', scope: 'nutrition' };
      const days = { '2026-10-20': { expenditure: { steps: '9000' } }, '2026-10-24': { expenditure: { steps: '8000' } } };
      const lines = formatCoachContext({ days, periods: [short], devices: DEVICES }, { today: TODAY });
      expect(field(lines, 'Pas montre (7 j)')).toMatch(/inclut des jours avant coupure$/);
    });
  });
});
