import { useMemo } from 'react';
import { dayType } from '../models/day.js';
import { num } from '../utils/mathUtils.js';
import { useQuickEntry } from './useQuickEntry.js';
import { useHealthImport } from './useHealthImport.js';

/**
 * Saisie rapide disponible sur TOUS les onglets : le « + » et son panneau
 * vivent au niveau de l'app et écrivent sur le jour affiché (`dateKey`).
 * Sûr avant chargement : sans cibles résolues, les valeurs de départ
 * retombent sur la dernière mesure connue ou le minimum de la réglette.
 */
export function useAppQuickEntry({ data, setData, dateKey, day, updateDay, dayTargets }) {
  const dt = dayTargets?.[dayType(dateKey, day, data?.phases ?? [])] ?? dayTargets?.off ?? {};
  const targets = useMemo(
    () => ({ kcal: dt.kcal ?? null, protein: dt.protein ?? null, steps: num(data?.stepsTarget) || null }),
    [dt.kcal, dt.protein, data?.stepsTarget]
  );
  const entry = useQuickEntry({
    day, days: data?.days, dateKey, updateDay, targets, scaleResolutionKg: data?.scaleResolutionKg,
  });
  const healthImport = useHealthImport(data?.days ?? {}, setData);
  return { entry, healthImport };
}
