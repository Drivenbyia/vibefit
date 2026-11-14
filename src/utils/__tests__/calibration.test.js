import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { extractSignals } from '../adaptiveTDEE.js';
import { diagnose, DIAGNOSIS } from '../plateauProtocol.js';
import { summarizeStatus, STATUS_KIND } from '../vibeStatus.js';
import { getHistoricalWeeks } from '../exportUtils.js';
import { computeSingleTarget } from '../presetUtils.js';
import { sanitizeProtocol, restorableProtocol, migrateData } from '../../models/protocol.js';
import { addDays } from '../dateUtils.js';

/** Étape 4 — TDEE de départ 2050, calibration stricte à 14 jours croisés. */

const CUT = { id: 'cut', type: 'untracked', start: '2026-08-20', end: '2026-10-23', scope: 'nutrition' };
const CALIB = { start: '2026-10-24', seedTDEE: 2050, requiredDays: 14 };

const setToday = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  vi.setSystemTime(new Date(y, m - 1, d, 12, 0));
};

/** Jours poids + apport sur [from, to], sauf les dates de `skip`. */
function series(from, to, { intake = 2050, weight = '77', skip = [] } = {}) {
  const days = {};
  for (let k = from; k <= to; k = addDays(k, 1)) {
    if (!skip.includes(k)) days[k] = { weight, intake: { kcal: String(intake) } };
  }
  return days;
}

const state = (days, extra = {}) => ({ days, periods: [CUT], calibration: CALIB, baseTDEE: 2050, ...extra });

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('schéma — la calibration est un champ du protocole', () => {
  it('sanitize : complète requiredDays, rejette une calibration invalide', () => {
    expect(sanitizeProtocol({ calibration: { start: '2026-10-24', seedTDEE: 2050 } }).calibration)
      .toEqual({ start: '2026-10-24', seedTDEE: 2050, requiredDays: 14 });
    expect(sanitizeProtocol({ calibration: { start: '24/10', seedTDEE: 2050 } }).calibration).toBeNull();
    expect(sanitizeProtocol({ calibration: { start: '2026-10-24', seedTDEE: 'x' } }).calibration).toBeNull();
  });

  it('migration : absente ⇒ null ; restauration : reprise si présente dans le fichier', () => {
    expect(migrateData({ days: {} }).calibration).toBeNull();
    expect(restorableProtocol({ days: {}, calibration: CALIB })).toEqual({ calibration: CALIB });
    expect(restorableProtocol({ days: {} })).toEqual({});
  });
});

describe('extractSignals — rien n’est publié avant 14 jours croisés', () => {
  it('J10 : une fenêtre existerait pour le moteur ordinaire, mais pas de TDEE', () => {
    setToday('2026-11-06');
    // 14 jours calendaires, 4 sans pesée ⇒ 10 croisés : le moteur ordinaire
    // publierait (seuil 10), la calibration non (seuil 14).
    const skip = ['2026-10-26', '2026-10-29', '2026-11-01', '2026-11-04'];
    const s = extractSignals(state(series('2026-10-24', '2026-11-06', { skip })));
    const ordinary = extractSignals({ ...state(series('2026-10-24', '2026-11-06', { skip })), calibration: null });
    expect(ordinary.adaptiveTDEE).not.toBeNull();
    expect(s.adaptiveTDEE).toBeNull();
    expect(s.hasEnoughData).toBe(false);
    expect(s.calibration).toMatchObject({ active: true, crossedDays: 10, requiredDays: 14, seedTDEE: 2050 });
  });

  it('les jours croisés sont comptés sur tout l’historique, pas seulement 14 jours consécutifs', () => {
    setToday('2026-11-10');
    const skip = ['2026-10-26', '2026-10-29', '2026-11-01', '2026-11-04'];
    const s = extractSignals(state(series('2026-10-24', '2026-11-10', { skip })));
    expect(s.calibration).toMatchObject({ active: false, crossedDays: 14 });
    expect(s.adaptiveTDEE).toBe(2050);
  });

  it('un jour avec poids SANS apport (ou l’inverse) ne compte pas', () => {
    setToday('2026-11-06');
    const days = series('2026-10-24', '2026-11-06');
    days['2026-11-06'] = { weight: '77', intake: { kcal: '' } };
    expect(extractSignals(state(days)).calibration.crossedDays).toBe(13);
  });

  it('14/14 : la valeur mesurée apparaît, sur la reprise seule', () => {
    setToday('2026-11-06');
    const s = extractSignals(state(series('2026-10-24', '2026-11-06', { intake: 2100 })));
    expect(s.calibration.active).toBe(false);
    expect(s.adaptiveTDEE).toBe(2100); // poids stable ⇒ TDEE = apport
    expect(s.windowStart).toBe('2026-10-24');
  });

  it('aucune donnée antérieure au début de calibration n’entre dans le TDEE, même sans coupure', () => {
    setToday('2026-11-20');
    // Avant le 24/10 : apport 3000 à poids stable — un TDEE « d'avant » à 3000.
    const before = series('2026-10-10', '2026-10-23', { intake: 3000 });
    const after = series('2026-10-24', '2026-11-20', { intake: 2050 });
    const s = extractSignals({ days: { ...before, ...after }, calibration: CALIB });
    expect(s.windowStart >= '2026-10-24').toBe(true);
    expect(s.adaptiveTDEE).toBe(2050);
  });

  it('sans calibration : comportement inchangé', () => {
    setToday('2026-11-06');
    const days = series('2026-10-24', '2026-11-06');
    expect(extractSignals({ days, periods: [CUT] }).calibration).toBeNull();
    expect(extractSignals({ days, periods: [CUT] }).adaptiveTDEE).toBe(2050);
  });
});

describe('diagnostic, bande d’état, export — « calibration en cours »', () => {
  it('diagnose : CALIBRATING remplace tout verdict', () => {
    setToday('2026-10-30');
    const signals = extractSignals(state(series('2026-10-24', '2026-10-30')));
    const d = diagnose({ signals, weeklyHistory: [] });
    expect(d.status).toBe(DIAGNOSIS.CALIBRATING);
    expect(d.label).toBe('Calibration en cours');
    expect(d.detail).toBe('7/14 jours croisant poids et apport depuis le 24/10/2026 — 14/14 au plus tôt le 06/11. TDEE de départ : 2050 kcal en attendant.');
  });

  it('la bande d’état publie la calibration au lieu de se masquer', () => {
    setToday('2026-10-30');
    const signals = extractSignals(state(series('2026-10-24', '2026-10-30')));
    const diagnosis = diagnose({ signals, weeklyHistory: [] });
    const v = summarizeStatus({ diagnosis, neat: null, sleep: null, signals });
    expect(v.kind).toBe(STATUS_KIND.CALIBRATING);
    expect(v.headline).toBe('Calibration en cours');
  });

  it('l’en-tête du rapport dit la calibration et le TDEE de départ', () => {
    setToday('2026-10-24');
    const report = getHistoricalWeeks(state(series('2026-10-24', '2026-10-24')), 1);
    expect(report).toContain('⚡ TDEE adaptatif : calibration en cours (1/14 j croisés depuis le 2026-10-24) — TDEE de départ 2050 kcal');
  });

  it('les semaines antérieures au début de calibration ne sont jamais jugées', () => {
    const week = (weekStart) => ({ weekStart, recordedDays: 7, avgIntake: 2050, avgWeight: 77, elapsedDays: 7, excludedDays: 0 });
    const signals = {
      hasEnoughData: true, adaptiveTDEE: 2050, confidence: 100, overlapDays: 14,
      calibration: { ...CALIB, crossedDays: 20, active: false },
    };
    const d = diagnose({
      signals,
      weeklyHistory: [week('2026-10-12'), week('2026-10-19'), week('2026-10-26'), week('2026-11-02')],
    });
    expect(d.weeksEvaluated).toBe(2); // 26/10 et 02/11 seulement
    expect(d.status).toBe(DIAGNOSIS.INSUFFICIENT_DATA);
  });
});

describe('TDEE de départ 2050 — cible unique de la phase', () => {
  it('Maintenance pendant l’arrêt médical : 2050 kcal, 130 g de protéines', () => {
    expect(computeSingleTarget('maintenance', 2050)).toMatchObject({ kcal: 2050, protein: 130 });
  });
});
