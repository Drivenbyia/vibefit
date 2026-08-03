import { describe, it, expect } from 'vitest';
import { extractSignals } from '../adaptiveTDEE.js';
import { getHistoricalWeeks } from '../exportUtils.js';
import { emptyDay, dayType } from '../../models/day.js';
import { toKey, addDays, fmtFr } from '../dateUtils.js';

const today = toKey(new Date());

/** Construit `n` jours consécutifs finissant aujourd'hui. */
const buildDays = (n, decorate) => {
  const days = {};
  for (let i = n - 1; i >= 0; i--) {
    const key = addDays(today, -i);
    days[key] = { ...emptyDay(), ...decorate(key, n - 1 - i) };
  }
  return days;
};

describe('heavyWork — jour de chantier', () => {
  it('est présent et faux par défaut sur un jour neuf', () => {
    expect(emptyDay().heavyWork).toBe(false);
  });

  it('ne change PAS le type du jour, contrairement à une séance', () => {
    const key = '2026-08-08'; // un samedi
    // Une séance loggée bascule le jour en TRAIN ; un chantier ne doit pas —
    // sinon un samedi de travaux servirait la cible haute d'un jour d'effort
    // programmé.
    expect(dayType(key, { ...emptyDay(), heavyWork: true })).toBe('we');
    expect(dayType(key, { ...emptyDay(), workout: 'haut' })).toBe('train');
  });

  it('compte les jours de chantier de la fenêtre TDEE retenue', () => {
    const days = buildDays(14, (key, i) => ({
      weight: String(78 - i * 0.05),
      intake: { kcal: '2000', protein: '', carbs: '', fat: '' },
      heavyWork: i % 7 === 5 || i % 7 === 6, // les deux jours de week-end
    }));

    const signals = extractSignals({ days });

    expect(signals.heavyWorkDays).toBe(4);
    expect(signals.overlapDays).toBe(14);
  });

  it('reste à zéro quand rien n’est marqué', () => {
    const days = buildDays(14, (key, i) => ({
      weight: String(78 - i * 0.05),
      intake: { kcal: '2000', protein: '', carbs: '', fat: '' },
    }));

    expect(extractSignals({ days }).heavyWorkDays).toBe(0);
  });

  it('publie le compte dans l’en-tête du rapport, à côté de la période', () => {
    const days = buildDays(14, (key, i) => ({
      weight: String(78 - i * 0.05),
      intake: { kcal: '2000', protein: '', carbs: '', fat: '' },
      heavyWork: i === 12 || i === 13,
    }));

    const report = getHistoricalWeeks({ days }, 1);
    expect(report).toContain('2 j de chantier');
  });

  it('apparaît dans la ligne du jour concerné', () => {
    // `today`, pas la veille : avec n=1 seule la semaine EN COURS est rendue,
    // et un lundi la veille tombe dans la semaine précédente.
    const key = today;
    const report = getHistoricalWeeks(
      { days: { [key]: { ...emptyDay(), heavyWork: true } } },
      1
    );
    expect(report).toContain('Chantier: oui');
  });

  it('suffit à lui seul à rendre un jour non vide dans le rapport', () => {
    // Un jour de chantier sans pesée ni saisie reste une information : le taire
    // ferait disparaître le contexte qui explique la dépense de la semaine.
    const report = getHistoricalWeeks(
      { days: { [today]: { ...emptyDay(), heavyWork: true } } },
      1
    );

    expect(report).not.toContain('Aucune donnée saisie pour cette semaine');
    // `startsWith('- **')` : le titre de semaine porte la même date quand on
    // est un lundi, et il matcherait en premier.
    const line = report
      .split('\n')
      .find((l) => l.startsWith('- **') && l.includes(fmtFr(today)));
    expect(line).toContain('Chantier: oui');
  });

  it('une semaine où seul le sommeil est renseigné n’est plus annoncée vide', () => {
    // Régression trouvée en écrivant le test du chantier : le test de la
    // semaine et celui du jour avaient divergé, et le sommeil ne comptait que
    // pour le second.
    const report = getHistoricalWeeks(
      { days: { [today]: { ...emptyDay(), sleep: { score: '82', durationMin: '400', hrv: '', rhr: '' } } } },
      1
    );

    expect(report).not.toContain('Aucune donnée saisie pour cette semaine');
    expect(report).toContain('Sommeil: score 82 · 6h40');
  });
});
