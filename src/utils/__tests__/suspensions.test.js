import { describe, it, expect } from 'vitest';
import { diagnose, DIAGNOSIS } from '../plateauProtocol.js';
import { summarizeStatus, STATUS_KIND } from '../vibeStatus.js';
import { phaseReminderCopy, weeklyReminderCopy } from '../reminderUtils.js';

/** Étape 5 — suspension du plateau et rappel hebdo pendant l'arrêt médical. */

const signals = { hasEnoughData: true, adaptiveTDEE: 2050, confidence: 100, overlapDays: 14 };
const week = (over = {}) => ({
  weekStart: 'S', recordedDays: 7, avgIntake: 2050, avgWeight: 77, avgWaist: null,
  elapsedDays: 7, excludedDays: 0, ...over,
});
// Poids et TDEE parfaitement stables sur 4 semaines : hors phase, c'est un plateau confirmé.
const flat = [week(), week({ avgWeight: 77.02 }), week({ avgWeight: 77.01 }), week({ avgWeight: 77.0 })];

describe('plateau — suspendu pendant la phase', () => {
  it('hors phase : plateau confirmé (référence)', () => {
    expect(diagnose({ signals, weeklyHistory: flat }).status).toBe(DIAGNOSIS.PLATEAU_CONFIRMED);
  });

  it('pendant la phase : jamais de plateau, statut suspendu', () => {
    const d = diagnose({ signals, weeklyHistory: flat, trainingSuspended: true });
    expect(d.status).toBe(DIAGNOSIS.PLATEAU_SUSPENDED);
    expect(d.label).toBe('Plateau non évalué');
  });

  it('pendant la phase : jamais de « progression » non plus', () => {
    const moving = [week(), week({ avgWeight: 77.5 }), week({ avgWeight: 78 }), week({ avgWeight: 78.6 })];
    expect(diagnose({ signals, weeklyHistory: moving }).status).toBe(DIAGNOSIS.PROGRESSING);
    expect(diagnose({ signals, weeklyHistory: moving, trainingSuspended: true }).status)
      .toBe(DIAGNOSIS.PLATEAU_SUSPENDED);
  });

  it('la porte d’adhérence reste active : un défaut de suivi reste signalé', () => {
    const weak = [week(), week(), week({ recordedDays: 3 }), week()];
    expect(diagnose({ signals, weeklyHistory: weak, trainingSuspended: true }).status)
      .toBe(DIAGNOSIS.LOW_ADHERENCE);
  });

  it('la rétention d’eau reste détectée (elle bloque une coupe, pas un entraînement)', () => {
    const water = [
      week({ avgWaist: 88 }), week({ avgWeight: 77.5, avgWaist: 88.2 }),
      week({ avgWeight: 78, avgWaist: 88.1 }), week({ avgWeight: 78.4, avgWaist: 88.3 }),
    ];
    expect(diagnose({ signals, weeklyHistory: water, trainingSuspended: true }).status)
      .toBe(DIAGNOSIS.WATER_RETENTION_SUSPECTED);
  });

  it('la calibration passe avant la suspension', () => {
    const d = diagnose({
      signals: { ...signals, calibration: { start: '2026-10-24', seedTDEE: 2050, requiredDays: 14, crossedDays: 5, active: true } },
      weeklyHistory: flat,
      trainingSuspended: true,
    });
    expect(d.status).toBe(DIAGNOSIS.CALIBRATING);
  });

  it('bande d’état : ligne neutre, jamais d’alerte', () => {
    const diagnosis = diagnose({ signals, weeklyHistory: flat, trainingSuspended: true });
    const v = summarizeStatus({ diagnosis, neat: null, sleep: null, signals });
    expect(v.kind).toBe(STATUS_KIND.PLATEAU_SUSPENDED);
    expect(v.tone).toBe('idle');
  });
});

describe('rappel hebdo — pendant la phase', () => {
  const base = { label: 'Arrêt médical', singleKcal: 2050 };

  it('ne parle ni de montre, ni de solde, ni de jours TRAIN', () => {
    const { lead, week: w, hint } = phaseReminderCopy({ ...base, avgIntake: 2080, comparableDays: 5 });
    const text = lead + w + hint;
    expect(text).not.toMatch(/Garmin|montre|solde|TRAIN|recharger/);
    expect(lead).toBe('Arrêt médical : cible unique de 2050 kcal tous les jours, week-end compris — ni cyclage ni recharge.');
  });

  it('compare l’apport moyen à la cible unique', () => {
    expect(phaseReminderCopy({ ...base, avgIntake: 2080, comparableDays: 5 }))
      .toMatchObject({ week: ' Cette semaine : 2080 kcal/j en moyenne sur 5 jours saisis (+30 kcal).', hint: ' Dans la cible.' });
    expect(phaseReminderCopy({ ...base, avgIntake: 2300, comparableDays: 3 }).hint).toBe(' Au-dessus de la cible.');
    expect(phaseReminderCopy({ ...base, avgIntake: 1800, comparableDays: 1 }))
      .toMatchObject({ week: ' Cette semaine : 1800 kcal/j en moyenne sur 1 jour saisi (−250 kcal).', hint: ' Sous la cible — le plancher reste 1600 kcal par jour.' });
  });

  it('semaine vide : le dit, sans chiffre inventé', () => {
    expect(phaseReminderCopy({ ...base, avgIntake: null, comparableDays: 0 }))
      .toEqual({
        lead: 'Arrêt médical : cible unique de 2050 kcal tous les jours, week-end compris — ni cyclage ni recharge.',
        week: ' Aucun jour saisi cette semaine pour l’instant.',
        hint: '',
      });
  });

  it('hors phase : rappel par preset, sans Garmin ni calories montre', () => {
    for (const preset of ['maintenance', 'cut_light', 'cut_strong', 'bulk', 'diet_break', 'custom']) {
      for (const gap of [-1400, 0, 1400]) {
        const { goal, hint } = weeklyReminderCopy(preset, gap, 5);
        expect(goal + hint).not.toMatch(/Garmin|montre|solde|totales/i);
      }
    }
    // Dans la cible (±100 kcal/j) : aucune conséquence ajoutée.
    expect(weeklyReminderCopy('cut_light', 300, 5).hint).toBe('');
    // Écart : la conséquence dépend de l'objectif du preset.
    expect(weeklyReminderCopy('cut_light', 1400, 5).hint).toBe(' Au-dessus de la cible, le déficit prévu fond d’autant.');
    expect(weeklyReminderCopy('bulk', -1400, 5).hint).toBe(' Sous la cible, le surplus prévu n’est pas atteint.');
    expect(weeklyReminderCopy('maintenance', 0, 5).goal).toBe('Maintenance : cyclage TRAIN/OFF autour du TDEE — tenir la cible de chaque jour.');
    // Semaine vide : pas de conséquence inventée.
    expect(weeklyReminderCopy('bulk', 0, 0).hint).toBe('');
  });
});
