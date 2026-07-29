import { describe, it, expect } from 'vitest';
import { calculateWeeklyBalance } from '../mathUtils.js';
import { dayType } from '../../models/day.js';
import { startOfWeek, addDays } from '../dateUtils.js';
import { DEFAULT_TARGETS } from '../presetUtils.js';

// Semaine de référence : lundi 2026-07-27 → dimanche 2026-08-02
const MONDAY = startOfWeek('2026-07-29');
const week = (byIndex) =>
  Array.from({ length: 7 }, (_, i) => ({ key: addDays(MONDAY, i), day: byIndex(i) ?? null }));

const meal = (kcal, protein = 160) => ({
  intake: { kcal: String(kcal), protein: String(protein), carbs: '', fat: '' },
  expenditure: { kcal: '', steps: '' },
});

describe('dayType — priorité séance > calendrier', () => {
  it('retombe sur le calendrier Upper/Lower/Upper sans donnée', () => {
    expect(dayType(MONDAY, null)).toBe('train');            // lundi
    expect(dayType(addDays(MONDAY, 1), null)).toBe('off');  // mardi
    expect(dayType(addDays(MONDAY, 5), null)).toBe('we');   // samedi
  });

  it('fait primer la séance loggée sur le calendrier', () => {
    // Séance déplacée du lundi au mardi : la cible TRAIN doit suivre l'effort.
    expect(dayType(addDays(MONDAY, 1), { workout: 'bas' })).toBe('train');
    expect(dayType(MONDAY, { workout: 'none' })).toBe('off');
  });

  it('donne un type au week-end dès qu’une séance y est loggée', () => {
    expect(dayType(addDays(MONDAY, 5), { workout: 'haut' })).toBe('train');
  });

  it('fait primer le typeOverride manuel sur tout le reste', () => {
    expect(dayType(MONDAY, { typeOverride: 'we', workout: 'haut' })).toBe('we');
  });
});

describe('calculateWeeklyBalance — comparaison apport vs cible', () => {
  it('moyenne apport et cible sur exactement le même nombre de jours', () => {
    // 5 jours de semaine + 2 jours de week-end saisis. Les cibles WE sont nulles :
    // l'apport du week-end ne doit pas être comparé à une cible qui l'exclut.
    const w = calculateWeeklyBalance(week(() => meal(2000)), DEFAULT_TARGETS);
    expect(w.recordedDays).toBe(7);
    expect(w.comparableDays).toBe(5);
    expect(w.avgKcalTarget).not.toBeNull();
    expect(w.avgIntakeComparable).toBe(2000);
  });

  it('ne gonfle plus l’apport moyen comparé avec les jours sans cible', () => {
    // Adhérent en semaine (2000), excès le week-end (3500).
    const w = calculateWeeklyBalance(
      week((i) => (i >= 5 ? meal(3500) : meal(2000))),
      DEFAULT_TARGETS
    );
    expect(w.avgIntakeComparable).toBe(2000);   // semaine seule
    expect(w.avgIntake).toBeGreaterThan(2000);  // moyenne brute, week-end inclus
    expect(w.avgIntakeComparable).toBeLessThanOrEqual(w.avgKcalTarget);
  });

  it('retourne null plutôt qu’une cible inventée sans jour comparable', () => {
    const w = calculateWeeklyBalance(week(() => null), DEFAULT_TARGETS);
    expect(w.comparableDays).toBe(0);
    expect(w.avgKcalTarget).toBeNull();
    expect(w.avgIntakeComparable).toBeNull();
  });

  it('suit la séance loggée pour choisir la cible du jour', () => {
    // Mardi (calendrier OFF) avec une séance → doit être comparé à la cible TRAIN.
    const w = calculateWeeklyBalance(
      [{ key: addDays(MONDAY, 1), day: { ...meal(2200), workout: 'bas' } }],
      DEFAULT_TARGETS
    );
    expect(w.avgKcalTarget).toBe(DEFAULT_TARGETS.train.kcal);
    expect(w.trainDone).toBe(1);
  });

  it('ne compte pas un repos déclaré comme une séance', () => {
    const w = calculateWeeklyBalance(
      [{ key: MONDAY, day: { ...meal(1800), workout: 'none' } }],
      DEFAULT_TARGETS
    );
    expect(w.trainDone).toBe(0);
    expect(w.avgKcalTarget).toBe(DEFAULT_TARGETS.off.kcal);
  });
});
