import { describe, it, expect } from 'vitest';
import { mergeDays } from '../backupUtils.js';
import { emptyDay } from '../../models/day.js';

const dayWith = (fields) => ({ ...emptyDay(), ...fields });

describe('mergeDays — fusion non destructive', () => {
  it('n’écrase JAMAIS une valeur déjà saisie', () => {
    // Le cas qui motive tout le module : un fichier de synchronisation
    // n'apporte que dépense/pas/sommeil, avec un `intake` vide. Une fusion au
    // niveau du jour effacerait les macros saisies à la main.
    const prev = {
      '2026-08-01': dayWith({
        intake: { kcal: '2050', protein: '175', carbs: '190', fat: '70' },
        weight: '77.4',
      }),
    };
    const incoming = {
      '2026-08-01': dayWith({
        expenditure: { kcal: '2380', steps: '9120' },
        weight: '77.9',
      }),
    };

    const { days, enriched, fieldsFilled } = mergeDays(prev, incoming);

    expect(days['2026-08-01'].intake).toEqual({
      kcal: '2050', protein: '175', carbs: '190', fat: '70',
    });
    // Le poids saisi gagne sur le poids importé — en cas de désaccord, c'est
    // toujours la saisie manuelle qui l'emporte.
    expect(days['2026-08-01'].weight).toBe('77.4');
    expect(days['2026-08-01'].expenditure).toEqual({ kcal: '2380', steps: '9120' });
    expect(enriched).toBe(1);
    expect(fieldsFilled).toBe(2);
  });

  it('complète champ à champ à l’intérieur d’un groupe imbriqué', () => {
    const prev = {
      '2026-08-02': dayWith({ sleep: { score: '85', durationMin: '', hrv: '', rhr: '' } }),
    };
    const incoming = {
      '2026-08-02': { sleep: { score: '70', durationMin: '405', hrv: '48', rhr: '' } },
    };

    const { days, fieldsFilled } = mergeDays(prev, incoming);

    expect(days['2026-08-02'].sleep).toEqual({
      score: '85', durationMin: '405', hrv: '48', rhr: '',
    });
    expect(fieldsFilled).toBe(2);
  });

  it('crée un jour absent sur la forme d’emptyDay, jamais l’objet partiel', () => {
    const { days, added } = mergeDays({}, { '2026-08-03': { expenditure: { steps: '11000' } } });

    // Les vues déstructurent `day.intake.kcal` et `day.sleep` : un objet
    // partiel les ferait planter.
    expect(added).toBe(1);
    expect(days['2026-08-03']).toEqual(
      dayWith({ expenditure: { kcal: '', steps: '11000' } })
    );
  });

  it('ne touche pas aux jours absents du fichier importé', () => {
    const prev = { '2026-07-30': dayWith({ weight: '78.1' }) };
    const { days, added, enriched } = mergeDays(prev, { '2026-08-04': { weight: '77.2' } });

    expect(days['2026-07-30'].weight).toBe('78.1');
    expect(added).toBe(1);
    expect(enriched).toBe(0);
  });

  it('ne compte pas comme complété un jour dont rien n’était vide', () => {
    const prev = { '2026-08-05': dayWith({ weight: '77.0' }) };
    const { days, enriched, fieldsFilled } = mergeDays(prev, { '2026-08-05': { weight: '80.0' } });

    expect(days['2026-08-05'].weight).toBe('77.0');
    expect(enriched).toBe(0);
    expect(fieldsFilled).toBe(0);
  });

  it('ignore une entrée qui n’est pas un objet plutôt que de corrompre le state', () => {
    const { days, added } = mergeDays({}, { '2026-08-06': 'chantier', '2026-08-07': null });
    expect(days).toEqual({});
    expect(added).toBe(0);
  });

  it('ne mute pas les jours d’origine', () => {
    const original = dayWith({ intake: { kcal: '2000', protein: '', carbs: '', fat: '' } });
    const prev = { '2026-08-08': original };
    mergeDays(prev, { '2026-08-08': { intake: { protein: '160' } } });

    expect(original.intake.protein).toBe('');
    expect(prev['2026-08-08']).toBe(original);
  });
});
