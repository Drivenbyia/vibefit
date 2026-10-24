import { toKey, startOfWeek, addDays, fmtFr } from './dateUtils.js';
import { extractSignals } from './adaptiveTDEE.js';
import { PRESETS, DEFAULT_STEPS_TARGET, MEASURE_SOURCES } from '../constants/config.js';
import { isExcluded, measureSource, isCyclingSuspended } from '../models/protocol.js';
import { computeSingleTarget, DEFAULT_TDEE } from './presetUtils.js';

/**
 * Ligne de protocole : le réglage sur lequel tourne l'app au moment de l'export.
 *
 * Sans elle, le rapport publiait des mesures sans dire à quoi elles étaient
 * censées obéir — un lecteur extérieur (ou un coach) devait deviner le preset
 * et les cibles, ou se fier à des chiffres mémorisés qui périment dès la
 * première recalibration. Les cibles sont LUES depuis le state, jamais
 * recalculées : la source de vérité reste `data.targets`.
 */
export function formatProtocol(data) {
  const presetId = data?.presetId ?? 'maintenance';
  const label = PRESETS[presetId]?.label ?? presetId;
  const t = data?.targets ?? {};

  const kcal = (k) => (t[k]?.kcal != null ? `${Math.round(t[k].kcal)}` : '—');
  // Le plancher protéines est le même sur les trois types de jour ; on publie
  // celui de TRAIN, en repli sur OFF si des cibles anciennes sont incomplètes.
  const protein = t.train?.protein ?? t.off?.protein ?? null;
  const steps = data?.stepsTarget ?? DEFAULT_STEPS_TARGET;

  // Phase sans cyclage : la cible servie est la cible unique, pas TRAIN/OFF.
  // Publier les cibles cyclées ferait lire au cardiologue ou au coach des
  // chiffres que l'app n'applique pas.
  if (isCyclingSuspended(toKey(new Date()), data?.phases ?? [])) {
    const single = computeSingleTarget(presetId, data?.baseTDEE ?? DEFAULT_TDEE, t);
    return (
      `🎯 Preset : ${label} | Cible unique : ${single.kcal} kcal/j (cyclage TRAIN/OFF suspendu)` +
      ` · protéines ${single.protein} g` +
      ` | Objectif pas : ${Number(steps).toLocaleString('fr-FR')}/j`
    );
  }

  return (
    `🎯 Preset : ${label} | Cibles : TRAIN ${kcal('train')} / OFF ${kcal('off')}` +
    ` / WE ${kcal('we')} kcal` +
    (protein != null ? ` · protéines ${Math.round(protein)} g` : '') +
    ` | Objectif pas : ${Number(steps).toLocaleString('fr-FR')}/j`
  );
}

const fmtDayFr = (key) => key.split('-').reverse().join('/');

/**
 * Lignes de contexte daté : phases, coupures, chronologie des montres.
 *
 * Un lecteur extérieur (cardiologue, coach) doit savoir sans deviner que le
 * TDEE ignore une période, et qu'une VFC d'octobre ne vient pas de la même
 * montre qu'une VFC d'août. Aucune ligne si la liste est vide : un state sans
 * protocole daté produit le même rapport qu'avant.
 */
export function formatContext(data) {
  const lines = [];
  for (const ph of data?.phases ?? []) {
    const end = ph.endedAt
      ? `clôturée le ${fmtDayFr(ph.endedAt)}`
      : ph.plannedEnd ? `fin prévue le ${fmtDayFr(ph.plannedEnd)}` : 'sans fin prévue';
    lines.push(`🩺 Phase : ${ph.label ?? ph.type} depuis le ${fmtDayFr(ph.start)} · ${end}`);
  }
  for (const p of data?.periods ?? []) {
    lines.push(
      `⛔ ${p.label ?? 'Période non suivie'} : ${fmtDayFr(p.start)} → ${fmtDayFr(p.end)}` +
      ` — exclue des calculs (${p.scope ?? 'nutrition'})`
    );
  }
  const devices = data?.devices ?? [];
  if (devices.length > 0) {
    const bits = devices.map((d) => {
      const name = MEASURE_SOURCES[d.source] ?? d.source;
      if (d.from && d.to) return `${name} du ${fmtDayFr(d.from)} au ${fmtDayFr(d.to)}`;
      if (d.to) return `${name} jusqu’au ${fmtDayFr(d.to)}`;
      if (d.from) return `${name} depuis le ${fmtDayFr(d.from)}`;
      return name;
    });
    lines.push(`⌚ Montre : ${bits.join(' · ')}`);
  }
  return lines;
}

/** Libellé de source entre parenthèses — vide si inconnue. */
const sourceTag = (source) => (source ? ` (${MEASURE_SOURCES[source] ?? source})` : '');

/** Résumé lisible du sommeil saisi — chaîne vide si rien n'est renseigné. */
export function formatSleep(sleep) {
  if (!sleep) return '';
  const bits = [];
  if (sleep.score) bits.push(`score ${sleep.score}`);
  if (sleep.durationMin) {
    const t = parseInt(sleep.durationMin, 10);
    if (!isNaN(t) && t > 0) bits.push(`${Math.floor(t / 60)}h${String(t % 60).padStart(2, '0')}`);
  }
  if (sleep.hrv) bits.push(`VFC ${sleep.hrv} ms`);
  if (sleep.rhr) bits.push(`FC repos ${sleep.rhr} bpm`);
  return bits.join(' · ');
}

/**
 * Un jour porte-t-il la moindre information ?
 *
 * Prédicat UNIQUE, partagé par la ligne du jour et par le test de la semaine.
 * Les deux avaient divergé : la semaine ignorait le sommeil, si bien qu'une
 * semaine où seules les nuits étaient renseignées s'annonçait « aucune donnée
 * saisie » alors que le rapport contenait ses relevés.
 */
function hasAnyData(day) {
  return Boolean(
    day && (
      day.intake?.kcal || day.workout || day.expenditure?.kcal || day.expenditure?.steps
      || day.weight || day.waist || day.heavyWork || day.notes || formatSleep(day.sleep)
    )
  );
}

function formatDay(key, day, data) {
  const label = fmtFr(key);
  const sleepStr = formatSleep(day?.sleep);
  const devices = data?.devices ?? [];
  // Marque de coupure : le lecteur doit voir qu'un jour vide de la période
  // n'est pas un oubli, et qu'un jour renseigné n'entre pas dans le TDEE.
  const cut = isExcluded(key, data?.periods ?? []) ? ' _(période non suivie)_' : '';

  if (!hasAnyData(day)) return `- **${label}**${cut} : Aucune donnée saisie`;

  const parts = [];
  if (day.intake?.kcal) {
    parts.push(
      `Apport: ${Math.round(day.intake.kcal)} kcal` +
      ` (P: ${Math.round(day.intake.protein ?? 0)}g` +
      ` / G: ${Math.round(day.intake.carbs ?? 0)}g` +
      ` / L: ${Math.round(day.intake.fat ?? 0)}g)`
    );
  }
  if (day.expenditure?.kcal) parts.push(`Dépense: ${Math.round(day.expenditure.kcal)} kcal`);
  if (day.expenditure?.steps) {
    parts.push(
      `Pas: ${Number(day.expenditure.steps).toLocaleString('fr-FR')}` +
      sourceTag(measureSource(key, day, 'steps', devices))
    );
  }
  if (day.workout) parts.push(`Séance: ${day.workout === 'none' ? 'aucune (repos déclaré)' : day.workout}`);
  if (day.heavyWork) parts.push('Chantier: oui');
  if (day.weight) parts.push(`Poids: ${day.weight} kg`);
  if (day.waist) parts.push(`Tour de taille: ${day.waist} cm`);
  if (sleepStr) parts.push(`Sommeil: ${sleepStr}${sourceTag(measureSource(key, day, 'sleep', devices))}`);
  if (day.notes) parts.push(`Notes: ${day.notes}`);

  return `- **${label}**${cut} : ${parts.join(' | ')}`;
}

export function getHistoricalWeeks(data, n = 8) {
  const days = data?.days ?? {};

  // Date locale (cohérente avec les clés de saisie) — pas la date UTC
  const today = toKey(new Date());
  const currentWeekStart = startOfWeek(today);

  const signals = extractSignals(data);
  const tdeeStr = signals.calibration?.active
    ? `calibration en cours (${signals.calibration.crossedDays}/${signals.calibration.requiredDays} j croisés` +
      ` depuis le ${signals.calibration.start}) — TDEE de départ ${signals.calibration.seedTDEE} kcal`
    : signals.adaptiveTDEE !== null
      ? `${signals.adaptiveTDEE} kcal`
      : 'N/A (recouvrement poids × apport insuffisant)';
  const trendStr = signals.weightTrendPerWeek !== null
    ? `${signals.weightTrendPerWeek >= 0 ? '+' : ''}${signals.weightTrendPerWeek} kg/sem`
    : 'N/A';
  const intakeStr = signals.avgIntake !== null ? `${signals.avgIntake} kcal` : 'N/A';
  const confidenceStr = `${signals.confidence}% (${signals.overlapDays} j croisés)`;

  const periodStr =
    signals.windowStart && signals.windowEnd
      ? `${signals.windowStart} → ${signals.windowEnd}` +
        (signals.windowAgeDays > 7 ? ` ⚠ fenêtre vieille de ${signals.windowAgeDays} j` : '')
      : signals.excludedDays > 0
        ? 'N/A (aucune fenêtre de 14 j hors période non suivie)'
        : 'N/A';
  // Le nombre de jours de chantier dans la fenêtre qualifie la REPRÉSENTATIVITÉ
  // du TDEE : une fenêtre riche en effort lourd décrit une quinzaine chargée,
  // et recalibrer dessus fixerait des cibles trop hautes pour une quinzaine
  // calme. Publié à côté de la période, jamais loin d'elle.
  const heavyStr = `${signals.heavyWorkDays} j de chantier`;

  const header =
    `⚡ TDEE adaptatif : ${tdeeStr} | Tendance poids : ${trendStr}` +
    ` | Confiance : ${confidenceStr} | Apport moyen : ${intakeStr}` +
    ` | Période : ${periodStr} | ${heavyStr}`;

  const lines = [
    `# Rapport VibeFit — ${n} dernières semaines\n`,
    header,
    formatProtocol(data),
    ...formatContext(data),
    '',
  ];

  for (let w = 0; w < n; w++) {
    const weekStart = startOfWeek(addDays(currentWeekStart, -w * 7));
    const weekDays = Array.from({ length: 7 }, (_, d) => {
      const key = addDays(weekStart, d);
      return { key, day: days[key] ?? null };
    });

    const weekHasData = weekDays.some(({ day }) => hasAnyData(day));

    lines.push(`## Semaine du ${fmtFr(weekStart)}`);

    if (!weekHasData) {
      lines.push('Aucune donnée saisie pour cette semaine');
    } else {
      weekDays.forEach(({ key, day }) => lines.push(formatDay(key, day, data)));
    }

    lines.push('');
  }

  return lines.join('\n');
}
