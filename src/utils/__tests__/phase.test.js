import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { dayType } from '../../models/day.js';
import { isCyclingSuspended, isTrainingSuspended } from '../../models/protocol.js';
import {
  computeSingleTarget, computePresetTargets, resolveTargets, presetWeeklyRate, presetRateLabel,
} from '../presetUtils.js';
import { calculateWeeklyBalance, nutritionScope } from '../mathUtils.js';
import { formatProtocol } from '../exportUtils.js';
import { addDays } from '../dateUtils.js';

/** Étape 3 — phase « Arrêt médical » et cible unique. */

const PHASE = {
  id: 'medical-a', type: 'medical_stop', label: 'Arrêt médical',
  start: '2026-08-29', plannedEnd: '2027-03-01', endedAt: null,
};
const CUT = { id: 'cut', type: 'untracked', start: '2026-08-20', end: '2026-10-23', scope: 'nutrition' };

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('computeSingleTarget — milieu (TRAIN+OFF)/2 puis plancher 1600', () => {
  // Tableau validé le 2026-10-24, TDEE 2050.
  it.each([
    ['maintenance', 2050, 130, 73, 218],
    ['cut_light', 1850, 130, 70, 175],
    ['cut_strong', 1650, 130, 65, 136],
    ['bulk', 2350, 130, 78, 282],
    ['diet_break', 2050, 130, 80, 203],
  ])('%s à 2050 → %i kcal, P %i, L %i, G %i', (preset, kcal, protein, fat, carbs) => {
    expect(computeSingleTarget(preset, 2050)).toMatchObject({ kcal, protein, fat, carbs });
  });

  it('Maintenance = TDEE exactement, sur toute la plage', () => {
    for (let tdee = 1600; tdee <= 3200; tdee += 50) {
      expect(computeSingleTarget('maintenance', tdee).kcal).toBe(tdee);
    }
  });

  it('part des formules BRUTES, pas des cibles cyclées corrigées par le plancher', () => {
    // Cyclée, Sèche forte à 2050 donne 2000/1600 (TRAIN relevé) : milieu 1800.
    const cycled = computePresetTargets('cut_strong', 2050);
    expect((cycled.train.kcal + cycled.off.kcal) / 2).toBe(1800);
    expect(computeSingleTarget('cut_strong', 2050).kcal).toBe(1650);
  });

  it('plancher 1600 appliqué directement, protéines de phase 130 g quel que soit le preset', () => {
    expect(computeSingleTarget('cut_strong', 1800).kcal).toBe(1600);
    expect(computeSingleTarget('custom', 2000, {
      train: { kcal: 1500, protein: 120, fat: 60 }, off: { kcal: 1400, protein: 120, fat: 60 },
    })).toMatchObject({ kcal: 1600, protein: 130 });
  });

  it('preset personnalisé : milieu des cibles saisies', () => {
    expect(computeSingleTarget('custom', 2000, {
      train: { kcal: 2300, protein: 180, fat: 70 }, off: { kcal: 1900, protein: 170, fat: 80 },
    })).toMatchObject({ kcal: 2100, protein: 130, fat: 75 });
  });

  it('macros cohérentes : P×4 + L×9 + G×4 ≈ kcal', () => {
    for (const p of ['maintenance', 'cut_light', 'cut_strong', 'bulk', 'diet_break']) {
      const t = computeSingleTarget(p, 2050);
      expect(Math.abs(t.protein * 4 + t.fat * 9 + t.carbs * 4 - t.kcal)).toBeLessThanOrEqual(2);
    }
  });
});

describe('dayType pendant la phase — un seul type, rien ne le rouvre', () => {
  it('tous les jours de la phase sont `rest`, week-end compris', () => {
    for (let k = '2026-10-26'; k <= '2026-11-01'; k = addDays(k, 1)) {
      expect(dayType(k, null, [PHASE])).toBe('rest');
    }
  });

  it('ni la bascule manuelle ni une séance saisie ne rouvrent TRAIN', () => {
    expect(dayType('2026-10-26', { typeOverride: 'train' }, [PHASE])).toBe('rest');
    expect(dayType('2026-10-28', { workout: 'haut' }, [PHASE])).toBe('rest');
  });

  it('avant la phase et sans phase : comportement inchangé', () => {
    expect(dayType('2026-08-24', null, [PHASE])).toBe('train'); // lundi
    expect(dayType('2026-10-26', null)).toBe('train');
    expect(dayType('2026-10-26', { workout: 'none' }, [])).toBe('off');
  });

  it('après la clôture, le calendrier reprend', () => {
    const closed = { ...PHASE, endedAt: '2027-03-03' };
    expect(dayType('2027-03-03', null, [closed])).toBe('rest');
    expect(dayType('2027-03-08', null, [closed])).toBe('train'); // lundi
  });

  it('la phase suspend cyclage ET séances ; une coupure seule ne suspend rien', () => {
    expect(isCyclingSuspended('2026-11-02', [PHASE])).toBe(true);
    expect(isTrainingSuspended('2026-11-02', [PHASE])).toBe(true);
    expect(isCyclingSuspended('2026-11-02', [])).toBe(false);
  });
});

describe('resolveTargets — la cible unique servie partout', () => {
  it('ajoute `rest` sans toucher aux cibles stockées', () => {
    const targets = computePresetTargets('maintenance', 2050);
    const r = resolveTargets({ targets, presetId: 'maintenance', baseTDEE: 2050 });
    expect(r.train).toBe(targets.train);
    expect(r.rest.kcal).toBe(2050);
  });
});

describe('taux affiché pendant la phase', () => {
  it('écart de la cible unique au TDEE, ×7', () => {
    expect(presetWeeklyRate('cut_light', 2050, { cycling: false })).toEqual({ kcalPerDay: -200, gramsPerWeek: -182 });
    expect(presetRateLabel('maintenance', 2050, { cycling: false })).toBe('Maintien · +0 kcal/j');
  });

  it('hors phase, inchangé (Maintenance cyclée : +40 kcal/j sur la semaine-type)', () => {
    expect(presetWeeklyRate('maintenance', 2050)).toEqual(presetWeeklyRate('maintenance', 2050, {}));
  });
});

describe('solde de la semaine — phase et coupure', () => {
  const targets = resolveTargets({ targets: computePresetTargets('maintenance', 2050), presetId: 'maintenance', baseTDEE: 2050 });
  const week = Array.from({ length: 7 }, (_, i) => {
    const key = addDays('2026-10-19', i);
    return { key, day: { intake: { kcal: '2100', protein: '160' }, expenditure: { kcal: '', steps: '' } } };
  });

  it('une semaine à cheval sur la coupure ne compte que les jours d’après', () => {
    const w = calculateWeeklyBalance(nutritionScope(week, [CUT]), targets, [PHASE]);
    expect(w.recordedDays).toBe(2);        // 24 et 25/10
    expect(w.totalIntake).toBe(4200);
    expect(w.comparableDays).toBe(2);
  });

  it('pendant la phase, l’apport est comparé à la cible unique', () => {
    const w = calculateWeeklyBalance(nutritionScope(week, [CUT]), targets, [PHASE]);
    expect(w.avgKcalTarget).toBe(2050);
  });
});

describe('export — la ligne de protocole publie la cible unique', () => {
  it('pendant la phase', () => {
    vi.setSystemTime(new Date(2026, 9, 26, 12));
    const line = formatProtocol({
      presetId: 'maintenance', baseTDEE: 2050, targets: computePresetTargets('maintenance', 2050),
      stepsTarget: 8000, phases: [PHASE],
    });
    expect(line).toContain('Cible unique : 2050 kcal/j (cyclage TRAIN/OFF suspendu)');
    expect(line).toContain('protéines 130 g');
    expect(line).not.toContain('TRAIN 2250');
  });

  it('hors phase, inchangé', () => {
    vi.setSystemTime(new Date(2026, 9, 26, 12));
    const line = formatProtocol({ presetId: 'maintenance', targets: computePresetTargets('maintenance', 2050), stepsTarget: 8000 });
    expect(line).toContain('TRAIN 2250 / OFF 1850');
  });
});
