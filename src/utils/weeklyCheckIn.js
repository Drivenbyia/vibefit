import { etaLabel, incompleteLabel } from './calibrationCopy.js';
import { GAP_ON_TARGET_KCAL } from './longTrend.js';
import { ddmm, fmtGap } from './longTrendCopy.js';

/**
 * Bilan du dimanche — module PUR, lecture seule.
 *
 * Inspiré du check-in hebdomadaire des coachs nutritionnels adaptatifs : la
 * semaine écoulée en quelques lignes, puis UNE action. Mais rien ne change
 * tout seul : une recalibration reste proposée, jamais appliquée (opt-in,
 * décision du 2026-07-29). Toutes les entrées sont déjà calculées ailleurs ;
 * ce module ne fait que choisir et formuler.
 *
 * Ordre des actions — la première qui s'applique gagne :
 *   1. calibration en cours (le TDEE en dépend) : les jours à rattraper,
 *      sinon la consigne du jour — jamais « rien à corriger » à 0/14 ;
 *   1bis. aucun tour de taille saisi dans la semaine CALENDAIRE en cours
 *      (lundi ou après — donc toujours vrai pour la semaine courante) ;
 *   2. recalibration disponible (le chiffre le plus structurant) ;
 *   3. protéines sous le plancher au moins 2 jours ;
 *   4. écart à la cible hors ±100 kcal/j ;
 *   5. pas montre sous l'objectif ;
 *   6. rien à corriger.
 */
const fmtInt = (n) => Math.round(n).toLocaleString('fr-FR');
const signedKg = (n) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(1).replace('.', ',')} kg`;

export function weeklyCheckIn({
  week, inProgress = false, waistMissing = false, prevWeek = null, protein = { days: 0, underDays: 0, floor: 160 },
  steps = { avg: null, days: 0 }, stepsTarget = 8000, calibration = null, tdee = null,
}) {
  const lines = [];

  if (week.weight != null) {
    const delta = prevWeek?.weight != null ? week.weight - prevWeek.weight : null;
    lines.push({ label: 'Poids', value: `${week.weight.toFixed(1).replace('.', ',')} kg`,
      note: delta != null ? `${signedKg(delta)} vs sem. préc.` : 'moyenne de la semaine' });
  }
  if (week.gapPerDay != null) {
    lines.push({ label: 'Écart à la cible', value: fmtGap(week.gapPerDay), note: `${week.comparableDays} j comparable${week.comparableDays > 1 ? 's' : ''}` });
  }
  if (protein.days > 0) {
    lines.push({ label: 'Protéines', value: `${protein.days - protein.underDays}/${protein.days} j`, note: `≥ ${protein.floor} g` });
  }
  if (steps.avg != null) {
    lines.push({ label: 'Pas montre', value: `${fmtInt(steps.avg)}/j`, note: `objectif ${fmtInt(stepsTarget)}` });
  }
  if (calibration?.active) {
    // Court : tient sur une ligne à 390 px (« calibration 0/14 » + la date
    // passaient sur deux).
    lines.push({ label: 'Calibration', value: `${calibration.crossedDays}/${calibration.requiredDays} j`,
      note: calibration.earliestCompletion ? `au plus tôt le ${ddmm(calibration.earliestCompletion)}` : '' });
  } else if (tdee?.adaptiveTDEE != null) {
    const d = tdee.delta;
    lines.push({ label: 'TDEE mesuré', value: `${fmtInt(tdee.adaptiveTDEE)} kcal`,
      note: d ? `${d > 0 ? '+' : '−'}${fmtInt(Math.abs(d))} vs cibles` : 'aligné sur les cibles' });
  }

  return { title: `Semaine du ${ddmm(week.weekStart)}${inProgress ? ' · en cours' : ''}`, lines, action: pickAction({ week, waistMissing, protein, steps, stepsTarget, calibration, tdee }) };
}

function pickAction({ week, waistMissing, protein, steps, stepsTarget, calibration, tdee }) {
  if (calibration?.active) {
    const todo = incompleteLabel(calibration, 2);
    if (todo) return { kind: 'calibration', text: `Complète ${todo} : chaque jour croisé rapproche le TDEE mesuré.` };
    const eta = etaLabel(calibration);
    return { kind: 'calibration',
      text: `Calibration ${calibration.crossedDays}/${calibration.requiredDays} : pesée et apport chaque jour${eta ? `, ${eta}` : ''}.` };
  }
  if (waistMissing) {
    return { kind: 'waist', text: 'Mesure ton tour de taille à jeun : aucune mesure cette semaine.' };
  }
  if (tdee?.canRecalibrate) {
    return { kind: 'recalibrate', tab: 'targets',
      text: `Recalibrer est possible : TDEE mesuré ${fmtInt(tdee.adaptiveTDEE)} kcal (${tdee.delta > 0 ? '+' : '−'}${fmtInt(Math.abs(tdee.delta))}). À décider dans Cibles.` };
  }
  if (protein.underDays >= 2) {
    return { kind: 'protein', text: `Protéines sous ${protein.floor} g ${protein.underDays} jours : c'est le premier levier à corriger.` };
  }
  if (week.gapPerDay != null && Math.abs(week.gapPerDay) > GAP_ON_TARGET_KCAL) {
    return { kind: 'gap', text: `Apport ${fmtGap(week.gapPerDay)} ${week.gapPerDay > 0 ? 'au-dessus' : 'en dessous'} de la cible en moyenne : rapproche-toi de ±${GAP_ON_TARGET_KCAL}.` };
  }
  if (steps.avg != null && steps.avg < stepsTarget) {
    return { kind: 'steps', text: `Marche : ${fmtInt(steps.avg)} pas/j pour un objectif de ${fmtInt(stepsTarget)}.` };
  }
  return { kind: 'none', text: 'Rien à corriger cette semaine : continue comme ça.' };
}
