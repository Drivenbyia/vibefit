import { describe, it, expect } from 'vitest';
import {
  computePresetTargets,
  clampTargetField,
  macroConflictKcal,
  deriveBaseTDEE,
  DEFAULT_TARGETS,
  DEFAULT_TDEE,
} from '../presetUtils.js';
import { KCAL_FLOOR, PROTEIN_FLOOR, MIN_CYCLE_GAP, PRESETS } from '../../constants/config.js';

const PRESET_IDS = Object.keys(PRESETS);

describe('DEFAULT_TARGETS', () => {
  it('est dérivé de DEFAULT_TDEE, pas codé en dur', () => {
    expect(DEFAULT_TARGETS).toEqual(computePresetTargets('maintenance', DEFAULT_TDEE));
  });

  it('est cohérent avec le TDEE affiché à l’utilisateur', () => {
    // L'ancien littéral train 2400 / off 1900 impliquait deux TDEE différents
    // (2200 et 2100) et contredisait DEFAULT_TDEE = 2000.
    expect(DEFAULT_TARGETS.train.kcal).toBe(DEFAULT_TDEE + 200);
    expect(DEFAULT_TARGETS.off.kcal).toBe(DEFAULT_TDEE - 200);
    expect(deriveBaseTDEE('maintenance', DEFAULT_TARGETS)).toBe(DEFAULT_TDEE);
  });
});

describe('presetKcal — plancher et cyclage', () => {
  it('ne fait jamais s’effondrer le cyclage sur le plancher', () => {
    // Le cas historique : TDEE 1400 donnait TRAIN = OFF = 1600.
    for (let tdee = 1000; tdee <= 3000; tdee += 50) {
      for (const id of PRESET_IDS) {
        const t = computePresetTargets(id, tdee);
        const gap = t.train.kcal - t.off.kcal;
        const expected = id === 'diet_break' ? 0 : MIN_CYCLE_GAP;
        expect(gap, `${id} @ ${tdee}`).toBe(expected);
      }
    }
  });

  it('respecte le plancher calorique sur les jours OFF', () => {
    for (let tdee = 1000; tdee <= 3000; tdee += 50) {
      for (const id of PRESET_IDS) {
        const t = computePresetTargets(id, tdee);
        expect(t.off.kcal, `${id} @ ${tdee}`).toBeGreaterThanOrEqual(KCAL_FLOOR);
        expect(t.train.kcal).toBeGreaterThanOrEqual(KCAL_FLOOR);
      }
    }
  });

  it('conserve un aller-retour stable hors zone de plancher', () => {
    for (const id of PRESET_IDS) {
      const targets = computePresetTargets(id, 2400);
      expect(deriveBaseTDEE(id, targets), id).toBe(2400);
    }
  });

  it('garde les glucides positifs', () => {
    for (let tdee = 1000; tdee <= 3000; tdee += 50) {
      for (const id of PRESET_IDS) {
        expect(computePresetTargets(id, tdee).train.carbs).toBeGreaterThanOrEqual(0);
        expect(computePresetTargets(id, tdee).off.carbs).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe('macroConflictKcal', () => {
  it('retourne 0 quand les macros tiennent dans la cible', () => {
    expect(macroConflictKcal({ kcal: 2000, protein: 160, fat: 70 })).toBe(0);
  });

  it('chiffre le dépassement quand protéines + lipides excèdent la cible', () => {
    // 170×4 + 110×9 = 1670 pour une cible de 1600
    expect(macroConflictKcal({ kcal: 1600, protein: 170, fat: 110 })).toBe(70);
  });

  it('ignore les cibles sans calories (week-end)', () => {
    expect(macroConflictKcal({ kcal: null, protein: 160, fat: 70 })).toBe(0);
    expect(macroConflictKcal(null)).toBe(0);
  });

  it('ne signale aucun conflit sur les presets livrés', () => {
    for (let tdee = 1000; tdee <= 3000; tdee += 50) {
      for (const id of PRESET_IDS) {
        const t = computePresetTargets(id, tdee);
        expect(macroConflictKcal(t.train), `${id} train @ ${tdee}`).toBe(0);
        expect(macroConflictKcal(t.off), `${id} off @ ${tdee}`).toBe(0);
      }
    }
  });
});

describe('clampTargetField — planchers du protocole', () => {
  it('applique le plancher protéines sur TOUS les types de jour', () => {
    for (const dayKey of ['train', 'off', 'we']) {
      expect(clampTargetField('protein', dayKey, 100), dayKey).toBe(PROTEIN_FLOOR);
      expect(clampTargetField('protein', dayKey, 0), dayKey).toBe(PROTEIN_FLOOR);
      expect(clampTargetField('protein', dayKey, null), dayKey).toBe(PROTEIN_FLOOR);
    }
  });

  it('laisse passer une cible protéines au-dessus du plancher', () => {
    expect(clampTargetField('protein', 'train', 200)).toBe(200);
  });

  it('applique le plancher calorique hors week-end', () => {
    expect(clampTargetField('kcal', 'train', 1000)).toBe(KCAL_FLOOR);
    expect(clampTargetField('kcal', 'off', 1000)).toBe(KCAL_FLOOR);
    expect(clampTargetField('kcal', 'we', 1000)).toBe(1000);
  });

  it('ne touche pas aux autres champs', () => {
    expect(clampTargetField('carbs', 'train', 0)).toBe(0);
    expect(clampTargetField('fat', 'off', 12)).toBe(12);
  });
});
