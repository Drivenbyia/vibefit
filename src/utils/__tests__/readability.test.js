import { describe, it, expect } from 'vitest';
import { projectReadability, readableFromLabel, fmtRange } from '../trendUncertainty.js';
import { fmtDec, fmtSigned, fmtSignedInt, fmtDayMonth, plural } from '../format.js';

const base = { windowSize: 14, windowStart: '2026-10-31', windowEnd: '2026-11-13', extensionBlocked: null };

describe('projectReadability — date au plus tôt d’une tendance lisible', () => {
  it('bruit modéré : la fenêtre de 21 j suffit, à partir du début de la fenêtre actuelle', () => {
    // σ = 0,41 kg ⇒ ±237 kcal sur 21 pesées quotidiennes.
    expect(projectReadability({ ...base, sigmaKg: 0.41 })).toEqual({ date: '2026-11-20', windowSize: 21 });
  });

  it('rupture : la fenêtre ne commence qu’après la rupture et sa marge de 3 j', () => {
    const r = projectReadability({ ...base, sigmaKg: 0.41, extensionBlocked: { reason: 'atypical', date: '2026-10-24' } });
    // Début au plus tôt le 28/10, 21 j ⇒ fin le 17/11.
    expect(r).toEqual({ date: '2026-11-17', windowSize: 21 });
  });

  it('fenêtre possible dès aujourd’hui mais non retenue : pas avant demain', () => {
    const r = projectReadability({ ...base, sigmaKg: 0.41, extensionBlocked: { reason: 'cut', date: '2026-09-01' } });
    expect(r).toEqual({ date: '2026-11-14', windowSize: 21 });
  });

  it('bruit fort : seule la fenêtre de 28 j passe sous ±300', () => {
    expect(projectReadability({ ...base, sigmaKg: 0.7 })).toEqual({ date: '2026-11-27', windowSize: 28 });
  });

  it('bruit trop fort même sur 28 j, allongement incohérent ou donnée manquante : rien à annoncer', () => {
    expect(projectReadability({ ...base, sigmaKg: 1.5 })).toBeNull();
    expect(projectReadability({ ...base, sigmaKg: 0.41, extensionBlocked: { reason: 'implausible', date: '2026-10-24' } })).toBeNull();
    expect(projectReadability({ ...base, sigmaKg: null })).toBeNull();
    expect(projectReadability({ ...base, sigmaKg: 0.41, windowSize: 28 })).toBeNull();
  });

  it('libellés', () => {
    expect(readableFromLabel({ date: '2026-11-17', windowSize: 21 })).toBe('Lisible au plus tôt le 17/11 avec une pesée par jour.');
    expect(readableFromLabel(null)).toBe('');
    expect(fmtRange(1956, 454)).toMatch(/^entre 1\s502 et 2\s410 kcal\/j$/);
  });
});

describe('formats français partagés', () => {
  it('virgule décimale, signe typographique, accord', () => {
    expect(fmtDec(78)).toBe('78,0');
    expect(fmtDec(2.46, 1)).toBe('2,5');
    expect(fmtSigned(-1)).toBe('−1,0');
    expect(fmtSigned(0.6)).toBe('+0,6');
    expect(fmtSigned(0)).toBe('0,0');
    expect(fmtSignedInt(-217.6)).toBe('−218');
    expect(fmtSignedInt(0.2)).toBe('0');
    expect(fmtDayMonth('2026-10-31')).toBe('31/10');
    expect(fmtDayMonth(null)).toBe('');
    expect(plural(1, 'semaine')).toBe('semaine');
    expect(plural(2, 'semaine complète', 'semaines complètes')).toBe('semaines complètes');
    expect(plural(0, 'nuit')).toBe('nuit');
  });
});
