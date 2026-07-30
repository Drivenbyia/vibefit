# DESIGN.md — Direction artistique VibeFit

> **Ce fichier est la mémoire de direction artistique du repo.**
> À relire avant toute tâche UI, puis à appliquer sans redemander la direction.
> Il n'est pas descriptif mais **prescriptif** : si une proposition le contredit,
> c'est la proposition qui change.

Direction retenue : **« Signal »** — registre *wearable de performance*
(référence explicite : Whoop). Dark-first, presque noir, où les couleurs d'état
**glowent** au lieu de décorer.

> Historique : une première direction (« Millimétré », claire et froide,
> registre instrument de labo) a été livrée le 2026-07-30 puis rejetée le même
> jour au premier rendu — jugée « triste et froide », sans rapport avec une
> app moderne. Le développeur a donné une référence explicite (Whoop) plutôt
> que d'itérer sur la direction précédente. Cette section remplace entièrement
> la précédente ; elle n'en est pas une variante.

---

## 0. Interdits (refus fermes)

Ces points ne sont pas des préférences, ce sont des refus. Aucune exception.

- **Polices** : jamais Inter (ni Inter Tight), Roboto, Arial, Space Grotesk, ni
  police système par défaut. `system-ui` n'apparaît dans aucune pile.
- **Palette** : jamais fond crème (#F4F1EA et voisins) + accent terracotta
  (#D97757 et voisins) ; jamais dégradé violet/bleu sur fond blanc ; jamais de
  gris papier froid façon carnet de labo (l'ancienne direction) — le fond est
  **presque noir**, pas gris clair.
- **Effets** : jamais de glassmorphism ni de `backdrop-filter`. Le **glow**
  (halo coloré, `box-shadow` teinté par l'état affiché) est en revanche
  **la signature de cette direction** — ne pas le confondre avec l'ombre
  portée générique grise que l'ancienne direction interdisait : ici la couleur
  du glow suit toujours l'état, jamais un gris neutre décoratif.
- **Layout** : jamais « hero + 3 feature cards + dégradé ».
- **Numérotation** 01/02/03 seulement si le contenu est réellement une séquence.

---

## 1. Palette

Dark-first, presque noir — l'app se lit dans une salle de sport ou au lit à
côté du téléphone, pas en plein jour sur une feuille de papier. Source de
vérité unique : `src/constants/config.js` → `PALETTE`.

### Fonds & encre

| Token | Hex | Rôle |
|---|---|---|
| `bg` | `#0A0B0D` | fond de l'app — presque noir |
| `surface` | `#16181B` | feuille surélevée |
| `surfaceRaised` | `#1E2124` | niveau au-dessus — inputs, éléments imbriqués |
| `ink` | `#F2F4F6` | texte, chiffres, **cran « aujourd'hui »** |
| `inkSoft` | `#0A0B0D` | texte sur remplissage saturé (boutons/pills actifs) |
| `muted` | `#8B929A` | marginalia, labels |
| `line` | `#24282D` | bordures de séparation — décoratives |
| `tick` | `#6B7076` | réservé aux graduations si une future jauge en a besoin |

`ink` et `inkSoft` sont quasi opposés (texte principal quasi-blanc / texte sur
fond clair quasi-noir) — ne pas les confondre. Un bouton ou une pill **actifs**
prennent un fond saturé (couleur d'état ou `ink`) : leur texte doit être
`inkSoft`, jamais `ink`, sinon le texte disparaît sur son propre fond.

### États — une couleur signifie un état, jamais une décoration

| Token | Hex | Signifie |
|---|---|---|
| `deep` | `#2FEA7A` | green — **dans la cible** / atteint / marque VibeFit |
| `deepSoft` | `#132A1E` | fond badge/encart, texte `deep` dessus |
| `warn` | `#FFB020` | amber — **en dessous de la cible** (un manque) |
| `warnSoft` | `#2B2008` | |
| `alert` | `#FF4D5E` | red — **hors bornes** (dépassement, erreur, perte de données) |
| `alertSoft` | `#2B1216` | |

La distinction `warn` / `alert` est la règle la plus facile à casser et la plus
importante à tenir : **un manque ordinaire n'est pas une alerte.** Colorer en
rouge des pas en retard ou une séance non faite dilue `alert` jusqu'à lui
retirer toute valeur de signal. `alert` doit rester rare.

### Rampe catégorielle — distingue des natures, pas des états

| Token | Hex | Rôle |
|---|---|---|
| `slate` | `#29C4FF` | blue — jour OFF / glucides |
| `umber` | `#A78BFA` | purple — lipides |

La couleur n'est jamais porteuse seule : label, valeur et cible sont toujours
écrits à côté (cf. `Bar.jsx`, `MacroBar.jsx`). C'est ce qui rend la rampe
acceptable en déficience de vision des couleurs.

### Contraste

Toutes les paires utilisées passent **WCAG AA** (contrainte non négociable du
`1_project_bible.md`), y compris les textes portés directement sur un
remplissage saturé (`inkSoft` sur `deep`/`warn`/`alert`/`slate` : 10 à 12.6:1).
Toute nouvelle paire — en particulier tout nouveau texte posé sur une couleur
d'état — doit être vérifiée avant d'entrer. Ne pas supposer qu'une couleur
vive au rendu est forcément lisible : `ink` (quasi-blanc) sur `alert` échoue
l'AA (2.94:1) alors que `inkSoft` (quasi-noir) sur `alert` passe (6.22:1).

---

## 2. Typographie

Trois rôles, trois familles — inchangés depuis la direction précédente, le
rejet portait sur la couleur/l'ambiance, pas sur le choix typographique.
Affectation dans `src/components/ui/FontStyles.jsx`, `@font-face` dans
`src/styles/fonts.css`.

| Classe | Famille | Rôle |
|---|---|---|
| `.vf-display` | **Archivo** 700/900 | chiffres-vedettes, titres de cadran |
| `.vf-body` | **IBM Plex Sans** 400/600 | corps, labels, interface |
| `.vf-mono` | **IBM Plex Mono** 500/600 | données, ratios, valeurs relevées |

`.vf-tabular` (`font-variant-numeric: tabular-nums`) est **obligatoire** sur
toute valeur qui change dans le temps.

**Polices auto-hébergées.** Servies depuis `/fonts` (8 fichiers woff2,
sous-ensembles latin + latin-ext, 216 Ko), précachées par Workbox. Aucun appel
CDN au chargement — offline-first. **Ne pas réintroduire de `<link>` Google
Fonts dans `index.html`.**

---

## 3. Layout

**Concept en une phrase** : un cadran de wearable de performance — canvas noir
continu, cartes sombres élevées, anneaux et pistes qui glowent dans la couleur
de l'état qu'ils rapportent.

Rayons : cartes **16–20px**, contrôles/pills **12px**, chips/pastilles
**999px (rond complet)**. C'est un renversement volontaire de la direction
précédente (qui imposait des angles vifs 0/2/3) : ici l'arrondi généreux fait
partie du registre « app de sport moderne », pas de la mollesse générique —
la distinction se fait par le glow et la densité de données, pas par l'angle.

```
TODAYVIEW (390 px)                    WEEKVIEW
┌──────────────────────────┐          ┌──────────────────────────┐
│ VIBE·FIT      AUJOURD'HUI│          │ SEMAINE DU    SOLDE NET  │
│  ‹   Jeudi 30 Juillet  › │          │ lundi 27 juillet  +2180  │
│ (TRAIN) ( OFF ) (  WE  ) │ ← glow   │ 1 / 7 jours saisis       │
├──────────────────────────┤          ├──────────────────────────┤
│ BILAN DU JOUR            │          │ LUN MAR MER ┌JEU┐ VEN …  │
│     ╭──────╮   APPORT    │          │  27  28  29 │ 30│  31    │
│    ╱  -220 ╲  2180       │ ← glow   │             └───┘ ← plein│
│    ╲SOUS LA╱   kcal      │          ├──────────────────────────┤
│     ╰CIBLE─╯              │          │ BILAN NET                │
├──────────────────────────┤          │ (APPORT)(DÉPENSE)(SÉANCE)│
│ MACRONUTRIMENTS           │          ├──────────────────────────┤
│ PROTÉINES      148/160g  │          │ TENDANCE CALORIQUE       │
│ ▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░ ← glow          │ barres/jour              │
│ GLUCIDES       305/280g  │          ├──────────────────────────┤
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ over │          │ MOYENNES / JOUR SAISI ÷ 1│
├──────────────────────────┤          └──────────────────────────┘
│ APPORT · DÉPENSE · SÉANCE│          Chaque vue = orchestrateur
│ POIDS · TAILLE · SOMMEIL │          pur ≤ 50 lignes ;
├──────────────────────────┤          sous-composants ≤ 80.
│ Jour  Semaine  Cibles  … │ ← glow sur l'onglet actif
└──────────────────────────┘
```

---

## 4. Signature — L'ANNEAU / LA PISTE LUMINEUSE

**Le détail qui rend VibeFit reconnaissable.** Chaque métrique de progression
est un remplissage **plein, à bouts ronds, qui glowe dans sa propre couleur
d'état** — jamais une barre plate ou un cadran flat. Deux implémentations de
référence, même logique :

- `src/components/ui/Bar.jsx` — piste linéaire, primitive partagée par
  `MacrosCard` / `ExpenditureCard` / `MacroBar`.
- `src/components/views/today/BalanceRing.jsx` — même logique refermée en
  cadran, arc épais à bouts ronds, flou SVG (`feGaussianBlur`) pour un glow
  net même en gros (pas seulement un `box-shadow` CSS, qui rendrait moins bien
  sur un tracé SVG épais).

Ce que VibeFit garde de propre à lui, et qu'un cadran Whoop générique n'a pas :
**un marqueur de cible.** Un anneau de recovery Whoop suit un score continu
sans cible fixe ; VibeFit suit des macros et des calories *contre* une cible,
donc le marqueur reste — mais redessiné en repère lumineux discret plutôt
qu'en encoche gravée :

```
KCAL        1 840 / 2 400
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░
              │
              └ marqueur de cible (repère clair, pas une fin de course)
```

Trois règles qui font tenir la signature :

1. **L'échelle court jusqu'à 125 % de la cible** (`SCALE = 1.25`), ce qui place
   le marqueur à 80 % de la largeur. Dépasser reste donc *lisible* au lieu de
   saturer la piste.
2. **Bouts ronds, toujours.** `strokeLinecap: 'round'` sur les arcs,
   `borderRadius: 999` sur les pistes linéaires. C'est l'inverse de la
   direction précédente (bouts droits) — assumé, c'est ce qui donne le
   caractère « wearable » plutôt que « règle graduée ».
3. **Le glow suit l'état, jamais une couleur neutre.** Une piste à 0 ne glowe
   pas (`boxShadow: 'none'`) ; dès qu'il y a une valeur, le glow prend la
   couleur du remplissage (`deep`/`warn`/`alert`/`slate`/`umber`). Voir
   `glow(hex, size)` dans `constants/config.js`.

Corollaire : **« aujourd'hui » reste un cran, pas une pastille colorée** — cellule
pleine `ink` (quasi-blanche) à texte `inkSoft`, dans `WeekCalendar` comme dans
le contour de `DayBar`. C'est la seule chose que la direction précédente avait
juste et qui survit au changement de palette : le repère temporel ne doit pas
se confondre avec un des repères d'état (vert/ambre/rouge/bleu/violet).

---

## 5. Contraintes PWA

- **Mobile-first.** Cadre de référence 390 px, `maxWidth: 720` centré au-delà.
- **Cibles tactiles ≥ 44 px.** Vérifié : zéro élément interactif sous 44 px.
  Attention au piège dans `NumberInput` — le padding vertical doit vivre sur
  l'`<input>`, pas sur son conteneur, sinon le champ *paraît* plus grand que
  sa zone réellement cliquable.
- **États vides = du contenu.** L'écran sans données affiche la piste/l'anneau
  complet avec son marqueur de cible et une valeur à zéro : l'instrument est
  calibré et en attente, pas cassé.
- **Offline-first.** Polices précachées, aucune requête tierce au chargement.
  `background_color` du manifest = `bg`, `theme_color` = `bg` (la barre
  système se fond dans l'app).
- **Dark uniquement, pas de variante claire.** Assumé : c'est tout l'objet de
  cette direction — un wearable de performance ne bascule pas en mode jour.
  Si un mode clair est demandé un jour, ce sera une direction distincte, pas
  une variante de celle-ci.
- **Marque** : l'anneau lumineux (favicon inline SVG dans `index.html`,
  `public/pwa-icon.svg`) — piste sombre + arc vert glow, écho direct de
  `BalanceRing`.

---

## 6. Reste à faire

- Reliquat hors direction, non traité ici : `NumberInput` ignore les props
  `step` / `inputMode` passées pour le poids.
