import { describe, it, expect } from 'vitest';
import { diagnose, DIAGNOSIS, PLATEAU_MIN_WEEKS } from '../plateauProtocol.js';
import { toKey, addDays } from '../dateUtils.js';

/** Signaux « en bonne santé » par défaut — surchargeables au cas par cas. */
const goodSignals = (over = {}) => ({
  hasEnoughData: true,
  adaptiveTDEE: 2500,
  confidence: 85,
  overlapDays: 12,
  ...over,
});

/** 4 semaines (3 évaluées + 1 de recul), de la plus ancienne à la plus récente. */
const weeks = (specs) =>
  specs.map((s, i) => ({
    weekStart: `S${i}`,
    recordedDays: 7,
    avgIntake: 2000,
    avgWeight: null,
    avgWaist: null,
    ...s,
  }));

describe('porte d’adhérence — cœur du protocole anti-rationalisation', () => {
  it('refuse de conclure à un plateau quand une semaine est mal loggée', () => {
    // Poids parfaitement stable : tentant de diagnostiquer un plateau.
    // Mais une semaine à 3 jours saisis rend la moyenne non représentative.
    const d = diagnose({
      signals: goodSignals(),
      weeklyHistory: weeks([
        { avgWeight: 80 },
        { avgWeight: 80, recordedDays: 3 },
        { avgWeight: 80 },
        { avgWeight: 80 },
      ]),
    });
    expect(d.status).toBe(DIAGNOSIS.LOW_ADHERENCE);
    expect(d.status).not.toBe(DIAGNOSIS.PLATEAU_CONFIRMED);
    expect(d.detail).toContain('3/7');
  });

  it('refuse de conclure quand le recouvrement du TDEE est faible', () => {
    const d = diagnose({
      signals: goodSignals({ confidence: 55 }),
      weeklyHistory: weeks([
        { avgWeight: 80 }, { avgWeight: 80 }, { avgWeight: 80 }, { avgWeight: 80 },
      ]),
    });
    expect(d.status).toBe(DIAGNOSIS.LOW_ADHERENCE);
  });

  it('bloque tout diagnostic sans TDEE exploitable', () => {
    const d = diagnose({
      signals: goodSignals({ hasEnoughData: false, adaptiveTDEE: null, overlapDays: 6 }),
      weeklyHistory: weeks([
        { avgWeight: 80 }, { avgWeight: 80 }, { avgWeight: 80 }, { avgWeight: 80 },
      ]),
    });
    expect(d.status).toBe(DIAGNOSIS.INSUFFICIENT_DATA);
    expect(d.detail).toContain('6 jours');
  });

  it('ne juge pas la semaine en cours, encore incomplète', () => {
    // Un mercredi, la semaine courante n'a que 3 jours écoulés. La compter
    // ferait passer tout début de semaine pour un défaut d'adhérence.
    const d = diagnose({
      signals: goodSignals(),
      weeklyHistory: weeks([
        { avgWeight: 80.0, elapsedDays: 7 },
        { avgWeight: 80.02, elapsedDays: 7 },
        { avgWeight: 80.01, elapsedDays: 7 },
        { avgWeight: 80.03, elapsedDays: 7 },
        { avgWeight: 80.02, elapsedDays: 3, recordedDays: 3 },
      ]),
    });
    expect(d.status).not.toBe(DIAGNOSIS.LOW_ADHERENCE);
    expect(d.status).toBe(DIAGNOSIS.PLATEAU_CONFIRMED);
  });

  it('exige un historique de PLATEAU_MIN_WEEKS semaines', () => {
    const d = diagnose({
      signals: goodSignals(),
      weeklyHistory: weeks([{ avgWeight: 80 }, { avgWeight: 80 }]),
    });
    expect(d.status).toBe(DIAGNOSIS.INSUFFICIENT_DATA);
    expect(d.weeksEvaluated).toBeLessThan(PLATEAU_MIN_WEEKS);
  });
});

describe('diagnostic de plateau', () => {
  it('confirme un plateau quand les trois signaux sont stables', () => {
    const d = diagnose({
      signals: goodSignals(),
      weeklyHistory: weeks([
        { avgWeight: 80.0 },
        { avgWeight: 80.02 },
        { avgWeight: 80.01 },
        { avgWeight: 80.03 },
      ]),
    });
    expect(d.status).toBe(DIAGNOSIS.PLATEAU_CONFIRMED);
    expect(d.weeksEvaluated).toBe(PLATEAU_MIN_WEEKS);
  });

  it('conclut à une progression tant que le poids bouge', () => {
    const d = diagnose({
      signals: goodSignals(),
      weeklyHistory: weeks([
        { avgWeight: 82.0 },
        { avgWeight: 81.4 },
        { avgWeight: 80.8 },
        { avgWeight: 80.2 },
      ]),
    });
    expect(d.status).toBe(DIAGNOSIS.PROGRESSING);
  });
});

describe('garde-fou rétention d’eau', () => {
  it('n’interprète pas une prise de poids à taille stable comme un plateau', () => {
    const d = diagnose({
      signals: goodSignals(),
      weeklyHistory: weeks([
        { avgWeight: 80.0, avgWaist: 82.0 },
        { avgWeight: 80.6, avgWaist: 82.1 },
        { avgWeight: 81.2, avgWaist: 82.0 },
        { avgWeight: 81.8, avgWaist: 82.1 },
      ]),
    });
    expect(d.status).toBe(DIAGNOSIS.WATER_RETENTION_SUSPECTED);
    expect(d.detail).toContain('ne pas couper les calories');
  });

  it('ne masque pas une vraie prise de masse grasse', () => {
    // Poids ET tour de taille montent : ce n'est pas de l'eau.
    const d = diagnose({
      signals: goodSignals(),
      weeklyHistory: weeks([
        { avgWeight: 80.0, avgWaist: 82.0 },
        { avgWeight: 80.6, avgWaist: 82.9 },
        { avgWeight: 81.2, avgWaist: 83.7 },
        { avgWeight: 81.8, avgWaist: 84.6 },
      ]),
    });
    expect(d.status).not.toBe(DIAGNOSIS.WATER_RETENTION_SUSPECTED);
  });
});

describe('toKey — date locale', () => {
  it('produit une clé YYYY-MM-DD alignée sur la date locale', () => {
    const d = new Date(2026, 6, 29, 23, 30); // 29 juillet, 23h30 local
    expect(toKey(d)).toBe('2026-07-29');
  });

  it('reste stable juste après minuit local', () => {
    const d = new Date(2026, 6, 30, 0, 15);
    expect(toKey(d)).toBe('2026-07-30');
  });

  it('traverse correctement un changement de mois', () => {
    expect(addDays('2026-07-31', 1)).toBe('2026-08-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('traverse le passage à l’heure d’hiver', () => {
    // Bascule européenne : dimanche 25 octobre 2026
    expect(addDays('2026-10-24', 1)).toBe('2026-10-25');
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26');
  });
});
