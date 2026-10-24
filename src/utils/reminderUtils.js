/**
 * Texte du "Rappel hebdo" adapté au type d'objectif du preset actif.
 * Logique métier pure — aucune dépendance UI.
 */
export function weeklyReminderCopy(presetId, netBalance, recordedDays) {
  if (presetId === 'bulk') {
    return {
      goal: 'Le surplus hebdo cible est ≈ +1900 kcal.',
      hint: netBalance > 0 && netBalance < 1000 && recordedDays > 0
        ? " Continue, c'est bon."
        : netBalance <= 0 && recordedDays > 0
        ? ' Vérifie que tu saisis bien les calories totales Garmin.'
        : netBalance >= 2500
        ? ' Surplus important : surveille la prise de masse pour rester propre.'
        : '',
    };
  }
  if (presetId === 'cut_light' || presetId === 'cut_strong') {
    return {
      goal: 'Le déficit hebdo cible est ≈ −1900 kcal.',
      hint: netBalance > -1000 && netBalance < 0 && recordedDays > 0
        ? " Continue, c'est bon."
        : netBalance >= 0 && recordedDays > 0
        ? ' Vérifie que tu saisis bien les calories totales Garmin.'
        : netBalance <= -2500
        ? ' Déficit important : assure-toi de bien recharger les jours TRAIN.'
        : '',
    };
  }
  // maintenance & diet_break — objectif d'équilibre, pas de cyclage actif
  return {
    goal: "L'objectif est un solde proche de l'équilibre (≈ 0 kcal) — pas de cyclage actif.",
    hint: Math.abs(netBalance) <= 700 && recordedDays > 0
      ? ' Tu es dans la cible, tout va bien.'
      : Math.abs(netBalance) > 1500 && recordedDays > 0
      ? ' Écart marqué par rapport à ton TDEE — vérifie tes saisies Garmin si besoin.'
      : '',
  };
}

// En deçà, l'écart moyen apport − cible est sous la précision de la saisie.
const PHASE_ON_TARGET_KCAL = 100;

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

