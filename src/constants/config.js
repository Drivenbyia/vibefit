export const DEFAULT_STEPS_TARGET = 8000;
export const STORAGE_KEY = 'vibefit_v1';
// Version du schéma stocké sous STORAGE_KEY. La clé ne change pas : la
// migration est additive (voir models/protocol.js), un ancien export reste lisible.
//   1 — implicite : { days, targets, presetId, baseTDEE, stepsTarget }
//   2 — + periods (coupures), phases (protocoles datés), devices (montres)
export const SCHEMA_VERSION = 2;

// Sources d'une mesure de montre. `iphone` = iPhone seul, pas sous-estimés
// dès que le téléphone n'est pas sur soi : jamais mélangé à une référence montre.
export const MEASURE_SOURCES = {
  garmin: 'Garmin',
  apple_watch: 'Apple Watch',
  iphone: 'iPhone seul',
  manual: 'Saisie manuelle',
};

// Règles d'une phase datée (voir models/protocol.js). Une phase ne change
// aucune donnée : elle change la LECTURE des jours qu'elle couvre.
//   cycling: false  — cyclage TRAIN/OFF suspendu, cible unique tous les jours
//   training: false — séance et chantier hors sujet : non saisissables
export const PHASE_TYPES = {
  medical_stop: { label: 'Arrêt médical', cycling: false, training: false },
};
// Type de jour pendant une phase sans cyclage — clé de la cible unique.
export const REST_DAY_TYPE = 'rest';

// 1 kg de masse corporelle ≈ 7700 kcal (hypothèse tissus mixtes — adipeux + maigre)
export const KCAL_PER_KG = 7700;

// --- NEAT (dépense d'activité non sportive) ---
// ~0.0005 kcal par pas et par kg : 10 000 pas ≈ 400 kcal pour 80 kg.
// Estimation volontairement conservatrice — attribuer aux pas l'intégralité
// d'une baisse de dépense Garmin surestimerait leur part (les séances y entrent).
export const KCAL_PER_STEP_PER_KG = 0.0005;

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

// --- Seuils absolus du protocole ---
// DEFAULT_TARGETS vit dans presetUtils.js : il est DÉRIVÉ de DEFAULT_TDEE via
// computePresetTargets(). Le définir ici créerait un cycle config → presetUtils.
export const KCAL_FLOOR = 1600;    // plancher calorique, hors week-end
export const PROTEIN_FLOOR = 160;  // plancher protéines, tous les jours
export const MIN_BASE_TDEE = 1800; // = KCAL_FLOOR + 200 : garantit OFF ≥ plancher
export const MIN_CYCLE_GAP = 400;  // écart nominal TRAIN − OFF du cyclage

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
    sub: 'Sèche progressive — glucides réduits les jours OFF',
    targets: {
      train: { kcal: 2200, protein: 160, carbs: 230, fat: 70, label: 'TRAIN' },
      off:   { kcal: 1700, protein: 160, carbs: 90, fat: 70, label: 'OFF' },
      we:    { kcal: null, protein: 160, carbs: null, fat: null, label: 'WE' },
    },
  },
  cut_strong: {
    label: 'Sèche forte',
    sub: 'Sèche marquée — protéines relevées à 170 g',
    targets: {
      train: { kcal: 2000, protein: 170, carbs: 180, fat: 65, label: 'TRAIN' },
      off:   { kcal: 1500, protein: 170, carbs: 60, fat: 65, label: 'OFF' },
      we:    { kcal: null, protein: 170, carbs: null, fat: null, label: 'WE' },
    },
  },
  bulk: {
    label: 'Prise de masse',
    sub: 'Surplus contrôlé — recharge les jours TRAIN',
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

// --- Direction artistique « Los Santos Dusk » — voir DESIGN.md ---
// Grove Street la nuit : San Andreas / Californie 90s / hip-hop West Coast /
// ciné 80s / streetwear actuel. Presque noir mais CHAUD (violet de crépuscule,
// pas un gris neutre), couleurs de gang détournées en couleurs d'état,
// dégradé coucher de soleil réservé aux surfaces décoratives.
//
// Règle de couleur : une couleur signifie un ÉTAT, jamais une décoration.
//   green (Grove Street) → dans la cible / atteint / marque VibeFit
//   gold  (Vagos)         → EN DESSOUS de la cible (un manque)
//   coral (néon coucher de soleil) → HORS BORNES (dépassement, erreur, perte de données)
// `alert` reste rare par construction : le diluer sur des manques ordinaires lui
// ferait perdre sa valeur de signal.
export const PALETTE = {
  // Fonds & encre — presque noir, mais chaud : violet de nuit, pas gris neutre
  bg: '#150F1A',            // fond de l'app — ciel de Los Santos à la nuit tombée
  surface: '#241A26',       // feuille surélevée — stuc éclairé au néon
  surfaceRaised: '#2E212F', // niveau au-dessus (inputs, éléments imbriqués)
  ink: '#F7F0E8',           // texte, chiffres — blanc chaud, pas clinique
  inkSoft: '#150F1A',       // texte sur remplissage saturé (boutons actifs)
  muted: '#A091A3',         // marginalia, labels — AA sur bg et surface
  line: '#3D2C40',          // bordures de séparation — décoratives, non porteuses
  // `tick` est distinct de `line` à dessein : les graduations de l'anneau
  // PORTENT l'information d'échelle, elles tombent donc sous WCAG 1.4.11
  // (contraste non-textuel ≥ 3:1). Une bordure de card peut rester plus discrète.
  tick: '#8A7A8D',          // graduations — 4.20:1 sur surface, 4.71:1 sur bg

  // États — couleurs de gang détournées, saturées pour glower (voir `glow()`)
  deep: '#3FC94F',      // Grove Street green — signal : dans la cible
  deepSoft: '#132918',  // fond badge/encart, texte `deep` dessus
  warn: '#FFB627',      // Vagos gold — en dessous de la cible
  warnSoft: '#2B2008',
  alert: '#FF3D68',     // néon coucher de soleil — hors bornes
  alertSoft: '#2B121A',

  // Rampe catégorielle — distingue des natures, pas des états.
  // La couleur n'y est jamais porteuse seule : label, valeur et cible sont
  // toujours écrits à côté (cf. Bar.jsx, MacroBar.jsx).
  slate: '#FF2E9A',   // magenta synthwave — jour OFF / glucides
  umber: '#B27CE8',   // Ballas purple — lipides
};

// Dégradé coucher de soleil San Andreas — RÉSERVÉ aux surfaces décoratives
// (header, splash, halo derrière l'anneau). Jamais sous du texte hors de la
// bande sombre du haut : au milieu/bas, le contraste texte ne passe plus AA
// (vérifié — voir DESIGN.md). Le texte du header reste dans la bande #241645.
export const SUNSET = 'linear-gradient(180deg, #241645 0%, #7A2D6B 55%, #FF7A3D 100%)';

// Rayon de flou du glow d'accent (halo coloré derrière un état actif — anneau,
// pill sélectionnée). Différent d'une ombre portée générique : la couleur suit
// TOUJOURS l'état affiché, jamais un gris neutre décoratif.
export const glow = (hex, size = 18) => `0 0 ${size}px ${hex}66, 0 0 ${Math.round(size / 3)}px ${hex}99`;

// Ombre dure décalée, sans flou — le patch/sticker sérigraphié plutôt que la
// carte à ombre portée générique (interdite, voir DESIGN.md §0). Réservé aux
// petits éléments d'accent (pills, badges) : sur une grande card, l'effet
// tourne au bruit visuel plutôt qu'à la signature.
export const sticker = (hex, offset = 3) => `${offset}px ${offset}px 0 0 ${hex}`;
