import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatProtocol, getHistoricalWeeks } from '../exportUtils.js';
import { computePresetTargets } from '../presetUtils.js';

describe('formatProtocol — le réglage sur lequel tourne l’app', () => {
  it('publie le libellé du preset, les trois cibles et l’objectif de pas', () => {
    const data = {
      presetId: 'cut_strong',
      targets: computePresetTargets('cut_strong', 2200),
      stepsTarget: 8000,
    };

    const line = formatProtocol(data);

    expect(line).toContain('Preset : Sèche forte');
    // Sèche forte à 2200 : TRAIN = TDEE − 200, OFF = TDEE − 600 (= plancher)
    expect(line).toContain('TRAIN 2000');
    expect(line).toContain('OFF 1600');
    // Le plancher protéines de ce preset est 170 g, pas 160 — c'est
    // précisément l'écart qu'un chiffre mémorisé hors de l'app fait manquer.
    expect(line).toContain('protéines 170 g');
    // `toLocaleString('fr-FR')` sépare les milliers par une espace INSÉCABLE
    expect(line).toMatch(/Objectif pas : 8\s000\/j/);
  });

  it('publie la cible du week-end, qui n’est pas nulle', () => {
    const data = {
      presetId: 'maintenance',
      targets: computePresetTargets('maintenance', 2000),
      stepsTarget: 8000,
    };
    // Le week-end reçoit la moyenne pondérée des jours de semaine : le taire
    // laisserait croire à 2 jours sur 7 sans cible.
    expect(formatProtocol(data)).toMatch(/WE \d{4} kcal/);
  });

  it('dégrade proprement sur un state incomplet plutôt que de casser l’export', () => {
    const line = formatProtocol({});
    expect(line).toContain('Preset : Maintenance');
    expect(line).toContain('TRAIN —');
    // `toLocaleString('fr-FR')` sépare les milliers par une espace INSÉCABLE
    expect(line).toMatch(/Objectif pas : 8\s000\/j/);
  });

  it('retombe sur les protéines de OFF si TRAIN n’en porte pas', () => {
    const line = formatProtocol({ targets: { off: { kcal: 1700, protein: 160 } } });
    expect(line).toContain('protéines 160 g');
  });
});

describe('getHistoricalWeeks — en-tête du rapport', () => {
  it('place la ligne de protocole juste sous la ligne de diagnostic', () => {
    const report = getHistoricalWeeks(
      {
        days: {},
        presetId: 'cut_light',
        targets: computePresetTargets('cut_light', 2100),
        stepsTarget: 9000,
      },
      1
    );

    const lines = report.split('\n').filter((l) => l.length > 0);
    expect(lines[1]).toContain('⚡ TDEE adaptatif');
    expect(lines[2]).toContain('🎯 Preset : Sèche légère');
  });
});

describe('rapport : objectif de pas, jours futurs, semaines vides', () => {
  const PHASE = { id: 'm', type: 'medical_stop', label: 'Arrêt médical', start: '2026-08-29', plannedEnd: '2027-03-01', endedAt: null };
  // Lundi 16/11/2026 au soir : le reste de la semaine n'a pas eu lieu.
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 10, 16, 20)); });
  afterEach(() => vi.useRealTimers());

  it('arrêt médical : aucun objectif de pas publié', () => {
    const line = formatProtocol({ presetId: 'cut_strong', stepsTarget: 8000, phases: [PHASE] });
    expect(line).toContain('Objectif pas : suspendu');
    expect(line).not.toMatch(/8\s000/);
  });

  it('n’affiche pas les jours futurs de la semaine en cours', () => {
    const report = getHistoricalWeeks({ days: { '2026-11-16': { weight: '77' } } }, 1);
    expect(report).toContain('Poids: 77 kg');
    expect(report).not.toMatch(/mardi 17 novembre/);
    expect(report).not.toMatch(/dimanche 22 novembre/);
  });

  it('regroupe les semaines vides sur une ligne', () => {
    const report = getHistoricalWeeks({ days: { '2026-11-16': { weight: '77' } } }, 3);
    expect(report).not.toContain('## Semaine du lundi 9 novembre');
    expect(report).not.toContain('## Semaine du lundi 2 novembre');
    expect(report).toContain('Aucune donnée saisie pour les semaines du 09/11/2026, 02/11/2026');
  });
});
