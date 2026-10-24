import { describe, it, expect } from 'vitest';
import { formatSleep } from '../exportUtils.js';
import { aggregateSleep } from '../mathUtils.js';
import { emptyDay } from '../../models/day.js';

describe('formatSleep — export', () => {
  it('formate un relevé complet', () => {
    // Écran Garmin : score 85, 6h 55m, VFC 46 ms, FC repos 52 bpm
    expect(formatSleep({ score: '85', durationMin: '415', hrv: '46', rhr: '52' }))
      .toBe('score 85 · 6h55 · VFC 46 ms · FC repos 52 bpm');
  });

  it('reste complet sans VFC ni FC — le score et la durée suffisent', () => {
    // Toutes les métriques vivent sur le même écran Garmin, mais aucune n'est
    // obligatoire : un champ vide ne doit apparaître ni dans l'export ni dans
    // les moyennes hebdo.
    expect(formatSleep({ score: '85', durationMin: '415', hrv: '', rhr: '' }))
      .toBe('score 85 · 6h55');
  });

  it('pade les minutes sous 10', () => {
    expect(formatSleep({ durationMin: '365' })).toBe('6h05');
  });

  it('n’affiche que ce qui est renseigné', () => {
    expect(formatSleep({ score: '70' })).toBe('score 70');
    expect(formatSleep({ durationMin: '480' })).toBe('8h00');
  });

  it('retourne une chaîne vide sans données', () => {
    expect(formatSleep({ score: '', durationMin: '', hrv: '' })).toBe('');
    expect(formatSleep(undefined)).toBe('');
    expect(formatSleep(null)).toBe('');
  });

  it('ignore une durée non numérique ou nulle', () => {
    expect(formatSleep({ durationMin: 'abc' })).toBe('');
    expect(formatSleep({ durationMin: '0' })).toBe('');
  });
});

describe('rétrocompatibilité des jours existants', () => {
  it('emptyDay fournit le champ sleep', () => {
    expect(emptyDay().sleep).toEqual({ score: '', durationMin: '', hrv: '', rhr: '' });
  });

  it('un jour antérieur au champ récupère la valeur par défaut', () => {
    // Reproduit la fusion d'updateDay : emptyDay() en base, jour stocké par-dessus.
    const ancien = {
      typeOverride: null,
      intake: { kcal: '2401', protein: '160', carbs: '283', fat: '70' },
      expenditure: { kcal: '2308', steps: '8000' },
      workout: 'haut', waist: '88', weight: '77', notes: 'Nuit de 7h00 score 71',
    };
    const fusionne = { ...emptyDay(), ...ancien };
    expect(fusionne.sleep).toEqual({ score: '', durationMin: '', hrv: '', rhr: '' });
    expect(fusionne.weight).toBe('77');   // les données d'origine survivent
    expect(fusionne.notes).toBe('Nuit de 7h00 score 71');
  });

  it('un patch de sommeil ne détruit pas le reste du jour', () => {
    const jour = { ...emptyDay(), weight: '77', notes: 'test' };
    const patch = { sleep: { ...jour.sleep, score: '85' } };
    const apres = { ...emptyDay(), ...jour, ...patch };
    expect(apres.sleep.score).toBe('85');
    expect(apres.weight).toBe('77');
    expect(apres.notes).toBe('test');
  });
});

describe('aggregateSleep — moyennes hebdo', () => {
  const nuit = (score, durationMin, hrv, rhr = '') =>
    ({ day: { sleep: { score, durationMin, hrv, rhr } } });

  it('moyenne uniquement les nuits renseignées', () => {
    const s = aggregateSleep([
      nuit('85', '415', '42', '52'),
      nuit('75', '365', '38', '56'),
      { day: null },
      { day: { sleep: { score: '', durationMin: '', hrv: '', rhr: '' } } },
    ]);
    expect(s.score).toBe(80);
    expect(s.durationMin).toBe(390);
    expect(s.hrv).toBe(40);
    expect(s.rhr).toBe(54);
    expect(s.nights).toBe(2);
  });

  it('gère un champ renseigné et pas l’autre', () => {
    const s = aggregateSleep([nuit('85', '', ''), nuit('', '400', '')]);
    expect(s.score).toBe(85);
    expect(s.durationMin).toBe(400);
    expect(s.hrv).toBeNull();
    expect(s.rhr).toBeNull();
    expect(s.nights).toBe(1);
  });

  it('retourne des nulls sans aucune nuit', () => {
    const s = aggregateSleep([{ day: null }, { day: {} }]);
    expect(s).toEqual({ score: null, durationMin: null, hrv: null, hrvSdnn: null, rhr: null, nights: 0 });
  });

  it('survit aux jours antérieurs au champ sleep', () => {
    const s = aggregateSleep([{ day: { weight: '77', intake: { kcal: '2000' } } }]);
    expect(s.nights).toBe(0);
  });
});

describe('FC au repos — croisement avec la VFC', () => {
  it('est exportée quand elle est renseignée', () => {
    expect(formatSleep({ rhr: '52' })).toBe('FC repos 52 bpm');
  });

  it('reste optionnelle comme les autres', () => {
    expect(formatSleep({ score: '85', rhr: '' })).toBe('score 85');
  });
});

describe('conversion durée ↔ heures/minutes', () => {
  const toHM = (min) => {
    const t = parseInt(min, 10);
    return isNaN(t) ? { h: '', m: '' } : { h: Math.floor(t / 60), m: t % 60 };
  };
  const toMin = (h, m) => {
    const v = (parseInt(h, 10) || 0) * 60 + (parseInt(m, 10) || 0);
    return v > 0 ? String(v) : '';
  };

  it('fait l’aller-retour sans perte', () => {
    for (const min of ['415', '365', '480', '61', '1']) {
      const { h, m } = toHM(min);
      expect(toMin(h, m), min).toBe(min);
    }
  });

  it('gère la saisie partielle', () => {
    expect(toMin('6', '')).toBe('360');
    expect(toMin('', '55')).toBe('55');
    expect(toMin('', '')).toBe('');
  });
});
