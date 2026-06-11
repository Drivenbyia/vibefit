import { STORAGE_KEY } from '../constants/config.js';
import { toKey, startOfWeek, addDays, fmtFr } from './dateUtils.js';
import { extractSignals } from './adaptiveTDEE.js';

function formatDay(key, day) {
  const label = fmtFr(key);
  const hasData = day && (
    day.intake?.kcal || day.workout || day.expenditure?.steps || day.weight || day.waist
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
  if (day.workout) parts.push(`Séance: ${day.workout}`);
  if (day.weight) parts.push(`Poids: ${day.weight} kg`);
  if (day.waist) parts.push(`Tour de taille: ${day.waist} cm`);
  if (day.notes) parts.push(`Notes: ${day.notes}`);

  return `- **${label}** : ${parts.join(' | ')}`;
}

export function getHistoricalWeeks(n = 8) {
  let stored = { days: {} };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) stored = JSON.parse(raw);
  } catch (_) {
    // localStorage indisponible ou JSON corrompu
  }
  const days = stored.days ?? {};

  // Date locale (cohérente avec les clés de saisie) — pas la date UTC
  const today = toKey(new Date());
  const currentWeekStart = startOfWeek(today);

  const signals = extractSignals();
  const tdeeStr = signals.adaptiveTDEE !== null
    ? `${signals.adaptiveTDEE} kcal`
    : 'N/A (données < 14j)';
  const trendStr = signals.weightTrend14d !== null
    ? `${signals.weightTrend14d >= 0 ? '+' : ''}${signals.weightTrend14d} kg`
    : 'N/A';
  const intakeStr = signals.avgIntake !== null ? `${signals.avgIntake} kcal` : 'N/A';
  const confidenceStr = `${signals.confidence}%`;

  const periodStr =
    signals.windowStart && signals.windowEnd
      ? `${signals.windowStart} → ${signals.windowEnd}`
      : 'N/A';
  const header =
    `⚡ TDEE adaptatif : ${tdeeStr} | Tendance poids 14j : ${trendStr}` +
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
