import { toKey, startOfWeek, addDays, fmtFr } from './dateUtils.js';
import { extractSignals } from './adaptiveTDEE.js';

/** Résumé lisible du sommeil saisi — chaîne vide si rien n'est renseigné. */
export function formatSleep(sleep) {
  if (!sleep) return '';
  const bits = [];
  if (sleep.score) bits.push(`score ${sleep.score}`);
  if (sleep.durationMin) {
    const t = parseInt(sleep.durationMin, 10);
    if (!isNaN(t) && t > 0) bits.push(`${Math.floor(t / 60)}h${String(t % 60).padStart(2, '0')}`);
  }
  if (sleep.hrv) bits.push(`HRV ${sleep.hrv} ms`);
  return bits.join(' · ');
}

function formatDay(key, day) {
  const label = fmtFr(key);
  const sleepStr = formatSleep(day?.sleep);
  const hasData = day && (
    day.intake?.kcal || day.workout || day.expenditure?.steps || day.weight || day.waist || sleepStr
  );

  if (!hasData) return `- **${label}** : Aucune donnée saisie`;

  const parts = [];
  if (day.intake?.kcal) {
    parts.push(
      `Apport: ${Math.round(day.intake.kcal)} kcal` +
      ` (P: ${Math.round(day.intake.protein ?? 0)}g` +
      ` / G: ${Math.round(day.intake.carbs ?? 0)}g` +
      ` / L: ${Math.round(day.intake.fat ?? 0)}g)`
    );
  }
  if (day.expenditure?.kcal) parts.push(`Dépense: ${Math.round(day.expenditure.kcal)} kcal`);
  if (day.expenditure?.steps) parts.push(`Pas: ${Number(day.expenditure.steps).toLocaleString('fr-FR')}`);
  if (day.workout) parts.push(`Séance: ${day.workout === 'none' ? 'aucune (repos déclaré)' : day.workout}`);
  if (day.weight) parts.push(`Poids: ${day.weight} kg`);
  if (day.waist) parts.push(`Tour de taille: ${day.waist} cm`);
  if (sleepStr) parts.push(`Sommeil: ${sleepStr}`);
  if (day.notes) parts.push(`Notes: ${day.notes}`);

  return `- **${label}** : ${parts.join(' | ')}`;
}

export function getHistoricalWeeks(data, n = 8) {
  const days = data?.days ?? {};

  // Date locale (cohérente avec les clés de saisie) — pas la date UTC
  const today = toKey(new Date());
  const currentWeekStart = startOfWeek(today);

  const signals = extractSignals(data);
  const tdeeStr = signals.adaptiveTDEE !== null
    ? `${signals.adaptiveTDEE} kcal`
    : 'N/A (recouvrement poids × apport insuffisant)';
  const trendStr = signals.weightTrendPerWeek !== null
    ? `${signals.weightTrendPerWeek >= 0 ? '+' : ''}${signals.weightTrendPerWeek} kg/sem`
    : 'N/A';
  const intakeStr = signals.avgIntake !== null ? `${signals.avgIntake} kcal` : 'N/A';
  const confidenceStr = `${signals.confidence}% (${signals.overlapDays} j croisés)`;

  const periodStr =
    signals.windowStart && signals.windowEnd
      ? `${signals.windowStart} → ${signals.windowEnd}` +
        (signals.windowAgeDays > 7 ? ` ⚠ fenêtre vieille de ${signals.windowAgeDays} j` : '')
      : 'N/A';
  const header =
    `⚡ TDEE adaptatif : ${tdeeStr} | Tendance poids : ${trendStr}` +
    ` | Confiance : ${confidenceStr} | Apport moyen : ${intakeStr}` +
    ` | Période : ${periodStr}`;

  const lines = [`# Rapport VibeFit — ${n} dernières semaines\n`, header, ''];

  for (let w = 0; w < n; w++) {
    const weekStart = startOfWeek(addDays(currentWeekStart, -w * 7));
    const weekDays = Array.from({ length: 7 }, (_, d) => {
      const key = addDays(weekStart, d);
      return { key, day: days[key] ?? null };
    });

    const hasAnyData = weekDays.some(({ day }) =>
      day && (day.intake?.kcal || day.workout || day.expenditure?.steps || day.weight || day.waist)
    );

    lines.push(`## Semaine du ${fmtFr(weekStart)}`);

    if (!hasAnyData) {
      lines.push('Aucune donnée saisie pour cette semaine');
    } else {
      weekDays.forEach(({ key, day }) => lines.push(formatDay(key, day)));
    }

    lines.push('');
  }

  return lines.join('\n');
}
