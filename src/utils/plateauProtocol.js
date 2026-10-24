/**
 * Protocole anti-rationalisation — diagnostic PUR, sans action.
 *
 * Ce module ne modifie jamais les cibles caloriques. Il croise tendance TDEE,
 * poids lissé et adhérence, puis publie un statut. Les actions automatisées
 * (R2–R6 de la spec) restent gelées : elles exigent un backtesting préalable
 * à 80 % de déclenchements pertinents.
 *
 * Principe directeur : un écart d'adhérence ne doit JAMAIS pouvoir se présenter
 * comme un plateau métabolique. La porte d'adhérence passe donc avant tout.
 */

// --- Seuils ---
// 5 j/7 : en deçà, la moyenne hebdomadaire n'est plus représentative.
export const ADHERENCE_MIN_DAYS = 5;
// 70 % de recouvrement poids × apport sur la fenêtre TDEE.
export const ADHERENCE_MIN_CONFIDENCE = 70;
// 3 semaines : durée minimale pour que les variations d'eau corporelle se moyennent.
export const PLATEAU_MIN_WEEKS = 3;
// 0.3 kg/sem ≈ bruit de rétention hydrique normal, sous le seuil de détection fiable.
export const PLATEAU_WEIGHT_NOISE_KG = 0.3;
// 100 kcal ≈ marge d'erreur résiduelle de l'estimateur OLS sur 14 points.
export const PLATEAU_TDEE_DRIFT_KCAL = 100;
// 1 cm : le tour de taille se mesure à ±0.5 cm près.
export const WAIST_NOISE_CM = 1;

const KCAL_PER_KG = 7700;

export const DIAGNOSIS = {
  CALIBRATING: 'CALIBRATING',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
  LOW_ADHERENCE: 'LOW_ADHERENCE',
  WATER_RETENTION_SUSPECTED: 'WATER_RETENTION_SUSPECTED',
  PLATEAU_CONFIRMED: 'PLATEAU_CONFIRMED',
  PROGRESSING: 'PROGRESSING',
};

const LABELS = {
  CALIBRATING: 'Calibration en cours',
  INSUFFICIENT_DATA: 'Données insuffisantes',
  LOW_ADHERENCE: 'Adhérence insuffisante',
  WATER_RETENTION_SUSPECTED: 'Rétention d’eau probable',
  PLATEAU_CONFIRMED: 'Plateau confirmé',
  PROGRESSING: 'Progression en cours',
};

const result = (status, detail, weeksEvaluated) => ({
  status,
  label: LABELS[status],
  detail,
  weeksEvaluated,
});

/** TDEE implicite d'une semaine : apport moyen − déséquilibre énergétique journalier. */
function impliedTDEE(week, prevWeek) {
  if (week?.avgIntake == null || week?.avgWeight == null || prevWeek?.avgWeight == null) {
    return null;
  }
  const kgPerDay = (week.avgWeight - prevWeek.avgWeight) / 7;
  return week.avgIntake - kgPerDay * KCAL_PER_KG;
}

const spread = (values) => (values.length >= 2 ? Math.max(...values) - Math.min(...values) : null);

/**
 * @param {{signals: Object, weeklyHistory: Array}} input
 *   signals       — sortie de extractSignals()
 *   weeklyHistory — sortie de computeWeeklyHistory(), plus ancienne → plus récente
 * @returns {{status, label, detail, weeksEvaluated}}
 */
export function diagnose({ signals, weeklyHistory = [] }) {
  // Seules les semaines COMPLÈTES sont jugées : la semaine en cours a moins de
  // 7 jours écoulés, et la compter ferait passer tout début de semaine pour un
  // défaut d'adhérence. (`elapsedDays` absent ⇒ semaine déjà complète.)
  const complete = weeklyHistory.filter((w) => (w?.elapsedDays ?? 7) >= 7);
  // Coupure : seules les semaines complètes POSTÉRIEURES à la dernière semaine
  // touchée par une période non suivie sont jugées. Une semaine coupée n'est
  // ni un défaut d'adhérence, ni un point de comparaison — le TDEE implicite
  // calculé entre une semaine d'août et une semaine d'octobre n'a pas de sens.
  const lastCutIdx = complete.map((w) => (w?.excludedDays ?? 0) > 0).lastIndexOf(true);
  // Les semaines commencées AVANT le début d'une calibration ne sont pas
  // jugées non plus : le TDEE a été remis à zéro à cette date.
  const calibStart = signals?.calibration?.start ?? null;
  const sinceCut = complete
    .slice(lastCutIdx + 1)
    .filter((w) => calibStart === null || w.weekStart == null || w.weekStart >= calibStart);
  const cutSuffix = lastCutIdx >= 0 ? ' depuis la période non suivie' : '';
  // Une semaine de recul supplémentaire sert à calculer le TDEE implicite
  // de la plus ancienne semaine évaluée.
  const tail = sinceCut.slice(-(PLATEAU_MIN_WEEKS + 1));
  const recent = tail.length > PLATEAU_MIN_WEEKS ? tail.slice(1) : tail;
  const weeksEvaluated = recent.length;

  // 1. Porte de données — priorité absolue (R1 de la spec)
  // 0. Calibration en cours — remplace tout diagnostic : un verdict posé sur
  // un TDEE qu'on ne publie pas encore n'aurait rien sur quoi s'appuyer.
  const calib = signals?.calibration;
  if (calib?.active) {
    return result(
      DIAGNOSIS.CALIBRATING,
      `${calib.crossedDays}/${calib.requiredDays} jours croisant poids et apport depuis le ${calib.start.split('-').reverse().join('/')}.` +
        ` TDEE de départ : ${calib.seedTDEE} kcal en attendant.`,
      weeksEvaluated
    );
  }

  // Reprise après une coupure : tant qu'aucune fenêtre complète de 14 jours
  // n'existe après elle, le compte « 0 jour croisé » serait faux — des jours
  // ont bien été saisis, c'est la fenêtre qui n'est pas encore formée.
  if (signals?.windowStart == null && (signals?.excludedDays ?? 0) > 0) {
    return result(
      DIAGNOSIS.INSUFFICIENT_DATA,
      'Fenêtre de 14 jours pas encore complète depuis la période non suivie.',
      weeksEvaluated
    );
  }
  if (!signals?.hasEnoughData || signals?.adaptiveTDEE == null) {
    return result(
      DIAGNOSIS.INSUFFICIENT_DATA,
      `${signals?.overlapDays ?? 0} jours croisant poids et apport sur 14 — il en faut 10 pour estimer un TDEE.`,
      weeksEvaluated
    );
  }
  if (weeksEvaluated < PLATEAU_MIN_WEEKS) {
    return result(
      DIAGNOSIS.INSUFFICIENT_DATA,
      `${weeksEvaluated} semaine(s) complète(s) d’historique${cutSuffix} — il en faut ${PLATEAU_MIN_WEEKS} pour conclure.`,
      weeksEvaluated
    );
  }

  // 2. Porte d'adhérence — un écart de saisie n'est jamais un plateau
  if (signals.confidence < ADHERENCE_MIN_CONFIDENCE) {
    return result(
      DIAGNOSIS.LOW_ADHERENCE,
      `Confiance ${signals.confidence}% (< ${ADHERENCE_MIN_CONFIDENCE}%) — trop de jours non croisés pour diagnostiquer quoi que ce soit.`,
      weeksEvaluated
    );
  }
  const weak = recent.filter((w) => w.recordedDays < ADHERENCE_MIN_DAYS);
  if (weak.length > 0) {
    const worst = Math.min(...weak.map((w) => w.recordedDays));
    return result(
      DIAGNOSIS.LOW_ADHERENCE,
      `${weak.length} semaine(s) sous ${ADHERENCE_MIN_DAYS} jours saisis (minimum observé : ${worst}/7). Impossible de distinguer un plateau d’un défaut de suivi.`,
      weeksEvaluated
    );
  }

  // Signaux croisés
  const weights = recent.map((w) => w.avgWeight).filter((v) => v != null);
  if (weights.length < 2) {
    return result(
      DIAGNOSIS.INSUFFICIENT_DATA,
      'Moins de deux semaines avec des pesées — la tendance de poids est indéterminable.',
      weeksEvaluated
    );
  }
  const weeklyRate = (weights[weights.length - 1] - weights[0]) / (weights.length - 1);

  const waists = recent.map((w) => w.avgWaist).filter((v) => v != null);
  const waistDelta = waists.length >= 2 ? waists[waists.length - 1] - waists[0] : null;
  const waistStable = waistDelta === null ? null : Math.abs(waistDelta) < WAIST_NOISE_CM;

  const tdees = [];
  for (let i = 0; i < tail.length - 1; i++) {
    const v = impliedTDEE(tail[i + 1], tail[i]);
    if (v !== null) tdees.push(v);
  }
  const tdeeSpread = spread(tdees);

  // 3. Rétention d'eau (R6) — bloque toute conclusion de plateau.
  // Poids en hausse sans hausse du tour de taille : ce n'est pas de la masse grasse.
  if (weeklyRate > PLATEAU_WEIGHT_NOISE_KG && waistStable === true) {
    return result(
      DIAGNOSIS.WATER_RETENTION_SUSPECTED,
      `Poids +${weeklyRate.toFixed(2)} kg/sem mais tour de taille stable (${waistDelta >= 0 ? '+' : ''}${waistDelta.toFixed(1)} cm). Rétention d’eau probable — ne pas couper les calories sur ce signal.`,
      weeksEvaluated
    );
  }

  // 4. Plateau : les trois signaux stables SIMULTANÉMENT
  if (tdeeSpread === null) {
    return result(
      DIAGNOSIS.INSUFFICIENT_DATA,
      'TDEE hebdomadaire non calculable sur la période — pesées ou apports manquants.',
      weeksEvaluated
    );
  }

  const weightStable = Math.abs(weeklyRate) < PLATEAU_WEIGHT_NOISE_KG;
  const tdeeStable = tdeeSpread < PLATEAU_TDEE_DRIFT_KCAL;

  if (weightStable && tdeeStable) {
    return result(
      DIAGNOSIS.PLATEAU_CONFIRMED,
      `Poids ${weeklyRate >= 0 ? '+' : ''}${weeklyRate.toFixed(2)} kg/sem, TDEE stable à ±${Math.round(tdeeSpread)} kcal, adhérence ≥ ${ADHERENCE_MIN_DAYS} j/sem sur ${weeksEvaluated} semaines. Les trois signaux concordent.`,
      weeksEvaluated
    );
  }

  return result(
    DIAGNOSIS.PROGRESSING,
    `Poids ${weeklyRate >= 0 ? '+' : ''}${weeklyRate.toFixed(2)} kg/sem, TDEE variant de ${Math.round(tdeeSpread)} kcal. Pas de plateau : au moins un signal bouge encore.`,
    weeksEvaluated
  );
}
