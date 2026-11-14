import { useMemo, useCallback } from 'react';
import { dayChecklist, yesterdayGap } from '../utils/dayCompleteness.js';

/**
 * Liste de saisie du jour affiché, et rattrapage d'hier (jour courant seul).
 * `jumpTo` amène la carte concernée à l'écran et place le curseur dans son
 * premier champ — les cartes portent l'ancre `entry-<id>`.
 */
export function useEntryChecklist(data, dateKey, day, isToday) {
  const items = useMemo(() => dayChecklist(day), [day]);
  const yesterday = useMemo(
    () => (isToday ? yesterdayGap(data, dateKey) : null),
    [isToday, data, dateKey]
  );
  const jumpTo = useCallback((id) => {
    const el = document.getElementById(`entry-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.querySelector('input')?.focus({ preventScroll: true });
  }, []);
  return { items, yesterday, jumpTo };
}
