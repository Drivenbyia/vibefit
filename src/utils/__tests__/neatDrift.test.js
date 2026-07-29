import { describe, it, expect } from 'vitest';
import { diagnoseNeat, NEAT, NEAT_MIN_DAYS } from '../neatDrift.js';

/** Semaines complètes, de la plus ancienne à la plus récente. */
const weeks = (stepsPerWeek, over = {}) =>
  stepsPerWeek.map((avgSteps) => ({
    elapsedDays: 7,
    stepsDays: 7,
    avgSteps,
    recordedDays: 7,
    ...over,
  }));

describe('diagnoseNeat — dérive installée', () => {
  it('détecte l’effondrement réel observé en juin/juillet 2026', () => {
    // Cas terrain : ~16 000 pas/j en juin, ~6 000 en juillet, aucun suivi
    // alimentaire sur la période. C'est précisément ce que l'app n'a pas signalé.
    const d = diagnoseNeat({
      weeklyHistory: weeks([16097, 15800, 16200, 15500, 6080]),
      weightKg: 79,
    });
    expect(d.status).toBe(NEAT.SUSTAINED_DRIFT);
    expect(d.currentSteps).toBe(6080);
    expect(d.kcalImpact).toBeLessThan(-350); // ~0.0005 × 79 kg × −9 819 pas
    expect(d.detail).toContain('coûte moins cher qu’une coupe alimentaire');
  });

  it('rattrape une érosion lente que le seuil semaine-à-semaine laisse passer', () => {
    // Chaque semaine perd ~12 % : jamais sous le seuil de 15 % semaine-à-semaine,
    // mais −33 % au total contre la ligne de base.
    const serie = [16000, 14000, 12250, 10700];
    for (let i = 1; i < serie.length; i++) {
      expect(serie[i] / serie[i - 1]).toBeGreaterThan(0.85); // aucune chute brutale
    }
    const d = diagnoseNeat({ weeklyHistory: weeks(serie), weightKg: 79 });
    expect(d.status).toBe(NEAT.SUSTAINED_DRIFT);
  });
});

describe('diagnoseNeat — chute brutale', () => {
  it('déclenche sous le seuil de la spec (85 % de la semaine précédente)', () => {
    // Sous sa ligne de base ET en chute franche depuis la semaine passée
    const d = diagnoseNeat({ weeklyHistory: weeks([12000, 11000, 13000, 10500]), weightKg: 80 });
    expect(d.status).toBe(NEAT.ACUTE_DROP);
    expect(d.detail).toContain('la semaine dernière');
  });

  it('ne déclenche pas sur une variation ordinaire', () => {
    const d = diagnoseNeat({ weeklyHistory: weeks([12000, 12000, 11200]), weightKg: 80 });
    expect(d.status).toBe(NEAT.STABLE);
  });

  it('ne crie pas au loup après une semaine exceptionnelle', () => {
    // 18 000 pas une semaine (rando, déménagement…), puis retour au niveau
    // habituel : −22 % semaine à semaine, mais aucun problème réel.
    const d = diagnoseNeat({ weeklyHistory: weeks([12000, 12000, 18000, 14000]), weightKg: 80 });
    expect(d.status).not.toBe(NEAT.ACUTE_DROP);
  });
});

describe('diagnoseNeat — garde-fous', () => {
  it('exige deux semaines complètes exploitables', () => {
    expect(diagnoseNeat({ weeklyHistory: weeks([12000]) }).status).toBe(NEAT.INSUFFICIENT_DATA);
    expect(diagnoseNeat({ weeklyHistory: [] }).status).toBe(NEAT.INSUFFICIENT_DATA);
  });

  it('refuse de statuer si la dernière semaine manque de données de montre', () => {
    // Sans ce garde-fou, l'app jugerait la semaine d'AVANT et afficherait
    // « Activité stable » sur des chiffres périmés.
    const h = weeks([16000, 15000, 6000]);
    h[2].stepsDays = NEAT_MIN_DAYS - 1;
    const d = diagnoseNeat({ weeklyHistory: h });
    expect(d.status).toBe(NEAT.INSUFFICIENT_DATA);
    expect(d.detail).toContain('Dernière semaine complète');
  });

  it('ignore une semaine creuse plus ancienne sans bloquer le diagnostic', () => {
    const h = weeks([16000, 15000, 16000, 6000]);
    h[1].stepsDays = NEAT_MIN_DAYS - 1; // trou au milieu, mais semaine courante OK
    expect(diagnoseNeat({ weeklyHistory: h, weightKg: 79 }).status).toBe(NEAT.SUSTAINED_DRIFT);
  });

  it('écarte la semaine en cours, encore incomplète', () => {
    const h = weeks([12000, 12000, 12000]);
    h.push({ elapsedDays: 2, stepsDays: 2, avgSteps: 3000, recordedDays: 2 });
    expect(diagnoseNeat({ weeklyHistory: h }).status).toBe(NEAT.STABLE);
  });

  it('ne chiffre pas l’impact calorique sans poids connu', () => {
    const d = diagnoseNeat({ weeklyHistory: weeks([16000, 16000, 16000, 6000]) });
    expect(d.status).toBe(NEAT.SUSTAINED_DRIFT);
    expect(d.kcalImpact).toBeNull();
    expect(d.detail).not.toContain('kcal');
  });

  it('fonctionne sans aucun suivi alimentaire', () => {
    // Cas de juin 2026 : montre active, zéro repas loggé. La porte d'adhérence
    // du protocole de plateau bloquerait — celle-ci ne doit pas.
    const h = weeks([16000, 16000, 16000, 6000], { recordedDays: 0 });
    expect(diagnoseNeat({ weeklyHistory: h, weightKg: 79 }).status).toBe(NEAT.SUSTAINED_DRIFT);
  });
});

describe('diagnoseNeat — remontée', () => {
  it('signale aussi une reprise nette de l’activité', () => {
    const d = diagnoseNeat({ weeklyHistory: weeks([6000, 6000, 6000, 12000]), weightKg: 79 });
    expect(d.status).toBe(NEAT.IMPROVING);
    expect(d.kcalImpact).toBeGreaterThan(0);
  });
});
