import { describe, it, expect } from 'vitest';
import { weeklyCheckIn } from '../weeklyCheckIn.js';

/** n°3 — bilan du dimanche, lecture seule : des lignes, puis UNE action. */

const week = { weekStart: '2026-11-02', weight: 76.8, gapPerDay: 40, comparableDays: 7 };
const prevWeek = { weekStart: '2026-10-26', weight: 77.2 };
const okProtein = { days: 7, underDays: 0, floor: 160 };
const okSteps = { avg: 8600, days: 7 };

describe('weeklyCheckIn', () => {
  it('lignes : poids et variation, écart, protéines, pas, TDEE', () => {
    const r = weeklyCheckIn({ week, prevWeek, protein: okProtein, steps: okSteps,
      tdee: { adaptiveTDEE: 2290, delta: 240, canRecalibrate: false } });
    expect(r.title).toBe('Semaine du 02/11');
    expect(r.lines.map((l) => l.label)).toEqual(['Poids', 'Écart à la cible', 'Protéines', 'Pas montre', 'TDEE mesuré']);
    expect(r.lines[0].note).toBe('−0,4 kg vs sem. préc.');
    expect(r.lines[2].value).toBe('7/7 j');
  });

  it('priorité 1 : calibration avec jours à rattraper', () => {
    const calibration = { active: true, crossedDays: 9, requiredDays: 14, earliestCompletion: '2026-11-07',
      incompleteDays: [{ key: '2026-10-28', status: 'no_weight' }] };
    const r = weeklyCheckIn({ week, protein: { days: 7, underDays: 4, floor: 160 }, calibration });
    expect(r.action.kind).toBe('calibration');
    expect(r.action.text).toContain('28/10 (pesée)');
    expect(r.lines.at(-1)).toEqual({ label: 'Calibration', value: '9/14 j', note: 'au plus tôt le 07/11' });
  });

  it('priorité 2 : recalibration proposée, jamais appliquée — renvoie vers Cibles', () => {
    const r = weeklyCheckIn({ week, protein: { days: 7, underDays: 4, floor: 160 },
      tdee: { adaptiveTDEE: 2290, delta: 240, canRecalibrate: true } });
    expect(r.action).toMatchObject({ kind: 'recalibrate', tab: 'targets' });
    expect(r.action.text).toMatch(/2\s290 kcal \(\+240\)/);
  });

  it('puis protéines, écart, pas, et sinon rien', () => {
    expect(weeklyCheckIn({ week, protein: { days: 7, underDays: 2, floor: 160 } }).action.kind).toBe('protein');
    expect(weeklyCheckIn({ week: { ...week, gapPerDay: 180 }, protein: okProtein }).action.text)
      .toContain('+180 kcal/j au-dessus');
    expect(weeklyCheckIn({ week, protein: okProtein, steps: { avg: 7200, days: 6 } }).action.kind).toBe('steps');
    expect(weeklyCheckIn({ week, protein: okProtein, steps: okSteps }).action.kind).toBe('none');
  });

  it('semaine vide : aucune ligne inventée', () => {
    const r = weeklyCheckIn({ week: { weekStart: '2026-11-02', weight: null, gapPerDay: null, comparableDays: 0 } });
    expect(r.lines).toEqual([]);
    expect(r.action.kind).toBe('none');
  });

  it('semaine en cours signalée dans le titre', () => {
    expect(weeklyCheckIn({ week, inProgress: true }).title).toBe('Semaine du 02/11 · en cours');
  });

  it('calibration à 0/14 sans jour en retard : la consigne du jour, pas « rien à corriger »', () => {
    const calibration = { active: true, crossedDays: 0, requiredDays: 14, earliestCompletion: '2026-11-06', incompleteDays: [] };
    const r = weeklyCheckIn({ week, protein: okProtein, steps: okSteps, calibration });
    expect(r.action.kind).toBe('calibration');
    expect(r.action.text).toBe('Calibration 0/14 : pesée et apport chaque jour, 14/14 au plus tôt le 06/11.');
  });

  it('tour de taille manquant : juste après la calibration, avant la recalibration', () => {
    const tdee = { adaptiveTDEE: 2290, delta: 240, canRecalibrate: true };
    const r = weeklyCheckIn({ week, waistMissing: true, protein: { days: 7, underDays: 4, floor: 160 }, tdee });
    expect(r.action).toEqual({ kind: 'waist', text: 'Mesure ton tour de taille à jeun : aucune mesure cette semaine.' });
    const calibration = { active: true, crossedDays: 3, requiredDays: 14, earliestCompletion: '2026-11-06', incompleteDays: [] };
    expect(weeklyCheckIn({ week, waistMissing: true, calibration }).action.kind).toBe('calibration');
    expect(weeklyCheckIn({ week, waistMissing: false, tdee }).action.kind).toBe('recalibrate');
  });

  it('accord : 1 j comparable, 7 j comparables', () => {
    expect(weeklyCheckIn({ week: { ...week, comparableDays: 1 } }).lines[1].note).toBe('1 j comparable');
    expect(weeklyCheckIn({ week }).lines[1].note).toBe('7 j comparables');
  });
});
