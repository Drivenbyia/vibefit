import { useState, useMemo, useCallback } from 'react';
import { quickMetric, lastKnown, metricRange, snap, initialDraft } from '../utils/quickEntry.js';

/**
 * Panneau de saisie rapide (« + ») : mesure choisie, valeur en cours sur la
 * réglette, enregistrement. Le brouillon reste local tant que « Enregistrer »
 * n'est pas touché — fermer le panneau n'écrit rien.
 *
 * `targets` : { kcal, protein, steps } du jour affiché.
 */
export function useQuickEntry({ day, days, dateKey, updateDay, targets, scaleResolutionKg }) {
  const [metricId, setMetricId] = useState(null);
  const [draft, setDraft] = useState(0);

  const ctx = useCallback((id) => {
    const metric = quickMetric(id);
    const previous = lastKnown(days, dateKey, metric.read);
    const anchor = metric.read(day) || previous;
    const range = metricRange(metric, { anchor, scaleResolutionKg });
    return { metric, previous, range };
  }, [day, days, dateKey, scaleResolutionKg]);

  const open = useCallback((id = 'kcal') => {
    const { metric, previous, range } = ctx(id);
    setMetricId(metric.id);
    setDraft(initialDraft(metric, { day, previous, target: targets?.[metric.id], range }));
  }, [ctx, day, targets]);

  const close = useCallback(() => setMetricId(null), []);

  const current = useMemo(() => (metricId ? ctx(metricId) : null), [metricId, ctx]);

  const change = useCallback((value) => {
    if (current) setDraft(snap(Number(value), current.range));
  }, [current]);

  const nudge = useCallback((direction) => {
    if (current) setDraft((d) => snap(d + direction * current.range.step, current.range));
  }, [current]);

  const save = useCallback(() => {
    if (!current) return;
    updateDay(current.metric.patch(day, draft));
    setMetricId(null);
  }, [current, day, draft, updateDay]);

  return {
    isOpen: metricId != null,
    metric: current?.metric ?? null,
    range: current?.range ?? null,
    draft,
    open, close, change, nudge, save,
  };
}
