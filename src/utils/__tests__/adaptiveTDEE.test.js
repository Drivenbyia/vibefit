import { describe, it, expect } from 'vitest';
import { extractSignals, olsSlope } from '../adaptiveTDEE.js';
import { toKey, addDays } from '../dateUtils.js';

const TODAY = toKey(new Date());
const at = (offset) => addDays(TODAY, offset);

/** Construit un state applicatif depuis des entrées relatives à aujourd'hui. */
function buildData(entries) {
  const days = {};
  for (const { offset, weight, kcal } of entries) {
    days[at(offset)] = {
      weight: weight != null ? String(weight) : '',
      intake: { kcal: kcal != null ? String(kcal) : '' },
    };
  }
  return { days };
}

/**
 * Série à TDEE connu : l'utilisateur mange `intake` kcal/j, son poids évolue
 * exactement selon le déséquilibre énergétique implicite (1 kg = 7700 kcal).
 * C'est la vérité terrain contre laquelle `adaptiveTDEE` doit retomber.
 */
function linearSeries({ days = 30, intake = 2000, tdee = 2550, startWeight = 80 } = {}) {
  const kgPerDay = -(tdee - intake) / 7700;
  return Array.from({ length: days }, (_, i) => ({
    offset: -(days - 1) + i,
    weight: parseFloat((startWeight + kgPerDay * i).toFixed(2)), // précision balance réelle
    kcal: intake,
  }));
}

describe('olsSlope', () => {
  it('retrouve la pente d’une série linéaire', () => {
    expect(olsSlope([{ x: 0, y: 0 }, { x: 1, y: 2 }, { x: 2, y: 4 }])).toBeCloseTo(2, 10);
  });

  it('retourne 0 sur une série constante', () => {
    expect(olsSlope([{ x: 0, y: 5 }, { x: 1, y: 5 }, { x: 2, y: 5 }])).toBeCloseTo(0, 10);
  });

  it('retourne null en deçà de 2 points', () => {
    expect(olsSlope([{ x: 0, y: 1 }])).toBeNull();
    expect(olsSlope([])).toBeNull();
  });

  it('respecte les index réels en présence de trous', () => {
    // x non contigus : une pente de 1 ne doit pas être lue comme 5
    expect(olsSlope([{ x: 0, y: 0 }, { x: 5, y: 5 }, { x: 10, y: 10 }])).toBeCloseTo(1, 10);
  });
});

describe('extractSignals — exactitude du TDEE', () => {
  it('retrouve un TDEE connu sur données parfaites', () => {
    // Vérité terrain : 2550 kcal/j. L'ancienne formule (demi-moyennes ÷ 14)
    // retournait 2259 — une erreur systématique de 291 kcal/j.
    const s = extractSignals(buildData(linearSeries({ tdee: 2550, intake: 2000 })));
    expect(s.hasEnoughData).toBe(true);
    expect(s.adaptiveTDEE).toBeGreaterThanOrEqual(2530);
    expect(s.adaptiveTDEE).toBeLessThanOrEqual(2570);
  });

  it('retombe sur l’apport moyen quand le poids est stable', () => {
    const s = extractSignals(buildData(linearSeries({ tdee: 2000, intake: 2000 })));
    expect(s.adaptiveTDEE).toBeGreaterThanOrEqual(1970);
    expect(s.adaptiveTDEE).toBeLessThanOrEqual(2030);
    expect(s.weightTrendPerWeek).toBeCloseTo(0, 1);
  });

  it('place le TDEE sous l’apport en cas de prise de poids', () => {
    const s = extractSignals(buildData(linearSeries({ tdee: 1800, intake: 2000 })));
    expect(s.adaptiveTDEE).toBeLessThan(s.avgIntake);
    expect(s.adaptiveTDEE).toBeGreaterThanOrEqual(1780);
    expect(s.adaptiveTDEE).toBeLessThanOrEqual(1820);
    expect(s.weightTrendPerWeek).toBeGreaterThan(0);
  });

  it('exprime la tendance en kg/semaine', () => {
    // −550 kcal/j ⇒ −0.0714 kg/j ⇒ −0.5 kg/sem
    const s = extractSignals(buildData(linearSeries({ tdee: 2550, intake: 2000 })));
    expect(s.weightTrendPerWeek).toBeGreaterThanOrEqual(-0.55);
    expect(s.weightTrendPerWeek).toBeLessThanOrEqual(-0.45);
  });
});

describe('extractSignals — garde-fous de données', () => {
  it('refuse de publier un TDEE sous le seuil de recouvrement', () => {
    // 9 jours croisés poids × apport sur 14 : sous MIN_OVERLAP_DAYS = 10
    const s = extractSignals(buildData(linearSeries({ days: 9 })));
    expect(s.overlapDays).toBe(9);
    expect(s.hasEnoughData).toBe(false);
    expect(s.adaptiveTDEE).toBeNull();
  });

  it('ne compte pas les jours où un seul des deux signaux est saisi', () => {
    // 14 jours de poids, mais apport saisi 1 jour sur 2 → recouvrement 7
    const entries = linearSeries({ days: 14 }).map((e, i) =>
      i % 2 === 0 ? e : { ...e, kcal: null }
    );
    const s = extractSignals(buildData(entries));
    expect(s.overlapDays).toBeLessThan(10);
    expect(s.adaptiveTDEE).toBeNull();
  });

  it('survit à un historique très court', () => {
    const s = extractSignals(buildData(linearSeries({ days: 5 })));
    expect(s.adaptiveTDEE).toBeNull();
    expect(s.hasEnoughData).toBe(false);
  });

  it('survit à une absence totale de données', () => {
    for (const input of [{ days: {} }, {}, undefined]) {
      const s = extractSignals(input);
      expect(s.adaptiveTDEE).toBeNull();
      expect(s.smoothedWeight).toBeNull();
      expect(s.weightTrendPerWeek).toBeNull();
      expect(s.avgIntake).toBeNull();
      expect(s.confidence).toBe(0);
    }
  });
});

describe('extractSignals — rejet des aberrations', () => {
  it('écarte un poids hors bornes physiologiques', () => {
    const entries = linearSeries();
    entries[20].weight = 780; // typo 78 → 780
    const s = extractSignals(buildData(entries));
    expect(s.adaptiveTDEE).toBeGreaterThanOrEqual(2530);
    expect(s.adaptiveTDEE).toBeLessThanOrEqual(2570);
  });

  it('écarte un pic isolé resté dans les bornes', () => {
    const entries = linearSeries();
    entries[22].weight = 95; // plausible dans l'absolu, impossible en 1 jour
    const s = extractSignals(buildData(entries));
    expect(s.adaptiveTDEE).toBeGreaterThanOrEqual(2530);
    expect(s.adaptiveTDEE).toBeLessThanOrEqual(2570);
  });

  it('conserve un vrai changement de palier', () => {
    // Deux mesures cohérentes entre elles ne sont pas un pic : test bilatéral
    const entries = linearSeries();
    entries[22].weight = 83;
    entries[23].weight = 83;
    const s = extractSignals(buildData(entries));
    expect(s.interpolatedCount).toBe(0); // aucune des deux n'a été rejetée
  });

  it('écarte un apport calorique aberrant', () => {
    const entries = linearSeries();
    entries[20].kcal = 20000;
    const s = extractSignals(buildData(entries));
    expect(s.avgIntake).toBeLessThan(2100);
  });
});

describe('extractSignals — absence de pesée récente', () => {
  it('n’amortit pas la tendance quand la queue est vide', () => {
    // L'ancien forward-fill remplissait à plat et tirait la pente vers 0.
    const entries = linearSeries().map((e, i) => (i >= 25 ? { ...e, weight: null } : e));
    const s = extractSignals(buildData(entries));
    expect(s.weightTrendPerWeek).toBeGreaterThanOrEqual(-0.55);
    expect(s.weightTrendPerWeek).toBeLessThanOrEqual(-0.45);
  });

  it('rend smoothedWeight null quand aucune pesée n’est à portée du lissage', () => {
    const entries = linearSeries().map((e, i) => (i >= 20 ? { ...e, weight: null } : e));
    const s = extractSignals(buildData(entries));
    expect(s.smoothedWeight).toBeNull();
  });
});

describe('extractSignals — sélection de fenêtre', () => {
  it('privilégie la fenêtre récente à densité comparable', () => {
    const entries = linearSeries();
    // ancienne fenêtre (idx 0–13) : 12/14 ; récente (idx 16–29) : 11/14
    [3, 8].forEach((i) => { entries[i].weight = null; });
    [17, 21, 26].forEach((i) => { entries[i].weight = null; });
    const s = extractSignals(buildData(entries));
    expect(s.windowEnd).toBe(at(0));
    expect(s.windowAgeDays).toBe(0);
  });

  it('signale une fenêtre ancienne quand elle est nettement plus dense', () => {
    // 14 jours pleins il y a un mois, rien depuis : la fenêtre ancienne gagne,
    // mais son ancienneté doit être exposée pour que l'export l'affiche.
    const entries = linearSeries().map((e, i) =>
      i < 14 ? e : { ...e, weight: null, kcal: null }
    );
    const s = extractSignals(buildData(entries));
    expect(s.windowAgeDays).toBeGreaterThan(7);
  });
});
