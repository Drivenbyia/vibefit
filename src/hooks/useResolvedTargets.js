import { useMemo } from 'react';
import { resolveTargets } from '../utils/presetUtils.js';
import { targetResolver } from '../utils/targetHistory.js';

/**
 * Cibles EFFECTIVES (stockées + cible unique de phase) — une seule source
 * pour l'en-tête, Aujourd'hui et Semaine.
 *
 *   targets    — cibles courantes : Semaine et diagnostics (ils parlent de
 *                maintenant, et résolvent eux-mêmes chaque jour passé).
 *   dayTargets — cibles en vigueur au jour AFFICHÉ : en feuilletant un jour
 *                d'août, l'en-tête et Aujourd'hui montrent la cible d'août.
 */
export function useResolvedTargets(data, dateKey) {
  const targets = useMemo(
    () => resolveTargets({ targets: data.targets, presetId: data.presetId, baseTDEE: data.baseTDEE }),
    [data.targets, data.presetId, data.baseTDEE]
  );
  const dayTargets = useMemo(
    () => targetResolver(targets, data.targetHistory ?? [])(dateKey),
    [targets, data.targetHistory, dateKey]
  );
  return { targets, dayTargets };
}
