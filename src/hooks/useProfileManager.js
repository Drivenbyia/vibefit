import { useMemo } from 'react';
import { num } from '../utils/mathUtils.js';
import { sanitizeProfile, mifflinBMR, ageAt } from '../utils/plausibility.js';
import { TDEE_MIN_BMR_FACTOR } from '../constants/config.js';
import { toKey } from '../utils/dateUtils.js';

/**
 * Profil physiologique (sexe, année de naissance, taille) — sert uniquement
 * au garde-fou de plausibilité du TDEE. Champ vidé ou hors bornes ⇒ null.
 */
export function useProfileManager(data, setData, smoothedWeight) {
  const profile = useMemo(() => sanitizeProfile(data?.profile), [data?.profile]);

  const setField = (field, value) => {
    const v = field === 'sex' ? value : (value === '' ? null : num(value));
    setData((prev) => ({ ...prev, profile: sanitizeProfile({ ...(prev.profile ?? {}), [field]: v }) }));
  };

  // Métabolisme de base au poids lissé courant, pour montrer le plancher.
  const bmr = profile.birthYear === null ? null : mifflinBMR({
    sex: profile.sex, age: ageAt(profile.birthYear, toKey(new Date())),
    heightCm: profile.heightCm, weightKg: smoothedWeight,
  });
  const minKcal = bmr !== null ? Math.round(TDEE_MIN_BMR_FACTOR * bmr) : null;

  return { profile, setField, bmr, minKcal };
}
