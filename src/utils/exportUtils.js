import { STORAGE_KEY } from '../constants/config.js';
import { startOfWeek, addDays, fmtFr } from './dateUtils.js';

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
      ` (P: ${Math.round(day.intake.prot ?? 0)}g` +
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

  const today = new Date().toISOString().slice(0, 10);
  const currentWeekStart = startOfWeek(today);

  const lines = [`# Rapport VibeFit — ${n} dernières semaines\n`];

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
