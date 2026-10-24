/** Libellés de la tendance longue — virgule décimale, signe typographique. */
export const ddmm = (key) => `${key.slice(8, 10)}/${key.slice(5, 7)}`;
export const fmtKg = (v) => (v == null ? '—' : `${v.toFixed(1).replace('.', ',')} kg`);
export const fmtCm = (v) => (v == null ? '—' : `${v.toFixed(1).replace('.', ',').replace(',0', '')} cm`);
export function fmtGap(v) {
  if (v == null) return '—';
  const r = Math.round(v);
  return `${r > 0 ? '+' : r < 0 ? '−' : ''}${Math.abs(r)} kcal/j`;
}

/**
 * Ligne de lecture de la semaine sélectionnée — tenue sur UNE ligne à
 * 390 px : la date de début seule (« Sem. du » faisait passer « kcal/j » à
 * la ligne), la semaine complète est dans l'aria-label des colonnes.
 */
export function weekReadout(w) {
  if (!w) return '';
  if (w.untracked) return `${ddmm(w.weekStart)} · période non suivie`;
  // Une mesure absente est NOMMÉE : « — · — » ne disait pas quoi manquait.
  const part = (label, v, fmt) => (v == null ? `${label} —` : fmt(v));
  return `${ddmm(w.weekStart)} · ${part('poids', w.weight, fmtKg)} · ${part('taille', w.waist, fmtCm)} · ${part('écart', w.gapPerDay, fmtGap)}`;
}
