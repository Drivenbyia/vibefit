import { PRESETS, KCAL_FLOOR, PROTEIN_FLOOR, KCAL_PER_KG, REST_DAY_TYPE } from '../constants/config.js';
import { toKey, addDays, startOfWeek, dayTypeFromKey } from './dateUtils.js';

export const DEFAULT_TDEE = 2000;

// En deçà, l'écart est sous la résolution de n'importe quelle estimation de TDEE.
const RATE_NOISE_KCAL = 50;

/**
 * Formules kcal de chaque preset, SANS plancher.
 *
 *  Maintenance  : TRAIN = TDEE + 200  / OFF = TDEE - 200   → écart 400
 *  Sèche légère : TRAIN = TDEE        / OFF = TDEE - 400   → écart 400
 *  Sèche forte  : TRAIN = TDEE - 200  / OFF = TDEE - 600   → écart 400
 *  Prise masse  : TRAIN = TDEE + 500  / OFF = TDEE + 100   → écart 400
 *  Diet Break   : TRAIN = TDEE        / OFF = TDEE         → écart 0 (pas de cyclage)
 */
const RAW_FORMULAS = {
  maintenance: (t) => ({ train: t + 200, off: t - 200 }),
  cut_light:   (t) => ({ train: t,       off: t - 400 }),
  cut_strong:  (t) => ({ train: t - 200, off: t - 600 }),
  bulk:        (t) => ({ train: t + 500, off: t + 100 }),
  diet_break:  (t) => ({ train: t,       off: t }),
};

/**
 * Applique le plancher calorique à OFF en PRÉSERVANT l'écart de cyclage.
 *
 * Clamper les deux cibles indépendamment faisait silencieusement s'effondrer le
 * cyclage : un TDEE de 1400 donnait TRAIN = OFF = 1600, supprimant la prémisse
 * centrale du protocole sans le moindre avertissement. En relevant TRAIN du même
 * montant que le plancher relève OFF, l'écart nominal du preset est conservé.
 */
function presetKcal(presetId, tdee) {
  const raw = (RAW_FORMULAS[presetId] ?? RAW_FORMULAS.maintenance)(tdee);
  const off = Math.max(KCAL_FLOOR, raw.off);
  const gap = raw.train - raw.off;
  return { train: Math.max(raw.train, off + gap), off };
}

/**
 * Applique les planchers du protocole à un champ de cible édité à la main.
 *
 * Seul `kcal` avait un garde-fou : les protéines étaient librement réglables à 0
 * sur n'importe quel type de jour, alors que le plancher 160 g est censé
 * s'appliquer TOUS les jours, week-end compris.
 */
export function clampTargetField(field, dayKey, value) {
  if (field === 'kcal' && dayKey !== 'we') return Math.max(KCAL_FLOOR, value);
  if (field === 'protein') return Math.max(PROTEIN_FLOOR, value ?? PROTEIN_FLOOR);
  return value;
}

/**
 * Écart (kcal) dont protéines + lipides dépassent la cible calorique — 0 si cohérent.
 *
 * Dérivé à la volée plutôt que stocké dans les targets : une valeur dérivée
 * persistée se désynchronise dès la première édition manuelle d'un champ.
 */
export function macroConflictKcal(target) {
  if (!target || target.kcal == null) return 0;
  const residual = target.kcal - (target.protein ?? 0) * 4 - (target.fat ?? 0) * 9;
  return residual < 0 ? Math.round(-residual) : 0;
}

/**
 * Calcule les targets complètes d'un preset depuis le TDEE de base.
 * - kcal    : formule presetKcal()
 * - protein : fixe par preset (config)
 * - fat     : fixe par preset (config)
 * - carbs   : absorbe le delta calorique résiduel (min 0)
 */
export function computePresetTargets(presetId, baseTDEE) {
  const configPreset = PRESETS[presetId] ?? PRESETS.maintenance;
  const { train: ct, off: co, we: cw } = configPreset.targets;
  const { train: trainKcal, off: offKcal } = presetKcal(presetId, baseTDEE);

  // Le week-end reçoit la moyenne pondérée des jours de semaine : ni le haut des
  // jours TRAIN, ni le bas des jours OFF. Sans cible, il était mangé au TDEE et
  // diluait le déficit sur 2 jours sur 7 — c'est ce qui rendait les taux annoncés
  // des presets faux d'un facteur ~2, et faussait la comparaison apport/cible.
  // Le champ reste effaçable à la main pour un week-end volontairement libre.
  const { train: nTrain, off: nOff } = nominalWeek();
  const weekdays = nTrain + nOff;
  const weKcal = Math.max(
    KCAL_FLOOR,
    Math.round((nTrain * trainKcal + nOff * offKcal) / weekdays)
  );
  const weFat = Math.round((nTrain * ct.fat + nOff * co.fat) / weekdays);

  const withCarbs = (base, kcal, fat) => ({
    ...base,
    kcal,
    fat,
    carbs: Math.max(0, Math.round((kcal - base.protein * 4 - fat * 9) / 4)),
  });

  return {
    train: withCarbs(ct, trainKcal, ct.fat),
    off: withCarbs(co, offKcal, co.fat),
    we: withCarbs(cw, weKcal, weFat),
  };
}

/**
 * Cibles par défaut — DÉRIVÉES de DEFAULT_TDEE, jamais codées en dur.
 *
 * Les anciennes valeurs littérales (train 2400 / off 1900) n'étaient sur la
 * courbe d'aucun TDEE unique : 2400 implique 2200, 1900 implique 2100. L'app
 * affichait donc « TDEE de base : 2000 » à côté de cibles incohérentes, qui
 * sautaient silencieusement dès le premier changement de preset.
 */
export const DEFAULT_TARGETS = computePresetTargets('maintenance', DEFAULT_TDEE);

/**
 * Cible UNIQUE d'une phase sans cyclage (arrêt médical).
 *
 * Formule validée : MILIEU du cycle, (TRAIN + OFF) / 2, calculé sur les
 * formules BRUTES du preset, puis plancher calorique appliqué directement.
 *   - Pas la moyenne de la semaine-type (3 TRAIN + 2 OFF) : asymétrique, elle
 *     plaçait la Maintenance à TDEE + 40 au lieu du TDEE.
 *   - Pas les cibles cyclées stockées : elles portent la correction de
 *     plancher du cyclage (OFF relevé ⇒ TRAIN relevé), qui n'a plus d'objet
 *     sans cyclage — Sèche forte à 2050 donnerait 1800 au lieu de 1650.
 * Preset « custom » : milieu des cibles TRAIN/OFF saisies, même plancher.
 *
 * Dérivée à la volée, jamais stockée : elle suit le preset et le TDEE.
 */
export function computeSingleTarget(presetId, baseTDEE, targets) {
  const formula = PRESETS[presetId] ? RAW_FORMULAS[presetId] : null;
  let kcalRaw;
  let protein;
  let fat;

  if (formula) {
    const raw = formula(baseTDEE);
    const { train: ct, off: co } = PRESETS[presetId].targets;
    kcalRaw = (raw.train + raw.off) / 2;
    protein = Math.max(ct.protein, co.protein);
    fat = Math.round((ct.fat + co.fat) / 2);
  } else {
    const tr = targets?.train ?? {};
    const of = targets?.off ?? {};
    kcalRaw = tr.kcal != null && of.kcal != null ? (tr.kcal + of.kcal) / 2 : (tr.kcal ?? of.kcal ?? baseTDEE);
    protein = Math.max(tr.protein ?? PROTEIN_FLOOR, of.protein ?? PROTEIN_FLOOR);
    const fats = [tr.fat, of.fat].filter((v) => v != null);
    fat = fats.length > 0 ? Math.round(fats.reduce((a, b) => a + b, 0) / fats.length) : 72;
  }

  protein = Math.max(PROTEIN_FLOOR, protein);
  const kcal = Math.max(KCAL_FLOOR, Math.round(kcalRaw));
  return {
    kcal,
    protein,
    fat,
    carbs: Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4)),
    label: 'UNIQUE',
  };
}

/**
 * Cibles EFFECTIVES : les cibles stockées + la cible unique sous `rest`.
 * Point d'entrée unique pour toute la lecture « cible d'un jour » — c'est ce
 * qui garantit que Today, Semaine et l'export servent le même chiffre.
 */
export function resolveTargets(data) {
  const targets = data?.targets ?? DEFAULT_TARGETS;
  return {
    ...targets,
    [REST_DAY_TYPE]: computeSingleTarget(data?.presetId ?? 'maintenance', data?.baseTDEE ?? DEFAULT_TDEE, targets),
  };
}

/** Composition nominale de la semaine, DÉRIVÉE du calendrier — jamais re-codée. */
function nominalWeek() {
  const start = startOfWeek(toKey(new Date()));
  const counts = { train: 0, off: 0, we: 0 };
  for (let i = 0; i < 7; i++) counts[dayTypeFromKey(addDays(start, i))] += 1;
  return counts;
}

/**
 * Taux réel d'un preset, calculé depuis ses cibles effectives.
 *
 * Les jours SANS cible (week-end à `kcal: null`) sont supposés mangés au TDEE :
 * ils diluent le déficit sur 2 jours sur 7 et ne peuvent pas être ignorés. Les
 * libellés figés de `config.js` les ignoraient et annonçaient donc des taux
 * faux d'un facteur ~2 (« Sèche forte : perte ~500 g/sem » pour 234 g réels).
 */
export function presetWeeklyRate(presetId, baseTDEE, { cycling = true } = {}) {
  // Sans cyclage, la semaine est 7 fois la cible unique : le taux est l'écart
  // de cette cible au TDEE, sans composition de semaine à pondérer.
  if (!cycling) {
    const kcalPerDay = computeSingleTarget(presetId, baseTDEE).kcal - baseTDEE;
    return { kcalPerDay, gramsPerWeek: Math.round(((kcalPerDay * 7) / KCAL_PER_KG) * 1000) };
  }
  const targets = computePresetTargets(presetId, baseTDEE);
  const week = nominalWeek();
  const kcalFor = (k) => targets[k]?.kcal ?? baseTDEE; // pas de cible ⇒ au TDEE

  const totalDays = week.train + week.off + week.we;
  const weekly =
    week.train * kcalFor('train') + week.off * kcalFor('off') + week.we * kcalFor('we');
  const deltaWeek = weekly - baseTDEE * totalDays;

  return {
    kcalPerDay: Math.round(deltaWeek / totalDays),
    gramsPerWeek: Math.round((deltaWeek / KCAL_PER_KG) * 1000),
  };
}

/** Libellé lisible du taux réel — remplace les `sub` chiffrés figés. */
export function presetRateLabel(presetId, baseTDEE, options) {
  const { kcalPerDay, gramsPerWeek } = presetWeeklyRate(presetId, baseTDEE, options);
  const sign = kcalPerDay >= 0 ? '+' : '−';
  const abs = Math.abs(kcalPerDay);

  if (abs < RATE_NOISE_KCAL) return `Maintien · ${sign}${abs} kcal/j`;
  return `${sign}${abs} kcal/j · ${kcalPerDay > 0 ? 'gain' : 'perte'} ~${Math.abs(gramsPerWeek)} g/sem`;
}

/**
 * Retrouve le TDEE de base depuis les targets et le presetId stockés.
 * Utilisé au bootstrap pour les utilisateurs sans `baseTDEE` en store.
 */
export function deriveBaseTDEE(presetId, targets) {
  const trainKcal = targets?.train?.kcal;
  if (trainKcal == null) return DEFAULT_TDEE;
  switch (presetId) {
    case 'maintenance': return trainKcal - 200;
    case 'cut_light':   return trainKcal;
    case 'cut_strong':  return trainKcal + 200;
    case 'bulk':        return trainKcal - 500;
    case 'diet_break':  return trainKcal;
    default:            return trainKcal - 200;
  }
}

const presetName = (id) => (id === 'custom' ? 'Personnalisé' : (PRESETS[id]?.label ?? id));

/**
 * Message de confirmation d'un changement de preset.
 *
 * Un tap sur une carte de preset remplaçait les cibles sur-le-champ, sans
 * confirmation ni trace : c'est ainsi qu'une Sèche légère à base 2000 a pu
 * devenir Maintenance aux cibles par défaut (2200/1800/2040) sans que rien ne
 * le signale. Le message nomme les deux presets et les nouvelles cibles, et
 * rappelle que le passé garde les siennes (historique des cibles).
 *
 * `cycling: false` (phase sans cyclage) : on annonce la cible unique.
 */
export function presetSwitchMessage(fromId, toId, baseTDEE, { cycling = true } = {}) {
  const next = computePresetTargets(toId, baseTDEE);
  const what = cycling
    ? `TRAIN ${next.train.kcal} · OFF ${next.off.kcal} · WE ${next.we.kcal} kcal`
    : `cible unique ${computeSingleTarget(toId, baseTDEE, next).kcal} kcal`;
  return `Passer de ${presetName(fromId)} à ${presetName(toId)} ?\n\n` +
    `Nouvelles cibles dès aujourd'hui : ${what}.\n` +
    `Les jours passés gardent leurs cibles.`;
}
