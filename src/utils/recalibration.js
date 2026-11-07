import { etaLabel } from './calibrationCopy.js';
import { TDEE_LOW_BMR_FACTOR } from '../constants/config.js';
import { TDEE_CHECK, IMPLAUSIBLE_LABEL, LOW_LABEL, implausibleDetail } from './plausibility.js';

// Au-delà de cet écart, la recalibration est bloquée : un tel saut trahit une
// saisie douteuse bien plus probablement qu'une vraie dérive métabolique.
export const MAX_RECALIBRATION_DELTA = 600;

const fr = (n) => Math.round(n).toLocaleString('fr-FR');

/**
 * Peut-on recalibrer les cibles sur le TDEE mesuré ? Pur : lit les signaux
 * et la base courante, n'écrit rien.
 *
 * Ordre : calibration en cours, puis mesure incohérente — elle prime sur tout
 * le reste, confiance comprise : 100 % de jours saisis ne valident pas un
 * TDEE sous le métabolisme de base —, puis profil incomplet (plancher
 * incalculable, la mesure n'est pas vérifiée), puis TDEE bas (valide, mais
 * il ne propose pas de recalibration à lui seul), puis les blocages ordinaires.
 *
 * @returns {{ blockedReason: string|null, canRecalibrate: boolean, delta: number|null }}
 */
export function recalibrationBlock(signals, baseTDEE) {
  const { adaptiveTDEE, measuredTDEE, tdeeCheck, hasEnoughData, overlapDays, windowStart, excludedDays, calibration } = signals;
  const delta = adaptiveTDEE !== null && baseTDEE !== null ? adaptiveTDEE - baseTDEE : null;

  let blockedReason = null;
  if (calibration?.active) {
    const eta = etaLabel(calibration);
    blockedReason = `Calibration en cours — ${calibration.crossedDays}/${calibration.requiredDays} jours croisant poids et apport` +
      (eta ? ` (${eta})` : '') + `. TDEE de départ : ${calibration.seedTDEE} kcal.`;
  } else if (tdeeCheck?.status === TDEE_CHECK.IMPLAUSIBLE) {
    blockedReason = `${IMPLAUSIBLE_LABEL}. ${capitalize(implausibleDetail(measuredTDEE, tdeeCheck))}.` +
      (baseTDEE !== null ? ` Cibles maintenues sur la dernière base valide : ${fr(baseTDEE)} kcal.` : '');
  } else if (windowStart === null && excludedDays > 0) {
    blockedReason = 'Fenêtre de 14 jours pas encore complète depuis la période non suivie';
  } else if (adaptiveTDEE === null || !hasEnoughData) {
    blockedReason = `Données insuffisantes — ${overlapDays} j croisant poids et apport sur 14`;
  } else if (tdeeCheck?.status === TDEE_CHECK.UNCHECKED) {
    blockedReason = 'Profil incomplet — renseigne sexe, année de naissance et taille pour vérifier la plausibilité de la mesure.';
  } else if (tdeeCheck?.status === TDEE_CHECK.LOW) {
    blockedReason = `${LOW_LABEL} : sous ${fr(tdeeCheck.lowKcal)} kcal (${String(TDEE_LOW_BMR_FACTOR).replace('.', ',')} × métabolisme de base ${fr(tdeeCheck.bmr)} kcal).` +
      ' Pas de recalibration sur cette seule mesure.';
  } else if (delta === 0) {
    blockedReason = 'Cibles déjà alignées sur le TDEE mesuré';
  } else if (Math.abs(delta) > MAX_RECALIBRATION_DELTA) {
    blockedReason = `Écart de ${delta > 0 ? '+' : ''}${delta} kcal — trop important pour être crédible, vérifie tes saisies`;
  }

  return { blockedReason, canRecalibrate: blockedReason === null, delta };
}

const capitalize = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
