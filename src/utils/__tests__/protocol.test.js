import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  migrateData,
  sanitizeProtocol,
  restorableProtocol,
  isExcluded,
  periodAt,
  phaseAt,
  deviceAt,
  measureSource,
} from '../../models/protocol.js';
import { SCHEMA_VERSION } from '../../constants/config.js';
import { backupFileName } from '../backupUtils.js';
import { formatContext, getHistoricalWeeks } from '../exportUtils.js';

const CUT = {
  id: 'untracked-a', type: 'untracked', start: '2026-08-20', end: '2026-10-23',
  scope: 'nutrition', label: 'Période non suivie',
};
const PHASE = {
  id: 'medical-a', type: 'medical_stop', label: 'Arrêt médical',
  start: '2026-08-29', plannedEnd: '2027-03-01', endedAt: null,
};
const DEVICES = [
  { source: 'garmin', from: null, to: '2026-10-18' },
  { source: 'apple_watch', from: '2026-10-19', to: null },
];

describe('migrateData — migration additive v1 → v2', () => {
  const v1 = {
    days: { '2026-08-19': { weight: '77', intake: { kcal: '2000' } } },
    targets: { train: { kcal: 2200 } },
    presetId: 'maintenance',
    baseTDEE: 2000,
    stepsTarget: 8000,
  };

  it('ajoute les trois listes vides et la version', () => {
    const out = migrateData(v1);
    expect(out.schemaVersion).toBe(SCHEMA_VERSION);
    expect(out.periods).toEqual([]);
    expect(out.phases).toEqual([]);
    expect(out.devices).toEqual([]);
  });

  it('ne réécrit NI les jours NI les réglages — reprise par référence', () => {
    const out = migrateData(v1);
    expect(out.days).toBe(v1.days);
    expect(out.targets).toBe(v1.targets);
    expect(out.baseTDEE).toBe(2000);
    expect(out.presetId).toBe('maintenance');
  });

  it('est idempotente', () => {
    const once = migrateData({ ...v1, periods: [CUT], phases: [PHASE], devices: DEVICES });
    expect(migrateData(once)).toEqual(once);
  });

  it('ne mute pas l’objet d’entrée', () => {
    const input = structuredClone(v1);
    migrateData(input);
    expect(input).toEqual(v1);
  });

  it('survit à une entrée absurde', () => {
    expect(migrateData(null).periods).toEqual([]);
    expect(migrateData('x').phases).toEqual([]);
  });
});

describe('sanitizeProtocol — une entrée mal formée est écartée, pas fatale', () => {
  it('rejette dates invalides, bornes inversées et sources inconnues', () => {
    const out = sanitizeProtocol({
      periods: [CUT, { ...CUT, id: 'b', start: '2026-10-23', end: '2026-08-20' }, { ...CUT, id: 'c', start: '20/08' }],
      phases: [PHASE, { ...PHASE, id: 'p2', start: null }],
      devices: [...DEVICES, { source: 'fitbit', from: null, to: null }],
    });
    expect(out.periods.map((p) => p.id)).toEqual(['untracked-a']);
    expect(out.phases.map((p) => p.id)).toEqual(['medical-a']);
    expect(out.devices).toHaveLength(2);
  });

  it('traite un champ non tableau comme vide', () => {
    expect(sanitizeProtocol({ periods: 'oops' }).periods).toEqual([]);
  });
});

describe('restorableProtocol — restauration d’une sauvegarde', () => {
  it('remplace uniquement les listes présentes dans le fichier', () => {
    expect(restorableProtocol({ days: {}, phases: [PHASE] })).toEqual({ phases: [PHASE] });
  });

  it('un ancien export (v1) ne touche à rien', () => {
    expect(restorableProtocol({ days: {}, targets: {} })).toEqual({});
  });
});

describe('isExcluded / periodAt — bornes de la coupure', () => {
  it('bornes INCLUSES : 20/08 et 23/10 exclus, 19/08 et 24/10 non', () => {
    expect(isExcluded('2026-08-19', [CUT])).toBe(false);
    expect(isExcluded('2026-08-20', [CUT])).toBe(true);
    expect(isExcluded('2026-10-23', [CUT])).toBe(true);
    expect(isExcluded('2026-10-24', [CUT])).toBe(false);
  });

  it('l’exclusion nutritionnelle ne s’étend pas aux autres périmètres', () => {
    // Les nuits Apple Watch du 19 au 23/10 doivent rester utilisables pour la
    // référence sommeil, alors que ces jours sont hors calcul nutritionnel.
    expect(isExcluded('2026-10-21', [CUT], 'nutrition')).toBe(true);
    expect(isExcluded('2026-10-21', [CUT], 'recovery')).toBe(false);
  });

  it('periodAt retrouve la coupure', () => {
    expect(periodAt('2026-09-01', [CUT])?.id).toBe('untracked-a');
    expect(periodAt('2026-11-01', [CUT])).toBeNull();
  });
});

describe('phaseAt — la fin prévue ne ferme pas la phase', () => {
  it('active du début jusqu’à la fin prévue', () => {
    expect(phaseAt('2026-08-28', [PHASE])).toBeNull();
    expect(phaseAt('2026-08-29', [PHASE])?.id).toBe('medical-a');
    expect(phaseAt('2027-03-01', [PHASE])?.id).toBe('medical-a');
  });

  it('reste active APRÈS la fin prévue tant qu’elle n’est pas clôturée', () => {
    // L'épreuve d'effort peut être reportée : une date prévue n'autorise pas
    // la reprise des séances à elle seule.
    expect(phaseAt('2027-03-15', [PHASE])?.id).toBe('medical-a');
  });

  it('s’arrête à la clôture manuelle, incluse', () => {
    const closed = { ...PHASE, endedAt: '2027-03-03' };
    expect(phaseAt('2027-03-03', [closed])?.id).toBe('medical-a');
    expect(phaseAt('2027-03-04', [closed])).toBeNull();
  });
});

describe('deviceAt / measureSource — une mesure garde sa source', () => {
  it('bascule Garmin → Apple Watch le 19/10', () => {
    expect(deviceAt('2026-10-18', DEVICES)).toBe('garmin');
    expect(deviceAt('2026-10-19', DEVICES)).toBe('apple_watch');
    expect(deviceAt('2026-10-19', [])).toBeNull();
  });

  it('la source écrite sur le jour l’emporte sur la chronologie', () => {
    const day = { expenditure: { steps: '2385', stepsSource: 'iphone' } };
    expect(measureSource('2026-10-21', day, 'steps', DEVICES)).toBe('iphone');
  });

  it('sans source écrite, elle est déduite — le jour n’est pas réécrit', () => {
    const day = { sleep: { hrv: '46' } };
    expect(measureSource('2026-08-19', day, 'sleep', DEVICES)).toBe('garmin');
    expect(day.sleep).toEqual({ hrv: '46' });
  });

  it('une source inconnue écrite sur le jour est ignorée', () => {
    const day = { sleep: { source: 'fitbit' } };
    expect(measureSource('2026-10-21', day, 'sleep', DEVICES)).toBe('apple_watch');
  });
});

describe('backupFileName — horodaté à la minute, heure locale', () => {
  it('distingue deux exports du même jour', () => {
    expect(backupFileName(new Date(2026, 9, 24, 9, 5))).toBe('vibefit-2026-10-24_09h05.json');
    expect(backupFileName(new Date(2026, 9, 24, 14, 30))).toBe('vibefit-2026-10-24_14h30.json');
  });
});

describe('export — phase, coupure et sources publiées', () => {
  const data = { days: {}, periods: [CUT], phases: [PHASE], devices: DEVICES };

  it('formatContext publie les trois lignes', () => {
    const lines = formatContext(data);
    expect(lines[0]).toBe('🩺 Phase : Arrêt médical depuis le 29/08/2026 · fin prévue le 01/03/2027');
    expect(lines[1]).toContain('20/08/2026 → 23/10/2026');
    expect(lines[2]).toBe('⌚ Montre : Garmin jusqu’au 18/10/2026 · Apple Watch depuis le 19/10/2026');
  });

  it('aucune ligne sans protocole daté — rapport inchangé', () => {
    expect(formatContext({ days: {} })).toEqual([]);
  });

  afterEach(() => vi.useRealTimers());

  it('étiquette la source des pas et du sommeil, et marque la coupure', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 24, 12, 0));
    const report = getHistoricalWeeks(
      {
        ...data,
        days: {
          '2026-08-20': { sleep: { score: '39', durationMin: '357', hrv: '25', rhr: '63' } },
          '2026-08-19': { expenditure: { steps: '6000', stepsSource: 'iphone' } },
        },
      },
      11
    );
    expect(report).toMatch(/20 août\*\* _\(période non suivie\)_ : Sommeil: .*\(Garmin\)/);
    expect(report).toMatch(/19 août\*\* : Pas: 6\s000 \(iPhone seul — sous-estimé\)/);
  });
});
