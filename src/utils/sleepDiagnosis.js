/**
 * Diagnostic de sommeil — module PUR, sans action.
 *
 * Le sommeil était la seule donnée structurée du produit à n'entrer dans aucun
 * diagnostic : quatre champs saisis chaque matin (score, durée, VFC, FC repos),
 * moyennés pour l'affichage, recopiés dans l'export, et jamais confrontés à
 * quoi que ce soit. Une métrique qu'on collecte sans jamais en conclure quelque
 * chose est une corvée de saisie, pas un instrument.
 *
 * Comme `neatDrift`, ce module est VOLONTAIREMENT non soumis à la porte
 * d'adhérence du protocole de plateau : le sommeil vient de la montre et
 * continue d'arriver les semaines où le suivi alimentaire décroche. C'est même
 * précisément là qu'il faut pouvoir parler — un mauvais sommeil dégrade le
 * contrôle alimentaire, donc les semaines où la saisie s'effondre sont les
 * moins bien placées pour rester muettes sur sa cause probable.
 *
 * Deux signaux distincts, qui n'appellent pas la même réponse :
 *   - la DETTE  — une durée moyenne insuffisante, chronique, seuil absolu ;
 *   - la TENSION — VFC et/ou FC repos dégradées CONTRE SA PROPRE ligne de base,
 *     ce qui est un signal de récupération, pas de durée.
 */

// 6 h 30 par nuit. Seuil absolu, pas relatif : une dette ne se juge pas contre
// une habitude — s'habituer à dormir trop peu ne fait pas disparaître le coût.
export const SLEEP_DEBT_MIN = 390;
// En deçà, la moyenne hebdomadaire n'est pas représentative (idem NEAT).
export const SLEEP_MIN_NIGHTS = 4;
// Nombre de semaines composant la ligne de base VFC / FC repos.
export const SLEEP_BASELINE_WEEKS = 4;
// VFC à 15 % sous sa ligne de base — au-delà du bruit nuit à nuit.
export const HRV_STRAIN_RATIO = 0.85;
// FC repos à +5 bpm de sa ligne de base : l'élévation classique en fatigue.
export const RHR_STRAIN_DELTA = 5;
// Retour au-dessus du seuil ET au-dessus de la ligne de base récente.
export const SLEEP_RECOVERY_MIN = 420; // 7 h

export const SLEEP = {
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
  STRAIN: 'STRAIN',
  DEBT: 'DEBT',
  IMPROVING: 'IMPROVING',
  STABLE: 'STABLE',
};

const LABELS = {
  INSUFFICIENT_DATA: 'Sommeil — données insuffisantes',
  STRAIN: 'Récupération dégradée',
  DEBT: 'Dette de sommeil',
  IMPROVING: 'Sommeil en hausse',
  STABLE: 'Sommeil stable',
};

const mean = (xs) => (xs.length > 0 ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** « 6 h 45 », jamais « 405 min » — l'unité lue sur la montre. */
export const fmtDuration = (minutes) => {
  const total = Math.round(minutes);
  return `${Math.floor(total / 60)} h ${String(total % 60).padStart(2, '0')}`;
};

const result = (status, detail, extra = {}) => ({
  status,
  label: LABELS[status],
  detail,
  avgDurationMin: null,
  hrv: null,
  hrvBaseline: null,
  rhr: null,
  rhrBaseline: null,
  ...extra,
});

/**
 * @param {{weeklyHistory: Array}} input
 *   weeklyHistory — sortie de computeWeeklyHistory(), plus ancienne → plus récente
 * @returns {{status, label, detail, avgDurationMin, hrv, hrvBaseline, rhr, rhrBaseline}}
 */
export function diagnoseSleep({ weeklyHistory = [], strainEnabled = true, minStrainBaselineWeeks = 2 } = {}) {
  const complete = weeklyHistory.filter((w) => (w?.elapsedDays ?? 7) >= 7);
  const isUsable = (w) => (w?.sleep?.nights ?? 0) >= SLEEP_MIN_NIGHTS;

  // La DERNIÈRE semaine complète doit être exploitable : sans ce contrôle, une
  // semaine sans montre ferait juger la précédente et publier un statut sur des
  // nuits périmées.
  const latest = complete[complete.length - 1];
  if (!isUsable(latest)) {
    return result(
      SLEEP.INSUFFICIENT_DATA,
      `Dernière semaine complète : ${latest?.sleep?.nights ?? 0} nuit(s) sur ${SLEEP_MIN_NIGHTS} requises.`
    );
  }

  const usable = complete.filter(isUsable);
  const current = usable[usable.length - 1];
  const baselineWeeks = usable.slice(-(SLEEP_BASELINE_WEEKS + 1), -1);

  const avgDurationMin = current.sleep.durationMin;
  const hrv = current.sleep.hrv;
  const rhr = current.sleep.rhr;

  // Lignes de base personnelles : une VFC ne se compare qu'à elle-même. Une
  // valeur de 46 ms n'est ni bonne ni mauvaise dans l'absolu.
  const hrvBaseline = mean(baselineWeeks.map((w) => w.sleep.hrv).filter((v) => v != null));
  const rhrBaseline = mean(baselineWeeks.map((w) => w.sleep.rhr).filter((v) => v != null));

  const common = { avgDurationMin, hrv, hrvBaseline, rhr, rhrBaseline };
  const inDebt = avgDurationMin != null && avgDurationMin < SLEEP_DEBT_MIN;
  const debtSuffix = inDebt && avgDurationMin != null
    ? ` La durée moyenne est aussi basse (${fmtDuration(avgDurationMin)}).`
    : '';

  // 1. TENSION — prioritaire sur la dette : elle décrit l'état de récupération
  // MAINTENANT, et c'est le signal qui doit pouvoir alléger une séance ou
  // bloquer une coupe calorique. Exige une ligne de base, donc du recul.
  //
  // `strainEnabled: false` — VFC et FC repos en AFFICHAGE SEUL, aucun verdict
  // (arrêt médical : ces valeurs relèvent du cardiologue, pas de l'app).
  // `minStrainBaselineWeeks` — semaines de la montre courante exigées : après
  // un changement de montre, la référence se reconstruit avant tout seuil.
  if (strainEnabled && baselineWeeks.length >= minStrainBaselineWeeks) {
    const hrvLow = hrv != null && hrvBaseline != null && hrv < hrvBaseline * HRV_STRAIN_RATIO;
    const rhrHigh = rhr != null && rhrBaseline != null && rhr > rhrBaseline + RHR_STRAIN_DELTA;

    if (hrvLow || rhrHigh) {
      const bits = [];
      if (hrvLow) bits.push(`VFC ${Math.round(hrv)} ms contre ${Math.round(hrvBaseline)} habituels`);
      if (rhrHigh) bits.push(`FC repos ${Math.round(rhr)} bpm contre ${Math.round(rhrBaseline)}`);
      return result(
        SLEEP.STRAIN,
        `${bits.join(' · ')}.${debtSuffix} Récupération dégradée — allège avant de couper les calories.`,
        common
      );
    }
  }

  // 2. DETTE — chronique, seuil absolu.
  if (inDebt) {
    return result(
      SLEEP.DEBT,
      `${fmtDuration(avgDurationMin)} par nuit en moyenne, sous les ${fmtDuration(SLEEP_DEBT_MIN)} de référence.` +
        ' Le manque de sommeil dégrade le contrôle alimentaire avant de dégrader les séances.',
      common
    );
  }

  // 3. Bonne nouvelle — signalée comme la remontée des pas l'est.
  const durationBaseline = mean(
    baselineWeeks.map((w) => w.sleep.durationMin).filter((v) => v != null)
  );
  if (
    avgDurationMin != null
    && avgDurationMin >= SLEEP_RECOVERY_MIN
    && durationBaseline != null
    && avgDurationMin > durationBaseline
  ) {
    return result(
      SLEEP.IMPROVING,
      `${fmtDuration(avgDurationMin)} par nuit contre ${fmtDuration(durationBaseline)} les semaines d'avant.`,
      common
    );
  }

  return result(
    SLEEP.STABLE,
    avgDurationMin != null ? `${fmtDuration(avgDurationMin)} par nuit en moyenne.` : 'Rien à signaler.',
    common
  );
}
