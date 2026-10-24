import { useMemo } from 'react';
import { extractSignals } from '../utils/adaptiveTDEE.js';
import { DEFAULT_TARGETS, presetWeeklyRate } from '../utils/presetUtils.js';
import { summarizeStatus } from '../utils/vibeStatus.js';
import { isCyclingSuspended } from '../models/protocol.js';
import { toKey } from '../utils/dateUtils.js';
import { usePlateauDiagnosis } from './usePlateauDiagnosis.js';
import { useNeatDrift } from './useNeatDrift.js';
import { useSleepDiagnosis } from './useSleepDiagnosis.js';

/**
 * Verdict unique pour la bande d'état du jour.
 *
 * Rien n'est recalculé ici : on rejoue exactement les mêmes hooks que
 * `WeekView`, avec la même résolution de cibles (`targets ?? DEFAULT_TARGETS`,
 * cf. `useWeekStats`). C'est la condition pour que la bande et l'onglet Semaine
 * ne puissent jamais annoncer deux diagnostics différents.
 *
 * `extractSignals` est ainsi évalué trois fois par rendu (une fois par hook de
 * diagnostic, une fois ici). C'est un balayage de 30 jours en mémoire, déjà
 * payé deux fois par `WeekView` : le mutualiser coûterait une réécriture des
 * deux hooks existants pour un gain non mesurable.
 */
export function useVibeStatus(data, targets) {
  const resolvedTargets = targets ?? DEFAULT_TARGETS;
  const diagnosis = usePlateauDiagnosis(data, resolvedTargets);
  const neat = useNeatDrift(data, resolvedTargets);
  const sleep = useSleepDiagnosis(data, resolvedTargets);
  const signals = useMemo(() => extractSignals(data), [data]);

  // Trajectoire que l'objectif en cours PRÉDIT — la cible que le tracé oppose
  // au poids réel. Elle vient de `presetWeeklyRate`, la même source que le
  // libellé de `PresetPickerCard` : le guide ne peut pas annoncer un rythme
  // différent de celui affiché sur l'écran Cibles.
  const phases = data?.phases;
  const expectedKgPerWeek = useMemo(() => {
    if (data?.baseTDEE == null) return null;
    const cycling = !isCyclingSuspended(toKey(new Date()), phases ?? []);
    return presetWeeklyRate(data.presetId, data.baseTDEE, { cycling }).gramsPerWeek / 1000;
  }, [data?.presetId, data?.baseTDEE, phases]);

  return useMemo(
    () => summarizeStatus({ diagnosis, neat, sleep, signals, expectedKgPerWeek }),
    [diagnosis, neat, sleep, signals, expectedKgPerWeek]
  );
}
