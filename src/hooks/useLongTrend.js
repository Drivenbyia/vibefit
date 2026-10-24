import { useMemo, useState } from 'react';
import { computeLongTrend } from '../utils/longTrend.js';

/**
 * Tendance longue (lecture seule) et semaine sélectionnée au tap. La
 * sélection est un état d'affichage, jamais écrit dans les données.
 * Par défaut : la dernière semaine qui porte une mesure.
 */
export function useLongTrend(data, targets) {
  const weeks = useMemo(() => computeLongTrend(data, targets), [data, targets]);
  const lastWithData = useMemo(() => {
    for (let i = weeks.length - 1; i >= 0; i -= 1) {
      const w = weeks[i];
      if (w.weight != null || w.waist != null || w.gapPerDay != null) return i;
    }
    return weeks.length - 1;
  }, [weeks]);
  const [picked, setPicked] = useState(null);
  return { weeks, selected: picked ?? lastWithData, select: setPicked };
}
