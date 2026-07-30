import { describe, it, expect } from 'vitest';
import { summarizeStatus, TONE, STATUS_KIND } from '../vibeStatus.js';
import { DIAGNOSIS } from '../plateauProtocol.js';
import { NEAT } from '../neatDrift.js';

const diag = (status, over = {}) => ({ status, label: '', detail: '', weeksEvaluated: 3, ...over });
const neat = (status, over = {}) => ({
  status, label: '', detail: '', currentSteps: null, baselineSteps: null, kcalImpact: null, ...over,
});
const signals = (over = {}) => ({
  weightTrendPerWeek: -0.42, adaptiveTDEE: 2551, confidence: 86, hasEnoughData: true, ...over,
});

describe('summarizeStatus — arbitrage entre les deux diagnostics', () => {
  it('publie la dérive du NEAT avant tout le reste', () => {
    // Le cas fondateur de R3 : les pas s'effondrent PENDANT que le suivi
    // alimentaire décroche. C'est l'adhérence qui l'emporterait sans priorité.
    const s = summarizeStatus({
      diagnosis: diag(DIAGNOSIS.LOW_ADHERENCE),
      neat: neat(NEAT.SUSTAINED_DRIFT, { currentSteps: 6080, baselineSteps: 15899, kcalImpact: -388 }),
      signals: signals(),
    });
    expect(s.tone).toBe(TONE.ALERT);
    expect(s.kind).toBe(STATUS_KIND.NEAT_DRIFT);
    // Séparateur de milliers fr-FR = espace fine insécable (U+202F), pas U+0020.
    expect(s.detail).toContain('6 080');
    expect(s.detail).toContain('388 kcal/j de dépense en moins');
  });

  it('publie la rétention d’eau même face à une chute d’activité', () => {
    // Son rôle est d'empêcher une coupe calorique injustifiée : la taire au
    // profit d'un signal plus alarmant produirait la décision qu'elle bloque.
    const s = summarizeStatus({
      diagnosis: diag(DIAGNOSIS.WATER_RETENTION_SUSPECTED),
      neat: neat(NEAT.ACUTE_DROP, { currentSteps: 7000, baselineSteps: 9000 }),
      signals: signals(),
    });
    expect(s.kind).toBe(STATUS_KIND.WATER_RETENTION);
    expect(s.tone).toBe(TONE.GOOD);
    expect(s.detail).toContain('Ne coupe pas les calories');
  });

  it('fait passer une chute d’activité concrète avant « je ne peux rien conclure »', () => {
    const s = summarizeStatus({
      diagnosis: diag(DIAGNOSIS.LOW_ADHERENCE),
      neat: neat(NEAT.ACUTE_DROP, { currentSteps: 7000, baselineSteps: 9000, kcalImpact: -79 }),
      signals: signals(),
    });
    expect(s.kind).toBe(STATUS_KIND.NEAT_DROP);
    expect(s.tone).toBe(TONE.WARN);
  });

  it('remonte le plateau confirmé en alerte', () => {
    const s = summarizeStatus({
      diagnosis: diag(DIAGNOSIS.PLATEAU_CONFIRMED, { weeksEvaluated: 4 }),
      neat: neat(NEAT.STABLE),
      signals: signals(),
    });
    expect(s.tone).toBe(TONE.ALERT);
    expect(s.detail).toContain('4 semaines');
  });
});

describe('summarizeStatus — ligne de mesure', () => {
  it('compose tendance, TDEE et confiance', () => {
    const s = summarizeStatus({
      diagnosis: diag(DIAGNOSIS.PROGRESSING),
      neat: neat(NEAT.STABLE),
      signals: signals(),
    });
    expect(s.tone).toBe(TONE.GOOD);
    expect(s.readout).toContain('−0,42 kg/sem');
    expect(s.readout).toContain('TDEE');
    expect(s.readout).toContain('conf. 86 %');
    // Une seule ligne à 390 px — cf. buildReadout.
    expect(s.readout.length).toBeLessThanOrEqual(44);
  });

  it('préfixe une prise de poids d’un plus', () => {
    const s = summarizeStatus({
      diagnosis: diag(DIAGNOSIS.PROGRESSING),
      neat: neat(NEAT.STABLE),
      signals: signals({ weightTrendPerWeek: 0.31 }),
    });
    expect(s.readout).toContain('+0,31 kg/sem');
  });

  it('tait la confiance quand il n’y a pas de TDEE à qualifier', () => {
    const s = summarizeStatus({
      diagnosis: diag(DIAGNOSIS.INSUFFICIENT_DATA, { detail: '8 jours croisés sur 14.' }),
      neat: neat(NEAT.INSUFFICIENT_DATA),
      signals: signals({ adaptiveTDEE: null, hasEnoughData: false, confidence: 57 }),
    });
    expect(s.readout).toBe('−0,42 kg/sem');
    expect(s.readout).not.toContain('conf.');
  });

  it('reprend mot pour mot la raison du non-verdict du protocole', () => {
    // Réécrire ce texte ici ferait diverger deux messages qui doivent dire la
    // même chose sur deux écrans.
    const s = summarizeStatus({
      diagnosis: diag(DIAGNOSIS.INSUFFICIENT_DATA, { detail: '2 semaine(s) d’historique — il en faut 3.' }),
      neat: neat(NEAT.INSUFFICIENT_DATA),
      signals: signals({ adaptiveTDEE: null, hasEnoughData: false }),
    });
    expect(s.tone).toBe(TONE.IDLE);
    expect(s.headline).toBe('Pas encore de verdict');
    expect(s.detail).toBe('2 semaine(s) d’historique — il en faut 3.');
  });
});

describe('summarizeStatus — silence', () => {
  it('ne renvoie rien sur une installation neuve', () => {
    // Aucun chiffre à montrer : la bande disparaît au lieu d'occuper l'écran
    // avec un statut vide au-dessus de la saisie.
    const s = summarizeStatus({
      diagnosis: diag(DIAGNOSIS.INSUFFICIENT_DATA, { weeksEvaluated: 0 }),
      neat: neat(NEAT.INSUFFICIENT_DATA),
      signals: signals({ weightTrendPerWeek: null, adaptiveTDEE: null, hasEnoughData: false }),
    });
    expect(s).toBeNull();
  });

  it('ne casse pas sans argument', () => {
    expect(summarizeStatus()).toBeNull();
  });
});
