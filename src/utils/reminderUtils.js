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
