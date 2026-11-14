import { describe, it, expect } from 'vitest';
import { parseHealthImport, parseHealthNumber } from '../healthImport.js';
import { mergeDays } from '../backupUtils.js';

const TODAY = '2026-11-14';

describe('parseHealthNumber', () => {
  it('nombres, virgule décimale, espaces et unités de Raccourcis', () => {
    expect(parseHealthNumber(2159.3)).toBe(2159.3);
    expect(parseHealthNumber('2 159,3 kcal')).toBe(2159.3);
    expect(parseHealthNumber('8 553')).toBe(8553);
    expect(parseHealthNumber('78,5 kg')).toBe(78.5);
    expect(parseHealthNumber('')).toBeNull();
    expect(parseHealthNumber(null)).toBeNull();
    expect(parseHealthNumber('abc')).toBeNull();
  });
});

describe('parseHealthImport', () => {
  const clip = JSON.stringify({
    date: '2026-11-13', kcal: '1 540,4', protein: '64.2', carbs: 145, fat: '75',
    steps: '9100', weight: '78,04', sleepMin: '464', rhr: '63', hrvSdnn: '48', hrv: '',
  });

  it('dictionnaire plat → jour partiel au format de l’app', () => {
    const { key, day, fields } = parseHealthImport(clip, TODAY);
    expect(key).toBe('2026-11-13');
    expect(day).toEqual({
      intake: { kcal: '1540', protein: '64', carbs: '145', fat: '75' },
      expenditure: { steps: '9100' },
      weight: '78',
      sleep: { durationMin: '464', rhr: '63', hrvSdnn: '48' },
    });
    expect(fields).not.toContain('hrv');
  });

  it('sans date valide : aujourd’hui', () => {
    expect(parseHealthImport('{"steps": 5000}', TODAY).key).toBe(TODAY);
    expect(parseHealthImport('{"date": "13/11/2026", "steps": 5000}', TODAY).key).toBe(TODAY);
  });

  it('valeurs hors bornes ignorées (0 kcal, poids absurde)', () => {
    const { day, fields } = parseHealthImport('{"kcal": 0, "weight": 780, "steps": 4000}', TODAY);
    expect(fields).toEqual(['steps']);
    expect(day.intake).toBeUndefined();
    expect(day.weight).toBeUndefined();
  });

  it('erreurs lisibles', () => {
    expect(() => parseHealthImport('bonjour', TODAY)).toThrow(/presse-papier/);
    expect(() => parseHealthImport('[1,2]', TODAY)).toThrow(/format/);
    expect(() => parseHealthImport('{"kcal": ""}', TODAY)).toThrow(/aucune valeur/);
  });

  it('fusion : ne remplit que les champs vides, jamais une saisie manuelle', () => {
    const prev = { '2026-11-13': { intake: { kcal: '1600', protein: '', carbs: '', fat: '' }, weight: '', expenditure: { steps: '' } } };
    const { key, day } = parseHealthImport(clip, TODAY);
    const { days } = mergeDays(prev, { [key]: day });
    expect(days['2026-11-13'].intake.kcal).toBe('1600');
    expect(days['2026-11-13'].intake.protein).toBe('64');
    expect(days['2026-11-13'].weight).toBe('78');
    expect(days['2026-11-13'].expenditure.steps).toBe('9100');
  });
});
