export const DEFAULT_STEPS_TARGET = 8000;
export const STORAGE_KEY = 'vibefit_v1';

// --- Bornes de plausibilité du signal (rejet des erreurs de saisie) ---
// Une valeur hors bornes est écartée (→ null) avant tout calcul : une typo
// `78` → `780` kg se propagerait sinon dans l'interpolation, le lissage et le TDEE.
export const WEIGHT_MIN_KG = 30;
export const WEIGHT_MAX_KG = 300;
export const INTAKE_MIN_KCAL = 500;
export const INTAKE_MAX_KCAL = 8000;
// Variation j/j physiologiquement impossible — mise à l'échelle par l'écart de
// jours : +2 kg en 3 jours est légitime, +2 kg en 1 jour est une erreur de saisie.
export const MAX_DAILY_WEIGHT_JUMP_KG = 2;

export const DEFAULT_TARGETS = {
  train: { kcal: 2400, protein: 160, carbs: 280, fat: 70, label: 'TRAIN' },
  off:   { kcal: 1900, protein: 160, carbs: 120, fat: 75, label: 'OFF' },
  we:    { kcal: null, protein: 160, carbs: null, fat: null, label: 'WE' },
};

export const PRESETS = {
  maintenance: {
    label: 'Maintenance',
    sub: 'Protocole VIBEFIT par défaut',
    targets: {
      train: { kcal: 2400, protein: 160, carbs: 280, fat: 70, label: 'TRAIN' },
      off:   { kcal: 1900, protein: 160, carbs: 120, fat: 75, label: 'OFF' },
      we:    { kcal: null, protein: 160, carbs: null, fat: null, label: 'WE' },
    },
  },
  cut_light: {
    label: 'Sèche légère',
    sub: '−200 kcal / jour — perte ~250 g/sem',
    targets: {
      train: { kcal: 2200, protein: 160, carbs: 230, fat: 70, label: 'TRAIN' },
      off:   { kcal: 1700, protein: 160, carbs: 90, fat: 70, label: 'OFF' },
      we:    { kcal: null, protein: 160, carbs: null, fat: null, label: 'WE' },
    },
  },
  cut_strong: {
    label: 'Sèche forte',
    sub: '−400 kcal / jour — perte ~500 g/sem',
    targets: {
      train: { kcal: 2000, protein: 170, carbs: 180, fat: 65, label: 'TRAIN' },
      off:   { kcal: 1500, protein: 170, carbs: 60, fat: 65, label: 'OFF' },
      we:    { kcal: null, protein: 170, carbs: null, fat: null, label: 'WE' },
    },
  },
  bulk: {
    label: 'Prise de masse',
    sub: '+300 kcal / jour — gain ~300 g/sem',
    targets: {
      train: { kcal: 2700, protein: 160, carbs: 350, fat: 75, label: 'TRAIN' },
      off:   { kcal: 2200, protein: 160, carbs: 180, fat: 80, label: 'OFF' },
      we:    { kcal: null, protein: 160, carbs: null, fat: null, label: 'WE' },
    },
  },
  diet_break: {
    label: 'Diet Break (Vacances)',
    sub: 'Pause diète — maintien sans stress',
    targets: {
      train: { kcal: 2500, protein: 160, carbs: 290, fat: 80, label: 'TRAIN' },
      off:   { kcal: 2500, protein: 160, carbs: 290, fat: 80, label: 'OFF' },
      we:    { kcal: null, protein: 160, carbs: null, fat: null, label: 'WE' },
    },
  },
};

export const PALETTE = {
  ink: '#0E1116',
  inkSoft: '#1A1F26',
  paper: '#F6F2EC',
  surface: '#FFFFFF',
  line: '#D9D2C7',
  muted: '#5A6472',
  accent: '#FF5A1F',
  accentDark: '#C73E10',
  deep: '#0B3D2E',
  deepSoft: '#E8F1ED',
  highlight: '#FFF3E6',
  warn: '#B45309',
};
