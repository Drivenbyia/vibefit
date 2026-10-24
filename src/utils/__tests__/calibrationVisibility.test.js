import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { extractSignals, calibrationProgress, calibrationDayStatus, CALIBRATION_DAY } from '../adaptiveTDEE.js';
import { diagnose } from '../plateauProtocol.js';
import { summarizeStatus } from '../vibeStatus.js';
import { etaLabel, incompleteLabel, ddmm } from '../calibrationCopy.js';
import { addDays } from '../dateUtils.js';

/** n°2 — ce qui manque à la calibration, et quand elle peut aboutir. */

const CUT = { id: 'cut', type: 'untracked', start: '2026-08-20', end: '2026-10-23', scope: 'nutrition' };
const CALIB = { start: '2026-10-24', seedTDEE: 2050, requiredDays: 14 };
const full = { weight: '77', intake: { kcal: '2050' } };
const noWeight = { weight: '', intake: { kcal: '2050' } };
const noIntake = { weight: '77', intake: { kcal: '' } };

const setToday = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  vi.setSystemTime(new Date(y, m - 1, d, 12, 0));
};
const range = (from, to, day = full) => {
  const out = {};
  for (let k = from; k <= to; k = addDays(k, 1)) out[k] = day;
  return out;
};
const state = (days) => ({ days, periods: [CUT], calibration: CALIB });

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('calibrationDayStatus', () => {
  it('distingue pesée manquante, apport manquant, vide et compté', () => {
    const s = (day) => calibrationDayStatus('2026-10-25', day, [], CALIB, '2026-10-30');
    expect(s(full)).toBe(CALIBRATION_DAY.COUNTED);
    expect(s(noWeight)).toBe(CALIBRATION_DAY.NO_WEIGHT);
    expect(s(noIntake)).toBe(CALIBRATION_DAY.NO_INTAKE);
    expect(s(undefined)).toBe(CALIBRATION_DAY.EMPTY);
  });
  it('hors calibration : avant le début, dans le futur, coupé, ou sans calibration', () => {
    expect(calibrationDayStatus('2026-10-23', full, [], CALIB, '2026-10-30')).toBeNull();
    expect(calibrationDayStatus('2026-10-31', full, [], CALIB, '2026-10-30')).toBeNull();
    expect(calibrationDayStatus('2026-10-25', full, [{ ...CUT, end: '2026-10-25' }], CALIB, '2026-10-30')).toBeNull();
    expect(calibrationDayStatus('2026-10-25', full, [], null, '2026-10-30')).toBeNull();
  });
});

describe('jours à compléter et date la plus proche', () => {
  it('cas réel : tout saisi depuis le 24/10 ⇒ 14/14 au plus tôt le 06/11', () => {
    setToday('2026-10-24');
    const c = extractSignals(state({ '2026-10-24': full })).calibration;
    expect(c).toMatchObject({ crossedDays: 1, todayStatus: 'counted', earliestCompletion: '2026-11-06', incompleteDays: [] });
  });

  it('aujourd’hui pas encore complet : il peut encore compter', () => {
    setToday('2026-10-24');
    const c = extractSignals(state({ '2026-10-24': noIntake })).calibration;
    expect(c.earliestCompletion).toBe('2026-11-06');
    expect(c.incompleteDays).toEqual([]); // la journée n'est pas finie
  });

  it('un jour passé incomplet repousse la date d’un jour et apparaît à compléter', () => {
    setToday('2026-10-27');
    const days = { ...range('2026-10-24', '2026-10-27'), '2026-10-25': noWeight };
    const c = calibrationProgress(state(days), '2026-10-27');
    expect(c.crossedDays).toBe(3);
    expect(c.incompleteDays).toEqual([{ key: '2026-10-25', status: CALIBRATION_DAY.NO_WEIGHT }]);
    expect(c.earliestCompletion).toBe('2026-11-07');
    // Rattraper la pesée du 25 ramène la date au 06/11.
    const fixed = calibrationProgress(state({ ...days, '2026-10-25': full }), '2026-10-27');
    expect(fixed.earliestCompletion).toBe('2026-11-06');
  });

  it('un jour sans aucune saisie compte comme à compléter', () => {
    const c = calibrationProgress(state({ '2026-10-24': full, '2026-10-26': full }), '2026-10-26');
    expect(c.incompleteDays).toEqual([{ key: '2026-10-25', status: CALIBRATION_DAY.EMPTY }]);
  });

  it('calibrationProgress = extractSignals().calibration', () => {
    setToday('2026-10-28');
    const days = { ...range('2026-10-24', '2026-10-28'), '2026-10-26': noIntake };
    expect(calibrationProgress(state(days))).toEqual(extractSignals(state(days)).calibration);
  });

  it('seuil atteint : plus de date', () => {
    const c = calibrationProgress(state(range('2026-10-24', '2026-11-06')), '2026-11-06');
    expect(c.active).toBe(false);
    expect(c.earliestCompletion).toBeNull();
    expect(etaLabel(c)).toBeNull();
  });
});

describe('textes', () => {
  it('libellés courts', () => {
    expect(ddmm('2026-11-06')).toBe('06/11');
    const c = {
      active: true, requiredDays: 14, earliestCompletion: '2026-11-08',
      incompleteDays: [
        { key: '2026-10-25', status: 'no_weight' },
        { key: '2026-10-26', status: 'empty' },
        { key: '2026-10-27', status: 'no_intake' },
      ],
    };
    expect(etaLabel(c)).toBe('14/14 au plus tôt le 08/11');
    expect(incompleteLabel(c)).toBe('27/10 (apport), 26/10 (pesée + apport) et 1 autre');
  });

  it('bande et diagnostic annoncent la même date et les jours à rattraper', () => {
    setToday('2026-10-27');
    const days = { ...range('2026-10-24', '2026-10-27'), '2026-10-25': noWeight };
    const signals = extractSignals(state(days));
    const diagnosis = diagnose({ signals, weeklyHistory: [] });
    expect(diagnosis.detail).toContain('14/14 au plus tôt le 07/11');
    expect(diagnosis.detail).toContain('À compléter : 25/10 (pesée).');
    const band = summarizeStatus({ diagnosis, signals });
    expect(band.detail).toBe('3/14 jours croisant poids et apport · 14/14 au plus tôt le 07/11. À compléter : 25/10 (pesée).');
  });
});
