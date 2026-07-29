import { KCAL_PER_STEP_PER_KG } from '../constants/config.js';

/**
 * R3 — NEAT_DRIFT : détection de l'effondrement de l'activité non sportive.
 *
 * Module indépendant du protocole de plateau, et volontairement NON soumis à sa
 * porte d'adhérence : les pas viennent de la montre et continuent d'être remontés
 * même les semaines où rien n'est loggé côté nutrition. Une chute de NEAT doit
 * pouvoir être signalée précisément quand le suivi alimentaire décroche.
 *
 * Le trigger de la spec (`stepsThisWeek < stepsLastWeek × 0.85`) ne détecte qu'une
 * chute brutale. Une érosion lente lui échappe : 16 000 → 14 000 → 12 250 → 10 700
 * ne déclenche jamais le seuil semaine-à-semaine et finit pourtant à −33 %. D'où
 * la seconde détection, contre une ligne de base pluri-hebdomadaire.
 */

// Chute brutale : semaine courante vs semaine précédente (seuil de la spec)
export const NEAT_DROP_RATIO = 0.85;
// Dérive installée : semaine courante vs moyenne des semaines de référence
export const NEAT_DRIFT_RATIO = 0.8;
// Nombre de semaines composant la ligne de base
export const NEAT_BASELINE_WEEKS = 4;
// Remontée notable, pour signaler aussi les bonnes nouvelles
export const NEAT_RECOVERY_RATIO = 1.15;
// En deçà, la moyenne hebdomadaire de pas n'est pas représentative
export const NEAT_MIN_DAYS = 4;

export const NEAT = {
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
  SUSTAINED_DRIFT: 'SUSTAINED_DRIFT',
  ACUTE_DROP: 'ACUTE_DROP',
  IMPROVING: 'IMPROVING',
  STABLE: 'STABLE',
};

const LABELS = {
  INSUFFICIENT_DATA: 'Pas — données insuffisantes',
  SUSTAINED_DRIFT: 'Activité en baisse installée',
  ACUTE_DROP: 'Chute d’activité cette semaine',
  IMPROVING: 'Activité en hausse',
  STABLE: 'Activité stable',
};

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const fmt = (n) => Math.round(n).toLocaleString('fr-FR');

const result = (status, detail, extra = {}) => ({
  status,
  label: LABELS[status],
  detail,
  currentSteps: null,
  baselineSteps: null,
  kcalImpact: null,
  ...extra,
});

/**
 * @param {{weeklyHistory: Array, weightKg: number|null}} input
 *   weeklyHistory — sortie de computeWeeklyHistory(), plus ancienne → plus récente
 *   weightKg      — poids lissé, pour chiffrer l'impact calorique (null ⇒ non chiffré)
 */
export function diagnoseNeat({ weeklyHistory = [], weightKg = null }) {
  const complete = weeklyHistory.filter((w) => (w?.elapsedDays ?? 7) >= 7);
  const isUsable = (w) => w?.avgSteps != null && w.stepsDays >= NEAT_MIN_DAYS;

  // La DERNIÈRE semaine complète doit être exploitable. Sans ce contrôle, une
  // semaine sans montre ferait juger la précédente et afficher un statut rassurant
  // sur des chiffres périmés.
  const latest = complete[complete.length - 1];
  if (!isUsable(latest)) {
    return result(
      NEAT.INSUFFICIENT_DATA,
      `Dernière semaine complète : ${latest?.stepsDays ?? 0} jour(s) de pas sur ${NEAT_MIN_DAYS} requis.`
    );
  }

  const usable = complete.filter(isUsable);
  if (usable.length < 2) {
    return result(
      NEAT.INSUFFICIENT_DATA,
      `${usable.length} semaine(s) complète(s) avec au moins ${NEAT_MIN_DAYS} jours de pas — il en faut 2.`
    );
  }

  const current = usable[usable.length - 1];
  const previous = usable[usable.length - 2];
  const baselineWeeks = usable.slice(-(NEAT_BASELINE_WEEKS + 1), -1);
  const baseline = mean(baselineWeeks.map((w) => w.avgSteps));

  const kcalFor = (deltaSteps) =>
    weightKg == null ? null : Math.round(deltaSteps * KCAL_PER_STEP_PER_KG * weightKg);

  const vsBaseline = current.avgSteps - baseline;
  const vsPrevious = current.avgSteps - previous.avgSteps;
  const baseRatio = baseline > 0 ? current.avgSteps / baseline : null;
  const prevRatio = previous.avgSteps > 0 ? current.avgSteps / previous.avgSteps : null;

  const common = {
    currentSteps: Math.round(current.avgSteps),
    baselineSteps: Math.round(baseline),
  };
  const kcalLine = (kcal) =>
    kcal == null ? '' : ` Soit environ ${Math.abs(kcal)} kcal/j de dépense ${kcal < 0 ? 'en moins' : 'en plus'}.`;

  // Dérive installée — prioritaire : c'est elle qui coûte des semaines
  if (baseRatio !== null && baseRatio < NEAT_DRIFT_RATIO && baselineWeeks.length >= 2) {
    const kcal = kcalFor(vsBaseline);
    return result(
      NEAT.SUSTAINED_DRIFT,
      `${fmt(current.avgSteps)} pas/j contre ${fmt(baseline)} en moyenne sur les ${baselineWeeks.length} semaines précédentes (−${Math.round((1 - baseRatio) * 100)}%).` +
        kcalLine(kcal) +
        ' Remonter les pas coûte moins cher qu’une coupe alimentaire.',
      { ...common, kcalImpact: kcal }
    );
  }

  // Chute brutale — seuil de la spec, semaine à semaine.
  // Conditionnée à être SOUS sa propre ligne de base : sans ça, redescendre à son
  // niveau habituel après une semaine exceptionnelle déclencherait une alerte,
  // alors qu'il n'y a rien à corriger.
  if (prevRatio !== null && prevRatio < NEAT_DROP_RATIO && (baseRatio === null || baseRatio < 1)) {
    const kcal = kcalFor(vsPrevious);
    return result(
      NEAT.ACUTE_DROP,
      `${fmt(current.avgSteps)} pas/j contre ${fmt(previous.avgSteps)} la semaine dernière (−${Math.round((1 - prevRatio) * 100)}%).` +
        kcalLine(kcal),
      { ...common, kcalImpact: kcal }
    );
  }

  if (baseRatio !== null && baseRatio > NEAT_RECOVERY_RATIO && baselineWeeks.length >= 2) {
    const kcal = kcalFor(vsBaseline);
    return result(
      NEAT.IMPROVING,
      `${fmt(current.avgSteps)} pas/j contre ${fmt(baseline)} en moyenne avant (+${Math.round((baseRatio - 1) * 100)}%).` +
        kcalLine(kcal),
      { ...common, kcalImpact: kcal }
    );
  }

  return result(
    NEAT.STABLE,
    `${fmt(current.avgSteps)} pas/j, en ligne avec les semaines précédentes.`,
    common
  );
}
