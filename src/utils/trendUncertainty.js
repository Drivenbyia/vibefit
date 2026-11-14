import { KCAL_PER_KG, SCALE_RESOLUTIONS, DEFAULT_SCALE_RESOLUTION, TREND_MAX_CI95_KCAL, TREND_GOOD_CI95_KCAL } from '../constants/config.js';

/** Résolution de la balance (kg) : une des valeurs admises, sinon le défaut. */
export const sanitizeScaleResolution = (v) =>
  SCALE_RESOLUTIONS.includes(v) ? v : DEFAULT_SCALE_RESOLUTION;

// Quantiles t de Student à 97,5 % (intervalle bilatéral à 95 %), ddl 1 → 30.
// Sur 14 points, 1,96 sous-estimerait l'intervalle de ~10 %.
const T975 = [12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228,
  2.201, 2.179, 2.160, 2.145, 2.131, 2.120, 2.110, 2.101, 2.093, 2.086,
  2.080, 2.074, 2.069, 2.064, 2.060, 2.056, 2.052, 2.048, 2.045, 2.042];
const t975 = (df) => (df >= 1 && df <= 30 ? T975[df - 1] : 1.96);

/**
 * Erreur standard d'une pente (kg/j), bruit de quantification inclus :
 * σ² = résidus/(n − 2) + résolution²/12, SE = σ / √Σ(x − x̄)².
 *
 * Sans `givenSlope` : droite des moindres carrés. Avec : résidus autour de
 * cette pente (Theil-Sen), ordonnée à l'origine = médiane de y − pente·x.
 * La formule OLS sert alors d'approximation de l'erreur — Theil-Sen a une
 * efficacité proche (~91 %) sous bruit gaussien.
 *
 * Seuls les points MESURÉS comptent : un poids interpolé n'est pas une
 * observation, il gonflerait n et rétrécirait l'intervalle à tort.
 *
 * @param {{x: number, y: number}[]} points — x = index réel du jour
 * @returns {{ slope, se, df } | null} null sous 3 points ou x tous égaux
 */
export function slopeWithError(points, resolutionKg, givenSlope = null) {
  const n = points.length;
  if (n < 3) return null;
  const mx = points.reduce((a, p) => a + p.x, 0) / n;
  const my = points.reduce((a, p) => a + p.y, 0) / n;
  let sxx = 0;
  let sxy = 0;
  for (const p of points) {
    sxx += (p.x - mx) ** 2;
    sxy += (p.x - mx) * (p.y - my);
  }
  if (sxx === 0) return null;
  const slope = givenSlope ?? sxy / sxx;
  const predict = givenSlope === null
    ? (x) => my + slope * (x - mx)
    : ((a) => (x) => a + slope * x)(medianOf(points.map((p) => p.y - slope * p.x)));
  let ssr = 0;
  for (const p of points) ssr += (p.y - predict(p.x)) ** 2;
  const variance = ssr / (n - 2) + (resolutionKg ** 2) / 12;
  return { slope, se: Math.sqrt(variance / sxx), df: n - 2 };
}

function medianOf(values) {
  const s = [...values].sort((a, b) => a - b);
  const n = s.length;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
}

/** Demi-largeur de l'intervalle à 95 % sur le TDEE (kcal/j), arrondie. */
export function tdeeCi95(fit) {
  if (!fit) return null;
  return Math.round(t975(fit.df) * fit.se * KCAL_PER_KG);
}

/** Précision de la mesure, issue de l'intervalle. */
export const PRECISION = { GOOD: 'good', MEDIUM: 'medium', POOR: 'poor' };
export const PRECISION_LABELS = { good: 'bonne', medium: 'moyenne', poor: 'insuffisante' };

export function precisionOf(ci95) {
  if (ci95 == null) return null;
  if (ci95 <= TREND_GOOD_CI95_KCAL) return PRECISION.GOOD;
  if (ci95 <= TREND_MAX_CI95_KCAL) return PRECISION.MEDIUM;
  return PRECISION.POOR;
}

export const isReadable = (ci95) => ci95 != null && ci95 <= TREND_MAX_CI95_KCAL;

export const UNREADABLE_LABEL = 'Tendance pas encore lisible';

const EXTENSION_CAUSES = {
  atypical: 'jour atypique',
  cut: 'reprise après coupure',
  implausible: 'elle donnerait un TDEE incohérent',
};

/**
 * Pourquoi la fenêtre ne s'allonge pas — « fenêtre non allongée (jour
 * atypique du 24/10) ». Chaîne vide si rien ne bloque.
 */
export function extensionBlockedLabel(blocked) {
  if (!blocked) return '';
  const cause = EXTENSION_CAUSES[blocked.reason] ?? blocked.reason;
  const date = blocked.date && blocked.reason !== 'implausible'
    ? ` du ${blocked.date.slice(8, 10)}/${blocked.date.slice(5, 7)}` : '';
  return `fenêtre non allongée (${cause}${date})`;
}

const fr = (n) => Math.round(n).toLocaleString('fr-FR');

/** « ~1 924 kcal (±491) » — jamais un chiffre sec. */
export const fmtTDEE = (tdee, ci95) =>
  `~${fr(tdee)} kcal` + (ci95 != null ? ` (±${fr(ci95)})` : '');

/** « ±491 kcal (insuffisante) » */
export const fmtPrecision = (ci95) =>
  ci95 == null ? '—' : `±${fr(ci95)} kcal (${PRECISION_LABELS[precisionOf(ci95)]})`;
