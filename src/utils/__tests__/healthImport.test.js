import { describe, it, expect } from 'vitest';
import { parseHealthImport, parseHealthNumber, applyHealthImport, sleepMinutesFromStages } from '../healthImport.js';
import { emptyDay } from '../../models/day.js';
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

  it('une valeur par source (iPhone + montre) : la plus grande, pas la somme', () => {
    expect(parseHealthNumber('1113\n0')).toBe(1113);
    expect(parseHealthNumber('4 200\n8 553')).toBe(8553);
  });
});

describe('presse-papier réel du raccourci (15/11, 01:53)', () => {
  const real = '{"weight":"","rhr":"67","protein":"","carbs":"","fat":"","date":"2026-11-15","kcal":"","steps":"1113\\n0","hrvSdnn":""}';

  it('importe FC repos et pas, ignore les champs vides', () => {
    const { key, day, fields } = parseHealthImport(real, TODAY);
    expect(key).toBe('2026-11-15');
    expect(day).toEqual({ expenditure: { steps: '1113' }, sleep: { rhr: '67' } });
    expect(fields).toEqual(['steps', 'rhr']);
  });

  it('tolère du texte autour du dictionnaire', () => {
    expect(parseHealthImport(`Dictionnaire\n${real}\n`, TODAY).fields).toEqual(['steps', 'rhr']);
  });

  it('presse-papier vide : message explicite', () => {
    expect(() => parseHealthImport('  ', TODAY)).toThrow(/vide/);
    expect(() => parseHealthImport('bonjour', TODAY)).toThrow(/reçu : « bonjour »/);
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

describe('applyHealthImport — l’import met à jour ses propres valeurs, jamais une saisie manuelle', () => {
  const at16h = parseHealthImport('{"date":"2026-11-15","kcal":"767.2\\n0","protein":"76.2","steps":"4598","rhr":"54"}', TODAY).day;
  const at23h = parseHealthImport('{"date":"2026-11-15","kcal":"1650.4","protein":"131","steps":"9120","rhr":"54","weight":"77.49988"}', TODAY).day;

  it('jour vide : tout est écrit et mémorisé', () => {
    const { day, written, kept } = applyHealthImport(undefined, at16h, emptyDay());
    expect(day.intake.kcal).toBe('767');
    expect(day.imported['intake.kcal']).toBe('767');
    expect(written).toEqual(['kcal', 'protein', 'steps', 'rhr']);
    expect(kept).toEqual([]);
    expect(day.notes).toBe('');
  });

  it('import de 16 h puis de 23 h 55 : la journée est complétée', () => {
    const first = applyHealthImport(undefined, at16h, emptyDay()).day;
    const { day, written } = applyHealthImport(first, at23h, emptyDay());
    expect(day.intake).toMatchObject({ kcal: '1650', protein: '131' });
    expect(day.expenditure.steps).toBe('9120');
    expect(day.weight).toBe('77.5');
    expect(written).toEqual(['kcal', 'protein', 'steps', 'weight']);
  });

  it('valeur corrigée à la main : conservée, signalée', () => {
    const first = applyHealthImport(undefined, at16h, emptyDay()).day;
    const edited = { ...first, intake: { ...first.intake, kcal: '1700' } };
    const { day, kept } = applyHealthImport(edited, at23h, emptyDay());
    expect(day.intake.kcal).toBe('1700');
    expect(day.intake.protein).toBe('131');
    expect(kept).toEqual(['kcal']);
  });

  it('valeur saisie avant toute import (sans trace) : jamais écrasée', () => {
    const manual = { ...emptyDay(), intake: { kcal: '767', protein: '', carbs: '', fat: '' } };
    const { day, kept } = applyHealthImport(manual, at23h, emptyDay());
    expect(day.intake.kcal).toBe('767');
    expect(kept).toContain('kcal');
  });

  it('même import relancé : rien de nouveau', () => {
    const first = applyHealthImport(undefined, at16h, emptyDay()).day;
    expect(applyHealthImport(first, at16h, emptyDay()).written).toEqual([]);
  });
});

describe('durée de sommeil — unité devinée', () => {
  const sleep = (v) => parseHealthImport(JSON.stringify({ sleepMin: v }), TODAY).day.sleep?.durationMin;
  it('secondes, minutes ou heures → minutes', () => {
    expect(sleep('27840')).toBe('464');
    expect(sleep('464')).toBe('464');
    expect(sleep('7,7')).toBe('462');
  });
});

describe('sommeil depuis les phases brutes (nuit réelle du 15/11)', () => {
  const stages = 'Core\nDeep\nAwake\nCore\nREM\nCore\nREM\nCore\nDeep\nAwake\nCore\nAwake\nCore\nDeep\nCore\nREM\nAwake\nCore\nDeep\nCore\nREM\nAwake\nCore\nREM\nCore';
  const durations = '20:27\n43:23\n1:59\n3:59\n1:29\n59\n8:58\n22:56\n22:26\n2:59\n14:57\n9:28\n48:52\n1:29\n5:29\n52:22\n29\n55:51\n1:29\n10:28\n22:56\n59\n51:52\n53:52\n17:27';

  it('écarte les phases Awake : 7 h 42 et pas 7 h 58', () => {
    expect(Math.round(sleepMinutesFromStages(stages, durations))).toBe(462);
  });

  it('prime sur sleepMin (qui inclut l’éveil)', () => {
    const clip = JSON.stringify({ sleepMin: '28670,0565259457', sleepStages: stages, sleepDurations: durations });
    expect(parseHealthImport(clip, TODAY).day.sleep.durationMin).toBe('462');
  });

  it('In Bed écarté, heures acceptées, listes incohérentes ignorées', () => {
    expect(sleepMinutesFromStages('In Bed\nCore', '8:00:00\n1:00:00')).toBe(60);
    expect(sleepMinutesFromStages('Core\nDeep', '10:00')).toBeNull();
    expect(sleepMinutesFromStages('', '')).toBeNull();
  });
});
