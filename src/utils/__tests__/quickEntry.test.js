import { describe, it, expect } from 'vitest';
import { quickMetric, lastKnown, metricRange, snap, initialDraft, ringProgress, formatSleep, recentSeries } from '../quickEntry.js';
import { emptyDay } from '../../models/day.js';

describe('quickMetric — lecture et patch', () => {
  it('écrit en chaîne, comme NumberInput, sans toucher aux champs voisins', () => {
    const day = { ...emptyDay(), intake: { kcal: '', protein: '96', carbs: '160', fat: '52' } };
    expect(quickMetric('kcal').patch(day, 1420)).toEqual({ intake: { kcal: '1420', protein: '96', carbs: '160', fat: '52' } });
    expect(quickMetric('weight').patch(day, 78.5)).toEqual({ weight: '78.5' });
    expect(quickMetric('steps').patch(day, 8400).expenditure.steps).toBe('8400');
  });
  it('sommeil : garde score/VFC, une durée nulle vide le champ', () => {
    const day = { ...emptyDay(), sleep: { score: '80', durationMin: '', hrv: '', rhr: '58' } };
    expect(quickMetric('sleep').patch(day, 435).sleep).toEqual({ score: '80', durationMin: '435', hrv: '', rhr: '58' });
    expect(quickMetric('sleep').patch(day, 0).sleep.durationMin).toBe('');
  });
  it('id inconnu : repli sur l’apport', () => {
    expect(quickMetric('nope').id).toBe('kcal');
  });
  it('formats français', () => {
    expect(quickMetric('kcal').format(1420)).toBe('1 420');
    expect(quickMetric('weight').format(78)).toBe('78,0');
    expect(formatSleep(432)).toBe('7 h 12');
  });
});

describe('lastKnown', () => {
  const days = { '2026-11-12': { weight: '78.5' }, '2026-11-13': { weight: '' }, '2026-11-15': { weight: '77' } };
  it('dernière valeur > 0 strictement avant la date', () => {
    expect(lastKnown(days, '2026-11-15', quickMetric('weight').read)).toBe(78.5);
    expect(lastKnown(days, '2026-11-12', quickMetric('weight').read)).toBeNull();
    expect(lastKnown(undefined, '2026-11-15', quickMetric('weight').read)).toBeNull();
  });
});

describe('metricRange / snap', () => {
  it('poids : fenêtre de ±8 kg au pas de la balance', () => {
    expect(metricRange(quickMetric('weight'), { anchor: 78, scaleResolutionKg: 0.5 })).toEqual({ min: 70, max: 86, step: 0.5 });
    expect(metricRange(quickMetric('weight'), { anchor: 78, scaleResolutionKg: 0.1 }).step).toBe(0.1);
    expect(metricRange(quickMetric('weight'), {}).min).toBe(67);
  });
  it('autres mesures : bornes fixes', () => {
    expect(metricRange(quickMetric('steps'))).toEqual({ min: 0, max: 30000, step: 100 });
  });
  it('snap borne et arrondit au cran, sans dérive flottante', () => {
    const r = { min: 70, max: 86, step: 0.1 };
    expect(snap(78.04, r)).toBe(78);
    expect(snap(78.06, r)).toBe(78.1);
    expect(snap(99, r)).toBe(86);
    expect(snap(-5, { min: 0, max: 4000, step: 10 })).toBe(0);
  });
});

describe('initialDraft', () => {
  const range = { min: 0, max: 4000, step: 10 };
  it('la saisie du jour prime', () => {
    expect(initialDraft(quickMetric('kcal'), { day: { intake: { kcal: '1423' } }, target: 1650, range })).toBe(1420);
  });
  it('apport vide : part de la cible ; sans cible : du minimum', () => {
    expect(initialDraft(quickMetric('kcal'), { day: emptyDay(), target: 1650, range })).toBe(1650);
    expect(initialDraft(quickMetric('kcal'), { day: emptyDay(), target: null, range })).toBe(0);
  });
  it('poids vide : part de la dernière pesée, jamais de la cible', () => {
    const wr = { min: 70, max: 86, step: 0.5 };
    expect(initialDraft(quickMetric('weight'), { day: emptyDay(), previous: 78.5, target: 999, range: wr })).toBe(78.5);
  });
  it('sommeil vide sans historique : 7 h', () => {
    expect(initialDraft(quickMetric('sleep'), { day: emptyDay(), previous: null, range: { min: 0, max: 720, step: 5 } })).toBe(420);
  });
});

describe('ringProgress', () => {
  it('borné à [0, 1], null sans cible', () => {
    expect(ringProgress(825, 1650)).toBe(0.5);
    expect(ringProgress(3000, 1650)).toBe(1);
    expect(ringProgress('', 1650)).toBe(0);
    expect(ringProgress(1000, null)).toBeNull();
  });
});

describe('recentSeries', () => {
  it('n derniers jours jusqu’à la date incluse, jours sans pesée retirés', () => {
    const days = { '2026-11-10': { weight: '79' }, '2026-11-11': { weight: '' }, '2026-11-12': { weight: '78.5' }, '2026-11-20': { weight: '70' } };
    expect(recentSeries(days, '2026-11-12', (d) => parseFloat(d.weight) || 0)).toEqual([{ x: 0, y: 79 }, { x: 2, y: 78.5 }]);
  });
});
