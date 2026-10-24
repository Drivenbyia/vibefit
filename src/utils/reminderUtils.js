/**
 * Rappel hebdo HORS PHASE, adapté à l'objectif du preset.
 *
 * Réécrit le 2026-10-24 : l'ancienne version raisonnait sur le solde
 * « apport − calories totales Garmin » et renvoyait vers la montre en cas
 * d'écart. Les calories de la montre ne pilotent plus rien ; la cible du jour
 * porte déjà le déficit ou le surplus du preset. Le constat se fait donc sur
 * l'ÉCART À LA CIBLE (apport − cible, jours saisis), et l'objectif du preset
 * explique ce que cet écart signifie.
 *
 * Le chiffre (`targetGapReminderCopy`) est affiché à côté ; `hint` n'ajoute
 * que la conséquence propre au preset quand l'écart sort de ±100 kcal/j.
 *
 * @param {string} presetId
 * @param {number} targetGap      — écart cumulé apport − cible (kcal)
 * @param {number} comparableDays — jours saisis comparés à une cible
 * @returns {{ goal: string, hint: string }}
 */
export function weeklyReminderCopy(presetId, targetGap, comparableDays) {
  const perDay = comparableDays > 0 ? targetGap / comparableDays : 0;
  const above = comparableDays > 0 && perDay > ON_TARGET_KCAL;
  const below = comparableDays > 0 && perDay < -ON_TARGET_KCAL;

  if (presetId === 'bulk') {
    return {
      goal: 'Prise de masse : le surplus est déjà inclus dans tes cibles — tenir la cible du jour suffit.',
      hint: below ? ' Sous la cible, le surplus prévu n’est pas atteint.'
        : above ? ' Au-dessus de la cible, le surplus dépasse ce que prévoit le preset.' : '',
    };
  }
  if (presetId === 'cut_light' || presetId === 'cut_strong') {
    return {
      goal: 'Sèche : le déficit est déjà inclus dans tes cibles — tenir la cible du jour suffit.',
      hint: above ? ' Au-dessus de la cible, le déficit prévu fond d’autant.'
        : below ? ' Sous la cible : le plancher reste 1600 kcal et les protéines du preset.' : '',
    };
  }
  if (presetId === 'diet_break') {
    return {
      goal: 'Diet break : apport au niveau du TDEE, sans cyclage.',
      hint: above || below ? ' L’écart éloigne du maintien visé.' : '',
    };
  }
  // maintenance (et preset personnalisé) — cyclage TRAIN/OFF autour du TDEE
  return {
    goal: 'Maintenance : cyclage TRAIN/OFF autour du TDEE — tenir la cible de chaque jour.',
    hint: above || below ? ' L’écart éloigne du maintien visé.' : '',
  };
}

// En deçà, l'écart moyen apport − cible est sous la précision de la saisie.
// Partagé par les rappels de phase et hors phase.
const ON_TARGET_KCAL = 100;
const PHASE_ON_TARGET_KCAL = ON_TARGET_KCAL;

/**
 * Rappel hebdo pendant une phase sans cyclage (arrêt médical).
 *
 * Le rappel ordinaire raisonne sur le SOLDE (apport − calories montre) et
 * parle de recharge les jours TRAIN : deux notions hors sujet ici. Pendant la
 * phase, une seule question a du sens — l'apport moyen tient-il la cible
 * unique ? Comparé sur les jours saisis uniquement (`avgIntake` est la moyenne
 * des jours comparables, déjà calculée hors coupure).
 *
 * @returns {{ lead: string, week: string, hint: string }}
 */
export function phaseReminderCopy({ label, singleKcal, avgIntake, comparableDays }) {
  const lead =
    `${label} : cible unique de ${singleKcal} kcal tous les jours, week-end compris` +
    ' — ni cyclage ni recharge.';

  if (!comparableDays || avgIntake == null) {
    return { lead, week: ' Aucun jour saisi cette semaine pour l’instant.', hint: '' };
  }

  const delta = Math.round(avgIntake - singleKcal);
  const signed = `${delta > 0 ? '+' : delta < 0 ? '−' : ''}${Math.abs(delta)}`;
  const week =
    ` Cette semaine : ${Math.round(avgIntake)} kcal/j en moyenne sur ${comparableDays}` +
    ` jour${comparableDays > 1 ? 's' : ''} saisi${comparableDays > 1 ? 's' : ''} (${signed} kcal).`;

  let hint = ' Dans la cible.';
  if (delta > PHASE_ON_TARGET_KCAL) hint = ' Au-dessus de la cible.';
  if (delta < -PHASE_ON_TARGET_KCAL) hint = ' Sous la cible — le plancher reste 1600 kcal par jour.';
  return { lead, week, hint };
}

const fmtInt = (n) => Math.round(n).toLocaleString('fr-FR');

/**
 * Les deux leviers PRIORITAIRES pendant l'arrêt médical, affichés avant les
 * calories : le plancher de protéines (préserver le muscle sans entraînement)
 * et les pas MONTRE (la marche est la seule dépense d'activité autorisée).
 *
 * `under` ⇒ en dessous de la cible (couleur `warn`) ; `alert` ⇒ alerte écrite
 * en toutes lettres, réservée au plancher de protéines. Aucun jour ⇒ on le
 * dit, sans chiffre.
 *
 * @returns {{ text: string, under: boolean, alert: boolean }[]}
 */
export function phaseLeversCopy({ proteinAvg, proteinDays, proteinFloor, stepsAvg, stepsDays, stepsTarget }) {
  const lines = [];

  if (!proteinDays || proteinAvg == null) {
    lines.push({ text: 'Protéines : aucun jour saisi cette semaine.', under: false, alert: false });
  } else {
    const under = proteinAvg < proteinFloor;
    const n = `${proteinDays} jour${proteinDays > 1 ? 's' : ''}`;
    lines.push({
      text: under
        ? `⚠ Protéines : ${fmtInt(proteinAvg)} g/j en moyenne sur ${n} — sous le plancher de ${proteinFloor} g.`
        : `Protéines : ${fmtInt(proteinAvg)} g/j en moyenne sur ${n} (plancher ${proteinFloor} g).`,
      under,
      alert: under,
    });
  }

  if (!stepsDays || stepsAvg == null) {
    lines.push({ text: 'Pas montre : aucun jour mesuré par la montre cette semaine.', under: false, alert: false });
  } else {
    const under = stepsAvg < stepsTarget;
    const n = `${stepsDays} jour${stepsDays > 1 ? 's' : ''}`;
    lines.push({
      text: `Pas montre : ${fmtInt(stepsAvg)}/j en moyenne sur ${n}` +
        (under ? ` — sous l’objectif de ${fmtInt(stepsTarget)}.` : ` (objectif ${fmtInt(stepsTarget)}).`),
      under,
      alert: false,
    });
  }

  return lines;
}

/**
 * Rappel hors phase, sur l'ÉCART À LA CIBLE (apport − cible des jours saisis)
 * au lieu du solde apport − calories montre. Les calories de la montre ne
 * pilotent plus rien (2026-10-24) ; la cible porte déjà le déficit ou le
 * surplus du preset, l'objectif est donc un écart proche de 0 pour tous.
 */
export function targetGapReminderCopy(targetGap, comparableDays) {
  if (!comparableDays) return 'Aucun jour saisi cette semaine pour l’instant.';
  const perDay = targetGap / comparableDays;
  const signed = `${targetGap > 0 ? '+' : targetGap < 0 ? '−' : ''}${fmtInt(Math.abs(targetGap))}`;
  const verdict = Math.abs(perDay) <= PHASE_ON_TARGET_KCAL
    ? 'Dans la cible.'
    : perDay > 0 ? 'Au-dessus de la cible.' : 'Sous la cible.';
  return `Écart cumulé à la cible : ${signed} kcal sur ${comparableDays} jour${comparableDays > 1 ? 's' : ''} saisi${comparableDays > 1 ? 's' : ''}. ${verdict}`;
}

