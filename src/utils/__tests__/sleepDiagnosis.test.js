import { describe, it, expect } from 'vitest';
import {
  diagnoseSleep, SLEEP, SLEEP_DEBT_MIN, SLEEP_MIN_NIGHTS, fmtDuration,
} from '../sleepDiagnosis.js';
import { summarizeStatus, STATUS_KIND, TONE } from '../vibeStatus.js';
import { DIAGNOSIS } from '../plateauProtocol.js';
import { NEAT } from '../neatDrift.js';

/** Semaine complète, sommeil renseigné sur assez de nuits par défaut. */
const week = ({ durationMin = 450, hrv = 50, rhr = 53, nights = 7, elapsedDays = 7 } = {}) => ({
  elapsedDays,
  sleep: { score: null, durationMin, hrv, rhr, nights },
});

describe('diagnoseSleep — porte de données', () => {
  it('ne conclut rien sans historique', () => {
    expect(diagnoseSleep({ weeklyHistory: [] }).status).toBe(SLEEP.INSUFFICIENT_DATA);
    expect(diagnoseSleep().status).toBe(SLEEP.INSUFFICIENT_DATA);
  });

  it('exige que la DERNIÈRE semaine complète soit exploitable', () => {
    // Sans ce contrôle, une semaine sans montre ferait juger la précédente et
    // publier un statut rassurant sur des nuits périmées.
    const history = [week(), week(), week({ nights: SLEEP_MIN_NIGHTS - 1 })];
    const out = diagnoseSleep({ weeklyHistory: history });

    expect(out.status).toBe(SLEEP.INSUFFICIENT_DATA);
    expect(out.detail).toContain(`${SLEEP_MIN_NIGHTS - 1} nuit(s)`);
  });

  it('ignore la semaine en cours, incomplète par nature', () => {
    const history = [week(), week(), week({ durationMin: 300, elapsedDays: 2 })];
    // La semaine tronquée à 2 jours ne doit pas devenir la semaine jugée.
    expect(diagnoseSleep({ weeklyHistory: history }).status).not.toBe(SLEEP.DEBT);
  });
});

describe('diagnoseSleep — dette', () => {
  it('signale une durée moyenne sous le seuil', () => {
    const out = diagnoseSleep({ weeklyHistory: [week(), week({ durationMin: 380 })] });

    expect(out.status).toBe(SLEEP.DEBT);
    expect(out.avgDurationMin).toBe(380);
    expect(out.detail).toContain('6 h 20');
    expect(out.detail).toContain('6 h 30');
  });

  it('ne se déclenche pas pile au seuil', () => {
    // Le seuil est un plancher inclusif : 6 h 30 n'est pas une dette.
    const out = diagnoseSleep({ weeklyHistory: [week(), week({ durationMin: SLEEP_DEBT_MIN })] });
    expect(out.status).not.toBe(SLEEP.DEBT);
  });
});

describe('diagnoseSleep — tension de récupération', () => {
  const baseline = [week({ hrv: 50, rhr: 53 }), week({ hrv: 48, rhr: 53 }), week({ hrv: 49, rhr: 52 })];

  it('détecte une VFC nettement sous SA ligne de base', () => {
    const out = diagnoseSleep({ weeklyHistory: [...baseline, week({ hrv: 38, rhr: 53 })] });

    expect(out.status).toBe(SLEEP.STRAIN);
    expect(out.detail).toContain('VFC 38 ms');
    expect(out.detail).toContain('49 habituels');
    expect(Math.round(out.hrvBaseline)).toBe(49);
  });

  it('détecte une FC repos élevée même avec une VFC normale', () => {
    const out = diagnoseSleep({ weeklyHistory: [...baseline, week({ hrv: 49, rhr: 60 })] });

    expect(out.status).toBe(SLEEP.STRAIN);
    expect(out.detail).toContain('FC repos 60 bpm');
  });

  it('juge contre la ligne de base personnelle, pas contre une norme', () => {
    // Une VFC de 38 ms est « basse » dans l'absolu — mais chez quelqu'un dont
    // la ligne de base est 37, c'est une semaine normale.
    const low = [week({ hrv: 37 }), week({ hrv: 36 }), week({ hrv: 38 })];
    expect(diagnoseSleep({ weeklyHistory: [...low, week({ hrv: 38 })] }).status)
      .not.toBe(SLEEP.STRAIN);
  });

  it('passe AVANT la dette quand les deux sont vraies, et la mentionne', () => {
    const out = diagnoseSleep({ weeklyHistory: [...baseline, week({ hrv: 38, durationMin: 370 })] });

    expect(out.status).toBe(SLEEP.STRAIN);
    expect(out.detail).toContain('durée moyenne est aussi basse');
    expect(out.detail).toContain('6 h 10');
  });

  it('reste muet sur la tension sans ligne de base suffisante', () => {
    // Une seule semaine de recul ne fait pas une ligne de base : on ne peut pas
    // distinguer une chute d'une valeur habituelle.
    const out = diagnoseSleep({ weeklyHistory: [week({ hrv: 50 }), week({ hrv: 20 })] });
    expect(out.status).not.toBe(SLEEP.STRAIN);
  });
});

describe('diagnoseSleep — bonnes nouvelles et repos', () => {
  it('signale une remontée nette au-dessus de 7 h', () => {
    const history = [week({ durationMin: 400 }), week({ durationMin: 405 }), week({ durationMin: 470 })];
    const out = diagnoseSleep({ weeklyHistory: history });

    expect(out.status).toBe(SLEEP.IMPROVING);
    expect(out.detail).toContain('7 h 50');
  });

  it('reste stable sur une semaine ordinaire', () => {
    const out = diagnoseSleep({ weeklyHistory: [week(), week(), week()] });
    expect(out.status).toBe(SLEEP.STABLE);
    expect(out.detail).toContain('7 h 30');
  });
});

describe('fmtDuration', () => {
  it('affiche des heures et des minutes, jamais des minutes brutes', () => {
    expect(fmtDuration(405)).toBe('6 h 45');
    expect(fmtDuration(365)).toBe('6 h 05');
    expect(fmtDuration(480)).toBe('8 h 00');
  });
});

describe('summarizeStatus — place du sommeil dans l’arbitrage', () => {
  const strain = { status: SLEEP.STRAIN, detail: 'VFC basse.' };
  const debt = { status: SLEEP.DEBT, detail: 'Dette.' };
  const signals = { weightTrendPerWeek: -0.3, adaptiveTDEE: 2200, confidence: 85 };

  it('publie la tension AVANT un plateau confirmé', () => {
    // Un plateau annoncé sur un organisme mal récupéré appelle une coupe
    // calorique — exactement la mauvaise réponse.
    const out = summarizeStatus({
      diagnosis: { status: DIAGNOSIS.PLATEAU_CONFIRMED, weeksEvaluated: 3 },
      sleep: strain,
      signals,
    });

    expect(out.kind).toBe(STATUS_KIND.SLEEP_STRAIN);
    expect(out.tone).toBe(TONE.ALERT);
  });

  it('cède devant une dérive installée du NEAT', () => {
    const out = summarizeStatus({
      neat: { status: NEAT.SUSTAINED_DRIFT, currentSteps: 6000, baselineSteps: 9000, kcalImpact: -120 },
      sleep: strain,
      signals,
    });

    expect(out.kind).toBe(STATUS_KIND.NEAT_DRIFT);
  });

  it('publie la dette devant un suivi incomplet', () => {
    const out = summarizeStatus({
      diagnosis: { status: DIAGNOSIS.LOW_ADHERENCE },
      sleep: debt,
      signals,
    });

    expect(out.kind).toBe(STATUS_KIND.SLEEP_DEBT);
    expect(out.tone).toBe(TONE.WARN);
  });

  it('laisse passer la rétention d’eau avant la dette', () => {
    // La rétention bloque une coupe injustifiée : elle garde son rang.
    const out = summarizeStatus({
      diagnosis: { status: DIAGNOSIS.WATER_RETENTION_SUSPECTED },
      sleep: debt,
      signals,
    });

    expect(out.kind).toBe(STATUS_KIND.WATER_RETENTION);
  });

  it('reste inchangé quand aucun diagnostic de sommeil n’est fourni', () => {
    const out = summarizeStatus({
      diagnosis: { status: DIAGNOSIS.PROGRESSING },
      signals,
    });

    expect(out.kind).toBe(STATUS_KIND.PROGRESSING);
  });
});
