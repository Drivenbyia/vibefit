import { addDays, toKey } from './dateUtils.js';
import { extractSignals } from './adaptiveTDEE.js';
import { TDEE_CHECK, IMPLAUSIBLE_LABEL, implausibleDetail } from './plausibility.js';
import { aggregateSleep, num, nutritionScope, proteinAverage, watchStepsAverage } from './mathUtils.js';
import { computeRecovery } from './recoveryBaseline.js';
import { resolveTargets } from './presetUtils.js';
import { etaLabel } from './calibrationCopy.js';
import { fmtDuration } from './sleepDiagnosis.js';
import { deviceAt, isCyclingSuspended, isReferenceMeasure, measureSource, phaseAt } from '../models/protocol.js';
import { PRESETS, PROTEIN_FLOOR, DEFAULT_STEPS_TARGET, REST_DAY_TYPE, MEASURE_SOURCES } from '../constants/config.js';

/**
 * Bloc « Contexte courant » du rapport — prêt à coller pour un coach.
 *
 * Une ligne par champ, toujours dans le même ordre, et « — » quand la donnée
 * manque : jamais une valeur inventée ni un zéro qui passerait pour une
 * mesure. Aucun verdict sur la VFC et la FC repos (décision du 2026-10-24).
 * Tout est lu dans les calculs existants : ce module ne fait que formater.
 */
const NONE = '—';
const dmy = (key) => key.split('-').reverse().join('/');
const dm = (key) => `${key.slice(8, 10)}/${key.slice(5, 7)}`;
const int = (n) => Math.round(n).toLocaleString('fr-FR');
const one = (n) => n.toFixed(1).replace('.', ',');
const signed = (n) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(2).replace('.', ',')}`;
const nOf = (n, unit) => `${n} ${unit}${n > 1 ? 's' : ''}`;
const BEFORE = 'avant coupure';

/**
 * Dernière coupure (période non suivie) commencée au plus tard aujourd'hui.
 * Une mesure datée d'AVANT son début décrit un autre contexte (autre mode de
 * vie, autre montre parfois) : elle reste publiée, mais marquée.
 */
function lastCut(periods, today) {
  return periods
    .filter((p) => p.type === 'untracked' && p.start <= today)
    .sort((a, b) => (a.start < b.start ? 1 : -1))[0] ?? null;
}

/**
 * « — » enrichi : sans mesure depuis la reprise, la dernière mesure d'avant
 * la coupure, datée et marquée. Jamais une valeur présentée comme actuelle.
 */
function lastBeforeCut(days, cut, read, fmt) {
  if (!cut) return NONE;
  const hit = Object.keys(days)
    .filter((k) => k < cut.start && read(k, days[k]) != null)
    .sort()
    .at(-1);
  return hit ? `${NONE} (dernière : ${fmt(read(hit, days[hit]), hit)} le ${dm(hit)}, ${BEFORE})` : NONE;
}

/** Suffixe d'une moyenne 7 j dont un jour contributeur précède la coupure. */
const mixed = (keys, cut) => (cut && keys.some((k) => k < cut.start) ? ` · inclut des jours ${BEFORE}` : '');

export function formatCoachContext(data, { today = toKey(new Date()) } = {}) {
  const phases = data?.phases ?? [];
  const periods = data?.periods ?? [];
  const devices = data?.devices ?? [];
  const signals = extractSignals(data);
  const targets = resolveTargets({ targets: data?.targets, presetId: data?.presetId, baseTDEE: data?.baseTDEE });
  const last7 = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6))
    .map((key) => ({ key, day: data?.days?.[key] ?? null }));
  const days = data?.days ?? {};
  const cut = lastCut(periods, today);
  const positive = (v) => (num(v) > 0 ? num(v) : null);

  const phase = phaseAt(today, phases);
  const phaseStr = phase
    ? `${phase.label ?? phase.type} depuis le ${dmy(phase.start)}` +
      (phase.plannedEnd ? ` · fin prévue le ${dmy(phase.plannedEnd)}` : '')
    : NONE;

  const presetId = data?.presetId ?? 'maintenance';
  const presetStr = `${presetId === 'custom' ? 'Personnalisé' : (PRESETS[presetId]?.label ?? presetId)}` +
    (data?.baseTDEE ? ` · base ${int(data.baseTDEE)} kcal` : '');

  const calib = signals.calibration;
  let tdeeStr = NONE;
  if (calib?.active) {
    const eta = etaLabel(calib);
    tdeeStr = `calibration ${calib.crossedDays}/${calib.requiredDays} j croisés depuis le ${dmy(calib.start)}` +
      (eta ? ` · ${eta}` : '') + ` · TDEE de départ ${int(calib.seedTDEE)} kcal`;
  } else if (signals.tdeeCheck?.status === TDEE_CHECK.IMPLAUSIBLE) {
    tdeeStr = `${IMPLAUSIBLE_LABEL} · ${implausibleDetail(signals.measuredTDEE, signals.tdeeCheck)}` +
      (signals.windowStart ? ` · fenêtre ${dm(signals.windowStart)} → ${dm(signals.windowEnd)}` : '');
  } else if (signals.adaptiveTDEE != null) {
    tdeeStr = `${int(signals.adaptiveTDEE)} kcal` +
      (signals.tdeeCheck?.status === TDEE_CHECK.UNCHECKED ? ' (non vérifié : profil incomplet)' : '') +
      (signals.windowStart ? ` · fenêtre ${dm(signals.windowStart)} → ${dm(signals.windowEnd)}` : '') +
      ` · confiance ${signals.confidence} %`;
  }

  const cycling = !isCyclingSuspended(today, phases);
  const t = (k) => (targets[k]?.kcal != null ? int(targets[k].kcal) : NONE);
  const targetStr = cycling
    ? `TRAIN ${t('train')} / OFF ${t('off')} / WE ${t('we')} kcal`
    : `cible unique ${t(REST_DAY_TYPE)} kcal/j`;
  const floor = (cycling ? targets.train?.protein : targets[REST_DAY_TYPE]?.protein) ?? PROTEIN_FLOOR;

  const weightStr = signals.smoothedWeight != null
    ? `${one(signals.smoothedWeight)} kg` +
      (signals.weightTrendPerWeek != null ? ` · tendance ${signed(signals.weightTrendPerWeek)} kg/sem` : ' · tendance —')
    : lastBeforeCut(days, cut, (_, d) => positive(d?.weight), (v) => `${one(v)} kg`);

  const waistKeys = Object.keys(days).filter((k) => num(days[k]?.waist) > 0).sort().reverse();
  const sinceResume = cut ? waistKeys.filter((k) => k >= cut.start) : waistKeys;
  const waistStr = sinceResume.length === 0 && waistKeys.length > 0 && cut
    ? lastBeforeCut(days, cut, (_, d) => positive(d?.waist), (v) => `${one(v)} cm`)
    : waistKeys.length > 0
      ? waistKeys.slice(0, 3)
        .map((k) => `${one(num(days[k].waist))} cm (${dm(k)}${cut && k < cut.start ? `, ${BEFORE}` : ''})`)
        .join(' · ')
      : NONE;

  const steps = watchStepsAverage(last7, { devices, periods });
  const stepsTarget = data?.stepsTarget ?? DEFAULT_STEPS_TARGET;
  const stepKeys = last7.filter(({ day }) => num(day?.expenditure?.steps) > 0).map(({ key }) => key);
  const stepsStr = steps.avg != null
    ? `${int(steps.avg)}/j sur ${nOf(steps.days, 'jour')} · objectif ${int(stepsTarget)}${mixed(stepKeys, cut)}`
    : lastBeforeCut(days, cut, (_, d) => positive(d?.expenditure?.steps), (v) => `${int(v)} pas`);

  const scoped7 = nutritionScope(last7, periods);
  const protein = proteinAverage(scoped7);
  const proteinKeys = scoped7.filter(({ day }) => num(day?.intake?.kcal) > 0).map(({ key }) => key);
  const proteinStr = protein.avg != null
    ? `${int(protein.avg)} g/j sur ${nOf(protein.days, 'jour')} · plancher ${int(floor)} g${mixed(proteinKeys, cut)}`
    : lastBeforeCut(days, cut, (_, d) => (num(d?.intake?.kcal) > 0 ? positive(d?.intake?.protein) : null), (v) => `${int(v)} g`);

  const ref = { devices, periods, referenceSource: devices.length > 0 ? deviceAt(today, devices) : null };
  const sleep = aggregateSleep(last7.filter(({ key, day }) => day && isReferenceMeasure(key, day, 'sleep', ref)));
  const sleepKeys = last7.filter(({ key, day }) => num(day?.sleep?.durationMin) > 0 && isReferenceMeasure(key, day, 'sleep', ref)).map(({ key }) => key);
  const sleepStr = sleep.durationMin != null
    ? `${fmtDuration(sleep.durationMin)} sur ${nOf(sleepKeys.length, 'nuit')}${mixed(sleepKeys, cut)}`
    : lastBeforeCut(days, cut, (_, d) => positive(d?.sleep?.durationMin), (v) => fmtDuration(v));

  const rec = computeRecovery(data, { today });
  // Repli avant coupure : la montre est nommée — une VFC Garmin ne se compare
  // pas à une VFC Apple Watch (décision du 2026-10-24).
  const source = (k, d) => {
    const s = measureSource(k, d, 'sleep', devices);
    return s ? `${MEASURE_SOURCES[s] ?? s}, ` : '';
  };
  const recStr = (m, unit, field) => (m.recent != null
    ? `${int(m.recent)} ${unit} sur ${nOf(m.recentNights, 'nuit')} (7 j)` +
      mixed(rec.keys.slice(-7).filter((_, i) => m.values.slice(-7)[i] != null), cut)
    : lastBeforeCut(days, cut, (_, d) => positive(d?.sleep?.[field]),
      (v, k) => `${int(v)} ${unit} (${source(k, days[k]).replace(/, $/, '')})`.replace(' ()', '')));

  return [
    '## Contexte courant',
    `- Date : ${dmy(today)}`,
    `- Phase : ${phaseStr}`,
    `- Preset : ${presetStr}`,
    `- TDEE adaptatif : ${tdeeStr}`,
    `- Cible : ${targetStr}`,
    `- Poids lissé : ${weightStr}`,
    `- Tour de taille (3 dernières mesures) : ${waistStr}`,
    `- Pas montre (7 j) : ${stepsStr}`,
    `- Protéines (7 j) : ${proteinStr}`,
    `- Sommeil (7 j) : ${sleepStr}`,
    `- VFC RMSSD (nuit) : ${recStr(rec.hrv, 'ms', 'hrv')}`,
    `- FC repos : ${recStr(rec.rhr, 'bpm', 'rhr')}`,
    '- (VFC et FC repos : mesures seules, sans verdict.)',
  ];
}
