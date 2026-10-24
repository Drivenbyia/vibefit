import { describe, it, expect } from 'vitest';
import { backupStatus, backupAgeLabel, latestInstant } from '../backupUtils.js';
import { migrateData } from '../../models/protocol.js';

// Midi local : la date calendaire ne dépend pas du fuseau de la machine de test.
const at = (key, hh = '12:00') => new Date(`${key}T${hh}:00`).toISOString();

describe('backupStatus — âge de la dernière sauvegarde', () => {
  it('rien à protéger sans jour saisi', () => {
    expect(backupStatus({ lastBackupAt: null, dayCount: 0, todayKey: '2026-10-24' })).toBeNull();
  });

  it('jamais exporté avec des données = en retard', () => {
    expect(backupStatus({ lastBackupAt: null, dayCount: 63, todayKey: '2026-10-24' }))
      .toEqual({ never: true, ageDays: null, lastKey: null, overdue: true });
  });

  it('7 jours pile : pas encore de rappel ; 8 jours : rappel', () => {
    const last = at('2026-10-17');
    expect(backupStatus({ lastBackupAt: last, dayCount: 1, todayKey: '2026-10-24' }))
      .toMatchObject({ ageDays: 7, overdue: false, lastKey: '2026-10-17' });
    expect(backupStatus({ lastBackupAt: last, dayCount: 1, todayKey: '2026-10-25' }))
      .toMatchObject({ ageDays: 8, overdue: true });
  });

  it('compte en jours calendaires : export à 23 h = « hier » le lendemain matin', () => {
    const s = backupStatus({ lastBackupAt: at('2026-10-23', '23:30'), dayCount: 1, todayKey: '2026-10-24' });
    expect(s.ageDays).toBe(1);
    expect(backupAgeLabel(s)).toBe('hier');
  });

  it('un horodatage illisible vaut « jamais »', () => {
    expect(backupStatus({ lastBackupAt: 'pas une date', dayCount: 3, todayKey: '2026-10-24' }).never).toBe(true);
  });

  it('libellés', () => {
    expect(backupAgeLabel({ never: false, ageDays: 0 })).toBe("aujourd'hui");
    expect(backupAgeLabel({ never: false, ageDays: 9 })).toBe('il y a 9 jours');
    expect(backupAgeLabel({ never: true })).toBe('jamais');
  });
});

describe('latestInstant — la date de sauvegarde ne recule jamais', () => {
  it('restaurer un vieux fichier garde l’export plus récent', () => {
    expect(latestInstant(at('2026-10-20'), at('2026-08-01'))).toBe(at('2026-10-20'));
  });
  it('restaurer sur un appareil neuf reprend la date du fichier', () => {
    expect(latestInstant(null, at('2026-10-20'))).toBe(at('2026-10-20'));
  });
  it('fichier sans exportedAt : rien ne change', () => {
    expect(latestInstant(at('2026-10-20'), undefined)).toBe(at('2026-10-20'));
    expect(latestInstant(null, undefined)).toBeNull();
  });
});

describe('migrateData — lastBackupAt', () => {
  it('ancien state : initialisé à null, jours intacts', () => {
    const days = { '2026-10-24': { weight: '80' } };
    const out = migrateData({ days });
    expect(out.lastBackupAt).toBeNull();
    expect(out.days).toBe(days);
  });
  it('valeur valide conservée, valeur invalide écartée', () => {
    expect(migrateData({ lastBackupAt: at('2026-10-24') }).lastBackupAt).toBe(at('2026-10-24'));
    expect(migrateData({ lastBackupAt: 42 }).lastBackupAt).toBeNull();
  });
});
