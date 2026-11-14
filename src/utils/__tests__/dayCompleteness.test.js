import { describe, it, expect } from 'vitest';
import { dayChecklist, yesterdayGap } from '../dayCompleteness.js';
import { emptyDay } from '../../models/day.js';

const full = { ...emptyDay(), weight: '78', intake: { kcal: '1900' }, expenditure: { steps: '8200' }, sleep: { durationMin: '420' } };

describe('dayChecklist', () => {
  it('jour vide : rien de fait, dans l’ordre de la journée', () => {
    expect(dayChecklist(emptyDay()).map((i) => [i.id, i.done])).toEqual(
      [['weight', false], ['sleep', false], ['intake', false], ['steps', false]]
    );
  });
  it('jour complet, et jour absent', () => {
    expect(dayChecklist(full).every((i) => i.done)).toBe(true);
    expect(dayChecklist(undefined).every((i) => !i.done)).toBe(true);
  });
  it('une seule valeur de sommeil suffit ; un zéro ne compte pas', () => {
    expect(dayChecklist({ sleep: { rhr: '58' } })[1].done).toBe(true);
    expect(dayChecklist({ sleep: { score: '0' }, intake: { kcal: '0' } }).some((i) => i.done)).toBe(false);
  });
});

describe('yesterdayGap', () => {
  const today = '2026-11-14';
  it('installation neuve : rien', () => {
    expect(yesterdayGap({ days: {} }, today)).toBeNull();
  });
  it('hier complet : rien', () => {
    expect(yesterdayGap({ days: { '2026-11-13': full } }, today)).toBeNull();
  });
  it('la pesée d’hier ne se réclame pas — elle ne se rattrape pas', () => {
    expect(yesterdayGap({ days: { '2026-11-13': { ...full, weight: '' } } }, today)).toBeNull();
  });
  it('hier sans apport ni pas', () => {
    const data = { days: { '2026-11-13': { ...emptyDay(), weight: '78', sleep: { score: '80' } } } };
    expect(yesterdayGap(data, today)).toEqual({ key: '2026-11-13', missing: ['apport', 'pas'] });
  });
  it('hier jamais ouvert, d’autres jours saisis : tout ce qui se rattrape', () => {
    expect(yesterdayGap({ days: { '2026-11-10': full } }, today)?.missing).toEqual(['sommeil', 'apport', 'pas']);
  });
  it('hier en période non suivie : l’apport n’est pas réclamé', () => {
    const data = {
      days: { '2026-10-20': full },
      periods: [{ id: 'c', type: 'untracked', start: '2026-08-20', end: '2026-11-13', scope: 'nutrition' }],
    };
    expect(yesterdayGap(data, today)?.missing).toEqual(['sommeil', 'pas']);
  });
});
