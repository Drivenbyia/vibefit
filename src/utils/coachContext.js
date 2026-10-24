import { addDays, toKey } from './dateUtils.js';
import { extractSignals } from './adaptiveTDEE.js';
import { aggregateSleep, num, nutritionScope, proteinAverage, watchStepsAverage } from './mathUtils.js';
import { computeRecovery } from './recoveryBaseline.js';
import { resolveTargets } from './presetUtils.js';
import { etaLabel } from './calibrationCopy.js';
import { fmtDuration } from './sleepDiagnosis.js';
import { deviceAt, isCyclingSuspended, isReferenceMeasure, phaseAt } from '../models/protocol.js';
import { PRESETS, PROTEIN_FLOOR, DEFAULT_STEPS_TARGET, REST_DAY_TYPE } from '../constants/config.js';

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

export function formatCoachContext(data, { today = toKey(new Date()) } = {}) {
  const phases = data?.phases ?? [];
  const periods = data?.periods ?? [];
  const devices = data?.devices ?? [];
  const signals = extractSignals(data);
  const targets = resolveTargets({ targets: data?.targets, presetId: data?.presetId, baseTDEE: data?.baseTDEE });
  const last7 = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6))
    .map((key) => ({ key, day: data?.days?.[key] ?? null }));

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
  } else if (signals.adaptiveTDEE != null) {
    tdeeStr = `${int(signals.adaptiveTDEE)} kcal` +
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
    : NONE;

  const waists = Object.entries(data?.days ?? {})
    .filter(([, d]) => num(d?.waist) > 0)
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .slice(0, 3)
    .map(([key, d]) => `${one(num(d.waist))} cm (${dm(key)})`);
  const waistStr = waists.length > 0 ? waists.join(' · ') : NONE;

  const steps = watchStepsAverage(last7, { devices, periods });
  const stepsTarget = data?.stepsTarget ?? DEFAULT_STEPS_TARGET;
  const stepsStr = steps.avg != null
    ? `${int(steps.avg)}/j sur ${nOf(steps.days, 'jour')} · objectif ${int(stepsTarget)}`
    : NONE;

  const protein = proteinAverage(nutritionScope(last7, periods));
  const proteinStr = protein.avg != null
    ? `${int(protein.avg)} g/j sur ${nOf(protein.days, 'jour')} · plancher ${int(floor)} g`
    : NONE;

  const ref = { devices, periods, referenceSource: devices.length > 0 ? deviceAt(today, devices) : null };
  const sleep = aggregateSleep(last7.filter(({ key, day }) => day && isReferenceMeasure(key, day, 'sleep', ref)));
  const nightsWithDuration = last7.filter(({ key, day }) => num(day?.sleep?.durationMin) > 0 && isReferenceMeasure(key, day, 'sleep', ref)).length;
  const sleepStr = sleep.durationMin != null ? `${fmtDuration(sleep.durationMin)} sur ${nOf(nightsWithDuration, 'nuit')}` : NONE;

  const rec = computeRecovery(data, { today });
  const recStr = (m, unit) => (m.recent != null
    ? `${int(m.recent)} ${unit} sur ${nOf(m.recentNights, 'nuit')} (7 j)`
    : NONE);

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
    `- VFC RMSSD (nuit) : ${recStr(rec.hrv, 'ms')}`,
    `- FC repos : ${recStr(rec.rhr, 'bpm')}`,
    '- (VFC et FC repos : mesures seules, sans verdict.)',
  ];
}
