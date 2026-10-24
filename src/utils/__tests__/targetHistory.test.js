import { describe, it, expect } from 'vitest';
import { settingsAt, targetResolver, recordSettingsChange } from '../targetHistory.js';
import { calculateWeeklyBalance, dayTarget } from '../mathUtils.js';
import { computePresetTargets, resolveTargets, presetSwitchMessage } from '../presetUtils.js';
import { sanitizeTargetHistory, migrateData, restorableProtocol } from '../../models/protocol.js';

/** n°4 — chaque jour jugé contre les cibles de SA date. */

const T2000 = computePresetTargets('maintenance', 2000); // TRAIN 2200 / OFF 1800 / WE 2040
const T2050 = computePresetTargets('maintenance', 2050); // TRAIN 2250 / OFF 1850
const PRE_CUT = { until: '2026-10-23', presetId: 'maintenance', baseTDEE: 2000, targets: T2000 };
const PHASE = { id: 'm', type: 'medical_stop', start: '2026-08-29', plannedEnd: '2027-03-01', endedAt: null };
const current = resolveTargets({ targets: T2050, presetId: 'maintenance', baseTDEE: 2050 });

const meal = (kcal) => ({ intake: { kcal: String(kcal), protein: '160', carbs: '', fat: '' }, expenditure: {} });

describe('résolution par date', () => {
  it('settingsAt : borne `until` incluse, null au-delà', () => {
    expect(settingsAt('2026-10-23', [PRE_CUT])).toBe(PRE_CUT);
    expect(settingsAt('2026-10-24', [PRE_CUT])).toBeNull();
  });

  it('sans historique : chaque jour reçoit les cibles courantes (comportement antérieur)', () => {
    expect(targetResolver(current, [])('2026-08-12')).toBe(current);
  });

  it('cas réel : avant la coupure 2200/1800, puis cible unique 2050 depuis le 24/10', () => {
    const on = targetResolver(current, [PRE_CUT]);
    expect(dayTarget(on, '2026-08-12', null, [PHASE]).kcal).toBe(2200); // mercredi, TRAIN
    expect(dayTarget(on, '2026-08-20', null, [PHASE]).kcal).toBe(1800); // jeudi, OFF
    expect(dayTarget(on, '2026-10-24', null, [PHASE]).kcal).toBe(2050); // cible unique
    expect(dayTarget(on, '2026-11-06', null, [PHASE]).kcal).toBe(2050);
  });

  it('cible unique d’une entrée passée : recalculée depuis SA base, pas la courante', () => {
    const on = targetResolver(current, [PRE_CUT]);
    expect(dayTarget(on, '2026-09-10', null, [PHASE]).kcal).toBe(2000);
  });

  it('une semaine d’août est jugée contre 2200/1800, plus contre 2250/1850', () => {
    // lundi 10/08 TRAIN 2200, mardi 11/08 OFF 1800 — apport pile sur la cible.
    const days = [{ key: '2026-08-10', day: meal(2200) }, { key: '2026-08-11', day: meal(1800) }];
    expect(calculateWeeklyBalance(days, targetResolver(current, [PRE_CUT])).targetGap).toBe(0);
    expect(calculateWeeklyBalance(days, current).targetGap).toBe(-100); // l'ancien défaut
  });
});

describe('recordSettingsChange — figer les réglages sortants', () => {
  const prev = { targets: T2050, presetId: 'maintenance', baseTDEE: 2050, targetHistory: [PRE_CUT] };

  it('fige les réglages sortants jusqu’à HIER, les nouveaux valent dès aujourd’hui', () => {
    const next = recordSettingsChange(prev, { baseTDEE: 2300, targets: computePresetTargets('maintenance', 2300) }, '2026-11-06');
    expect(next.baseTDEE).toBe(2300);
    expect(next.targetHistory).toEqual([
      PRE_CUT,
      { until: '2026-11-05', presetId: 'maintenance', baseTDEE: 2050, targets: T2050 },
    ]);
  });

  it('deux changements le même jour : seul le premier état est figé', () => {
    const once = recordSettingsChange(prev, { presetId: 'cut_light', targets: computePresetTargets('cut_light', 2050) }, '2026-11-06');
    const twice = recordSettingsChange(once, { presetId: 'maintenance', targets: T2050 }, '2026-11-06');
    expect(twice.targetHistory).toHaveLength(2);
    expect(twice.targetHistory[1].presetId).toBe('maintenance');
  });

  it('rien n’est écrit si les cibles ne changent pas, ou si le patch ne les touche pas', () => {
    expect(recordSettingsChange(prev, { targets: T2050 }, '2026-11-06').targetHistory).toEqual([PRE_CUT]);
    expect(recordSettingsChange(prev, { stepsTarget: 9000 }, '2026-11-06').targetHistory).toEqual([PRE_CUT]);
  });

  it('premier changement sans historique : tout le passé garde les réglages d’avant', () => {
    const fresh = { targets: T2000, presetId: 'maintenance', baseTDEE: 2000 };
    const next = recordSettingsChange(fresh, { baseTDEE: 2050, targets: T2050 }, '2026-10-24');
    expect(next.targetHistory).toEqual([PRE_CUT]);
  });
});

describe('rétrocompatibilité', () => {
  it('ancienne sauvegarde sans historique : migration sans erreur, liste vide', () => {
    const old = { days: { '2026-08-10': meal(2200) }, targets: T2000, presetId: 'maintenance', baseTDEE: 2000 };
    const out = migrateData(old);
    expect(out.targetHistory).toEqual([]);
    expect(out.days).toBe(old.days);
  });

  it('restaurer une ancienne sauvegarde laisse l’historique courant intact', () => {
    expect(restorableProtocol({ days: {} })).not.toHaveProperty('targetHistory');
  });

  it('restaurer un fichier qui porte un historique le remplace', () => {
    expect(restorableProtocol({ days: {}, targetHistory: [PRE_CUT] }).targetHistory).toEqual([PRE_CUT]);
  });

  it('entrées invalides écartées, liste triée, une entrée par date', () => {
    const later = { ...PRE_CUT, until: '2026-11-05', baseTDEE: 2050, targets: T2050 };
    const clean = sanitizeTargetHistory([
      later,
      { until: '23/10/2026', presetId: 'x', baseTDEE: 2000, targets: T2000 },
      { ...PRE_CUT, targets: { train: {} } },
      PRE_CUT,
      'n’importe quoi',
    ]);
    expect(clean).toEqual([PRE_CUT, later]);
    expect(sanitizeTargetHistory(undefined)).toEqual([]);
  });
});

describe('changement de preset — confirmation', () => {
  it('cas réel : Sèche légère → Maintenance à base 2000 annonce les cibles par défaut', () => {
    const msg = presetSwitchMessage('cut_light', 'maintenance', 2000);
    expect(msg).toContain('Passer de Sèche légère à Maintenance ?');
    expect(msg).toContain('TRAIN 2200 · OFF 1800 · WE 2040 kcal');
    expect(msg).toContain('Les jours passés gardent leurs cibles.');
  });
  it('pendant une phase sans cyclage : la cible unique', () => {
    expect(presetSwitchMessage('maintenance', 'cut_light', 2050, { cycling: false }))
      .toContain('cible unique 1850 kcal');
  });
  it('depuis des valeurs personnalisées', () => {
    expect(presetSwitchMessage('custom', 'maintenance', 2000)).toContain('Passer de Personnalisé à Maintenance ?');
  });
});

describe('week-end sans cible (avant le 29/07)', () => {
  const t = computePresetTargets('cut_light', 2000);
  const noWE = { ...t, we: { kcal: null, protein: null, carbs: null, fat: null, label: 'WE' } };
  const history = [
    { until: '2026-07-28', presetId: 'cut_light', baseTDEE: 2000, targets: noWE },
    { until: '2026-10-23', presetId: 'cut_light', baseTDEE: 2000, targets: t },
  ];

  it('l’entrée est valide telle quelle', () => {
    expect(sanitizeTargetHistory(history)).toEqual(history);
  });

  it('un samedi de juillet n’est jugé contre aucune cible, des deux côtés de la comparaison', () => {
    const on = targetResolver(current, history);
    // jeu 23/07 OFF 1600, sam 25/07 sans cible.
    const days = [{ key: '2026-07-23', day: meal(1600) }, { key: '2026-07-25', day: meal(3000) }];
    const w = calculateWeeklyBalance(days, on);
    expect(dayTarget(on, '2026-07-25', null).kcal).toBeNull();
    expect(w.comparableDays).toBe(1);
    expect(w.targetGap).toBe(0);
    expect(w.avgKcalTarget).toBe(1600);
  });

  it('dès le 01/08, le week-end est jugé contre 1840', () => {
    expect(dayTarget(targetResolver(current, history), '2026-08-01', null).kcal).toBe(1840);
  });
});
