import { DIAGNOSIS } from './plateauProtocol.js';
import { NEAT } from './neatDrift.js';

/**
 * Bande d'état — LE VERDICT, PAS LE TABLEAU DE BORD.
 *
 * `plateauProtocol` et `neatDrift` sont l'intelligence du produit, et elle ne
 * vivait que dans `WeekView` : un onglet qu'il faut penser à ouvrir. Le cas
 * d'usage fondateur de R3 est précisément celui qu'on n'ouvre pas — les pas ont
 * chuté de 62 % pendant deux mois sans que rien ne le signale. Un diagnostic qui
 * attend qu'on vienne le chercher n'est pas un diagnostic.
 *
 * Ce module ramène UNE ligne de verdict en haut du jour. Il ne recalcule rien :
 * il arbitre entre des diagnostics déjà produits et réécrit leur `detail` en
 * version courte. Le détail complet reste dans `WeekView`, où la bande renvoie.
 *
 * Règle de non-duplication : la bande n'affiche jamais un chiffre que `WeekView`
 * affiche déjà en grand. Elle affiche la CONCLUSION, plus le couple
 * tendance/TDEE qui, lui, répond à « où j'en suis » sans ouvrir quoi que ce soit.
 */

export const TONE = {
  ALERT: 'alert',
  WARN: 'warn',
  GOOD: 'good',
  IDLE: 'idle',
};

export const STATUS_KIND = {
  NEAT_DRIFT: 'NEAT_DRIFT',
  NEAT_DROP: 'NEAT_DROP',
  NEAT_IMPROVING: 'NEAT_IMPROVING',
  PLATEAU: 'PLATEAU',
  WATER_RETENTION: 'WATER_RETENTION',
  LOW_ADHERENCE: 'LOW_ADHERENCE',
  PROGRESSING: 'PROGRESSING',
  TREND: 'TREND',
};

const fmtInt = (n) => Math.round(n).toLocaleString('fr-FR');

// Signe typographique (U+2212), pas le trait d'union du clavier — cohérent avec
// `neatDrift.js`, et virgule décimale française.
const signedKg = (n) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(2).replace('.', ',')}`;

const kcalSuffix = (kcal) =>
  kcal == null
    ? ''
    : ` — environ ${Math.abs(kcal)} kcal/j de dépense en ${kcal < 0 ? 'moins' : 'plus'}`;

/**
 * Ligne de mesure. Elle répond à « mon état de forme actuel » sans changer
 * d'onglet — mais elle CÈDE la tendance au tracé dès qu'il y en a un : une
 * courbe dit mieux « −0,48 kg/sem » que le texte « −0,48 kg/sem », et le
 * répéter à 3 cm d'écart est exactement la duplication qu'on refusait à une
 * page d'accueil.
 *
 * Tenue sur UNE ligne à 360 px en Azeret Mono 10px. D'où « conf. » abrégé et
 * les séparateurs à une espace.
 */
function buildReadout({ trendPerWeek, tdee, confidence }, hasChart) {
  const parts = [];
  if (!hasChart && trendPerWeek !== null) parts.push(`${signedKg(trendPerWeek)} kg/sem`);
  if (tdee !== null) parts.push(`TDEE ${fmtInt(tdee)} kcal`);
  if (confidence !== null) parts.push(`conf. ${confidence} %`);
  return parts.length > 0 ? parts.join(' · ') : null;
}

/**
 * Prépare le tracé : poids lissé réel contre trajectoire prévue par le preset.
 *
 * C'est le mécanisme central de VibeFit — une valeur CONTRE UNE CIBLE — appliqué
 * à la seule métrique qui y avait échappé. Le guide n'est donc pas un décor :
 * c'est le marqueur de cible de la signature, transposé à une série temporelle.
 * Les deux séries sont la même mesure (kg) sur la même échelle : un seul axe.
 *
 * En maintenance le taux prévu est ~0, le guide est plat — ce qui est
 * exactement la bonne lecture (« tu devrais rester stable »), pas un cas
 * dégénéré à masquer.
 */
function buildTrend(series, expectedKgPerWeek, trendPerWeek) {
  if (!Array.isArray(series) || series.length < 2) return null;
  const first = series[0];
  const last = series[series.length - 1];
  const projected = (x) => first.y + (expectedKgPerWeek * (x - first.x)) / 7;
  const guide =
    expectedKgPerWeek == null
      ? null
      : [{ x: first.x, y: first.y }, { x: last.x, y: projected(last.x) }];

  return {
    points: series,
    guide,
    latestLabel: `${last.y.toFixed(1).replace('.', ',')} kg`,
    // Équivalent textuel du tracé : un lecteur d'écran ne lit pas une courbe.
    // La vue tabulaire de la même donnée existe par ailleurs dans WeekView.
    ariaLabel:
      `Poids lissé sur ${series.length} jours, dernier point ${last.y.toFixed(1)} kilos` +
      (trendPerWeek !== null ? `, tendance ${signedKg(trendPerWeek)} kilo par semaine` : '') +
      (guide ? `, comparé en pointillés à la trajectoire prévue par l’objectif.` : '.'),
  };
}

/**
 * Arbitre un verdict unique entre les deux diagnostics.
 *
 * Ordre de priorité, du plus coûteux au plus anodin :
 *   1. dérive installée du NEAT — des semaines perdues en silence, et le seul
 *      signal qui survit au décrochage du suivi alimentaire ;
 *   2. plateau confirmé ;
 *   3. rétention d'eau — publiée AVANT les avertissements car son rôle est
 *      d'empêcher une coupe calorique injustifiée ; la taire au profit d'un
 *      signal plus alarmant produirait exactement la décision qu'elle bloque ;
 *   4. chute d'activité aiguë — concrète et actionnable, donc devant
 *      l'adhérence, qui ne dit que « je ne peux rien conclure » ;
 *   5. adhérence insuffisante ;
 *   6-7. bonnes nouvelles ;
 *   8-9. repos — la seule ligne de mesure.
 *
 * @param {{diagnosis: Object, neat: Object, signals: Object}} input
 * @returns {{tone, kind, headline, detail, readout}|null} null ⇒ rien à dire,
 *   la bande ne s'affiche pas (installation neuve).
 */
export function summarizeStatus({ diagnosis, neat, signals, expectedKgPerWeek = null } = {}) {
  const trendPerWeek = signals?.weightTrendPerWeek ?? null;
  const tdee = signals?.adaptiveTDEE ?? null;
  // La confiance n'est publiée qu'avec un TDEE : seule, c'est le pourcentage
  // d'un chiffre qu'on n'affiche pas.
  const confidence = tdee !== null ? (signals?.confidence ?? null) : null;
  const trend = buildTrend(signals?.weightSeries, expectedKgPerWeek, trendPerWeek);
  const readout = buildReadout({ trendPerWeek, tdee, confidence }, trend !== null);

  const verdict = (tone, kind, headline, detail) => ({ tone, kind, headline, detail, readout, trend });

  if (neat?.status === NEAT.SUSTAINED_DRIFT) {
    return verdict(
      TONE.ALERT,
      STATUS_KIND.NEAT_DRIFT,
      'Activité en baisse',
      `${fmtInt(neat.currentSteps)} pas/j contre ${fmtInt(neat.baselineSteps)} les semaines d’avant${kcalSuffix(neat.kcalImpact)}.`
    );
  }

  if (diagnosis?.status === DIAGNOSIS.PLATEAU_CONFIRMED) {
    return verdict(
      TONE.ALERT,
      STATUS_KIND.PLATEAU,
      'Plateau confirmé',
      `Poids, TDEE et adhérence stables sur ${diagnosis.weeksEvaluated} semaines. Les trois signaux concordent.`
    );
  }

  if (diagnosis?.status === DIAGNOSIS.WATER_RETENTION_SUSPECTED) {
    return verdict(
      TONE.GOOD,
      STATUS_KIND.WATER_RETENTION,
      'Rétention d’eau',
      'Le poids monte, pas le tour de taille. Ne coupe pas les calories là-dessus.'
    );
  }

  if (neat?.status === NEAT.ACUTE_DROP) {
    return verdict(
      TONE.WARN,
      STATUS_KIND.NEAT_DROP,
      'Chute d’activité',
      `${fmtInt(neat.currentSteps)} pas/j contre ${fmtInt(neat.baselineSteps)} en moyenne${kcalSuffix(neat.kcalImpact)}.`
    );
  }

  if (diagnosis?.status === DIAGNOSIS.LOW_ADHERENCE) {
    return verdict(
      TONE.WARN,
      STATUS_KIND.LOW_ADHERENCE,
      'Suivi incomplet',
      'Trop de jours non saisis pour distinguer un plateau d’un trou dans le suivi.'
    );
  }

  if (diagnosis?.status === DIAGNOSIS.PROGRESSING) {
    return verdict(TONE.GOOD, STATUS_KIND.PROGRESSING, 'Progression en cours', null);
  }

  if (neat?.status === NEAT.IMPROVING) {
    return verdict(
      TONE.GOOD,
      STATUS_KIND.NEAT_IMPROVING,
      'Activité en hausse',
      `${fmtInt(neat.currentSteps)} pas/j contre ${fmtInt(neat.baselineSteps)} en moyenne avant.`
    );
  }

  // Repos : sans le moindre chiffre NI tracé, la bande disparaît plutôt que
  // d'occuper l'écran avec un statut vide au-dessus de la saisie.
  if (readout === null && trend === null) return null;

  if (diagnosis?.status === DIAGNOSIS.INSUFFICIENT_DATA) {
    // `detail` du protocole est déjà la raison exacte du non-verdict, et déjà
    // court — le réécrire ici ferait diverger deux textes qui doivent dire la
    // même chose.
    return verdict(TONE.IDLE, STATUS_KIND.TREND, 'Pas encore de verdict', diagnosis.detail ?? null);
  }

  return verdict(TONE.IDLE, STATUS_KIND.TREND, 'Rien à signaler', null);
}
