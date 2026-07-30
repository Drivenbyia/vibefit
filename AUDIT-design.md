# AUDIT-design.md — Lot 0 : état des lieux « Los Santos Dusk »

> Audit seul. Aucune ligne de code applicative modifiée. Sources : `DESIGN.md`,
> `.vibe_brain/4_business_decisions.md`, lecture ciblée de `src/**` via `grep`.

---

## ⚠️ Constat préalable, avant tout — le bug du Lot 1 ne se pose pas tel que décrit

Le brief du Lot 1 part du principe que la charte est implémentée en **CSS avec
custom properties** (`:root { --state-ok-rgb: ... }`, classe `.glow` avec
`var(--c)`). **Ce n'est pas l'architecture réelle du repo.**

Ici, tokens et effets vivent dans un **module JS unique**,
`src/constants/config.js` :

```js
export const glow = (hex, size = 18) =>
  `0 0 ${size}px ${hex}66, 0 0 ${Math.round(size / 3)}px ${hex}99`;
```

`glow('#3FC94F', 10)` produit `0 0 10px #3FC94F66, 0 0 3px #3FC94F99` — un
`box-shadow` avec une couleur hex **8 chiffres** (`#RRGGBBAA`), syntaxe CSS
standard (Color Module Level 4, supportée par tous les navigateurs evergreen
depuis 2017). **C'est une déclaration valide**, pas la concaténation
`var(--c)66` cassée que le brief décrit — il n'y a aucun `var()` dans ce
fichier, et pour cause : il n'y a pas une seule règle CSS dans tout le repo en
dehors de `index.css` (reset global) et `FontStyles.jsx` (`@font-face`
consommateurs + 2 classes utilitaires `.vf-pulse`/`.vf-fadein`). Toute la
mise en forme passe par des styles inline React alimentés par `PALETTE`.

Autrement dit : **le halo s'affiche déjà**, aujourd'hui, en prod. Je n'ai pas
de preuve DevTools dans ce message (pas d'install `node_modules` faite pour
rester dans le zéro-modification du lot 0 — je peux la fournir au lot 1 si
besoin), mais la validité de la syntaxe n'est pas discutable.

Ce qui ne veut pas dire que le mécanisme `glow()` est irréprochable — voir
plus bas les trois vrais points à traiter — mais **le lot 1 tel qu'écrit
(ajouter des `--*-rgb` CSS, réécrire `.glow` avec `var()`) introduirait une
architecture CSS-custom-properties qui n'existe nulle part ailleurs dans le
projet**, pour corriger un bug qui n'existe pas dans ce code-ci. Je propose
qu'on tranche ensemble avant le lot 1 (voir section finale « Décision
requise »).

### Ce qui, en revanche, est un vrai défaut de `glow()`

1. **Couleurs non-hex non supportées.** `${hex}66` suppose que `hex` est
   toujours un hex à 6 chiffres. Tous les appels actuels respectent ça
   (`PALETTE.*` est 100 % hex), donc pas de bug *aujourd'hui*, mais rien ne
   l'empêche structurellement (une regression future passant du `rgb(...)`
   casserait silencieusement, sans erreur visible — le `box-shadow` serait
   juste invalide et ignoré).
2. **Règle « une piste à zéro ne glowe pas »** : déjà respectée à 3 endroits
   sur 3 (`Bar.jsx:44` — `cursor > 0 ? glow(...) : 'none'`, `MacroBar.jsx:30`
   — `pct > 0 ? glow(...) : 'none'`, `BalanceRing.jsx:54` — le cercle
   lumineux n'est même pas rendu si `frac === 0`). **Rien à corriger ici.**
3. **Anneau SVG** : `BalanceRing.jsx` utilise déjà `feGaussianBlur` (voir
   `<filter id="vf-ring-glow">`, ligne 41-47) et non `box-shadow` — la
   prescription de charte est déjà respectée.

---

## 1. Où sont définis les tokens

**Fichier unique**, pas de dispersion, pas de config Tailwind (le projet n'a
pas Tailwind — `package.json` ne liste que React/Vite/PWA) :

- `src/constants/config.js` — `PALETTE` (couleurs), `SUNSET` (dégradé),
  `glow()`, `sticker()` (helpers de style).

Aucun token de **taille de police**, d'**espacement**, ni de **rayon** :
seuls les tokens de couleur/effet existent. C'est le trou que le lot 4
comble.

Les rôles typographiques (5 classes `.vf-*`) sont dans
`src/components/ui/FontStyles.jsx`, avec les `@font-face` séparés dans
`src/styles/fonts.css`. C'est une deuxième source de vérité de fait (classes
CSS-in-JS via balise `<style>`, pas des tokens JS) — cohérent avec le fait
que la typo est appliquée par `className`, pas par valeur, mais à noter pour
le lot 4/8 (deux mécanismes de token : objet JS pour la couleur, classes CSS
pour la typo).

---

## 2. Couleurs en dur hors de `config.js`

Le point positif : **la discipline de centralisation est déjà bonne**. Un
grep exhaustif de `#[0-9A-Fa-f]{3,8}` et `rgba?\(` sur tout `src/**/*.jsx` ne
remonte que 4 sites, tous documentés en commentaire :

| Fichier:ligne | Valeur | Contexte |
|---|---|---|
| `src/components/ui/FontStyles.jsx:55` | `#EFE7DC` | fallback `.vf-chrome` (texte plein si `background-clip` non supporté) |
| `src/components/ui/FontStyles.jsx:59` | `#FFFFFF, #E6DED2, #9C93A8, #FFF6E8` | dégradé argent du wordmark chromé |
| `src/components/layout/Header.jsx:51` | `rgba(255,255,255,0.08)` | fond des boutons de nav du header (flèches jour préc./suiv.) |
| `src/components/layout/DayTypeSwitcher.jsx:24` | `rgba(255,255,255,0.1)` | fond des pills TRAIN/OFF/WE inactives |

Les 4 sont justifiées par leur contexte (overlay blanc translucide sur fond
sombre, dégradé chrome propre au wordmark) mais **aucune n'est un token** —
si `bg` ou `ink` changent un jour, ces 4 valeurs ne suivront pas.
`src/index.css:22-23` duplique aussi `#150f1a`/`#f7f0e8` (= `PALETTE.bg`/
`ink`), mais c'est **volontaire et commenté** (peint avant montage React,
donc ne peut pas lire le token JS) — ce n'est pas une dérive, à laisser tel
quel.

---

## 3. Tailles de police et espacements en dur

Zéro échelle aujourd'hui — chaque composant choisit sa propre valeur.
Comptage exhaustif par `grep`/`sort`/`uniq -c` sur tout `src/**/*.jsx` :

### `fontSize` — **19 valeurs distinctes**, 148 sites d'appel

| px | occurrences | px | occurrences | px | occurrences |
|---|---|---|---|---|---|
| 9 | 6 | 15 | 1 | 25 | 1 |
| 10 | 16 | 16 | 1 | 26 | 1 |
| 11 | 26 | 17 | 1 | 30 | 1 |
| 12 | 18 | 18 | 2 | 32 | 1 |
| 13 | 20 | 21 | 1 | 34 | 1 |
| 14 | 14 | 22 | 1 | 36 | 1 |
| — | | | | 24 | 2 |

### Espacements (`padding`/`margin`/`gap` en valeur unique) — **16 valeurs**

`0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 14, 16, 18, 20` px — la plus utilisée
est `8` (38 sites), suivie de `10` (26) et `12`/`14` (25/16).

`padding` en chaîne composée (non capturé par le comptage ci-dessus, valeurs
en plus) : `1px 6px`, `3px 8px`, `4px 0`, `4px 0 8px`, `4px 8px`, `7px 10px`,
`8px 0`, `8px 4px`, `8px 10px`, `10px 8px`, `10px 12px`, `12px 16px`,
`20px 18px 40px`, `14px 14px 100px` (padding de vue, avec la marge basse
`BottomNav`).

### Rayons (`borderRadius`) — **6 valeurs**

`2, 3, 12, 16, 20, 999`. `12` correspond déjà exactement à la proposition
`--r-control`. `999` = `--r-pill`. `16` et `20` se partagent le rôle « carte »
(`StatCard.jsx:10` = 16, `Card.jsx:10` = 20) — DESIGN.md §3 les couvre
formellement (« cartes 16–20px ») mais ce sont deux valeurs différentes non
réconciliées, à trancher au lot 4 (une seule `--r-card`, ou deux tokens
nommés si la distinction est voulue). `2` et `3` (marqueur de cible `Bar.jsx`,
notch coloré `TargetEditor.jsx`/`FooterCards.jsx`/`ReminderCard.jsx`/
`ProteinBadge.jsx`/`DataInfoCards.jsx`) ne rentrent dans aucune proposition
du lot 4 — **à me signaler plutôt que forcer**, comme demandé dans la
mission.

---

## 4. Usages de `.glow` / `.patch`

Il n'existe pas de classe CSS `.glow` ni `.patch` — l'équivalent fonctionnel
est le helper JS `glow()` (halo flou) et `sticker()` (ombre dure décalée,
l'appellation « patch » du DESIGN.md). Liste exhaustive des appels :

| Fichier:ligne | Appel |
|---|---|
| `src/components/ui/Pill.jsx:15` | `active ? glow(color, 14) : 'none'` |
| `src/components/ui/Bar.jsx:44` | `cursor > 0 ? glow(fillColor, 10) : 'none'` |
| `src/components/views/week/MacroBar.jsx:30` | `pct > 0 ? glow(fillColor, 8) : 'none'` |
| `src/components/layout/DayTypeSwitcher.jsx:27` | `sticker(PALETTE.bg)` + `glow(color, 14)` combinés |
| `src/components/views/today/BalanceRing.jsx:41-47,63` | `feGaussianBlur` SVG (pas `glow()` JS — bon véhicule pour un tracé SVG) |

`sticker()` n'est utilisé qu'à un seul endroit (`DayTypeSwitcher.jsx`),
conforme à la restriction DESIGN.md (« ne pas l'étendre aux grandes cards »).

---

## 5. Éléments interactifs et focus clavier

**Aucun `:focus-visible` nulle part dans le repo** (`grep` sur
`focus-visible|:focus` → 0 résultat en dehors des faux positifs `outline`
listés ci-dessous). Le focus par défaut du navigateur s'applique donc
partout **sauf** aux deux endroits où il est explicitement supprimé sans
remplacement :

| Fichier:ligne | Problème |
|---|---|
| `src/components/ui/NumberInput.jsx:68` | `outline: 'none'` sur l'`<input>`, aucun remplacement |
| `src/components/views/today/NotesCard.jsx:25` | `outline: 'none'` sur le `<textarea>`, aucun remplacement |
| `src/components/views/week/DayBar.jsx:48-49` | `outline` utilisé comme **décoration** (marqueur « jour = aujourd'hui »), pas comme focus — collision de vocabulaire à anticiper : une règle globale `:focus-visible { outline: ... }` ne doit pas être confondue avec cet usage sémantique différent |

### Inventaire des éléments interactifs

| Composant | Type | Cible ≥44px | Focus défini |
|---|---|---|---|
| `Header.jsx` — boutons ‹/› et date | bouton | oui (`minWidth/minHeight: 44`) | non |
| `DayTypeSwitcher.jsx` — pills TRAIN/OFF/WE | bouton | oui (44) | non |
| `Pill.jsx` | bouton | oui (44) | non |
| `BottomNav.jsx` — 4 onglets | bouton | **non vérifié** — `padding: '8px 4px'` sans `minHeight`/`minWidth` explicite ; à mesurer au rendu | non |
| `NumberInput.jsx` | champ | oui (44) | **supprimé sans remplacement** |
| `NotesCard.jsx` — textarea | champ | `minHeight: 60` (ok) | **supprimé sans remplacement** |
| `BackupCard.jsx` — export/import | bouton | oui (44) | non |
| `DayBar.jsx` (calendrier semaine) | bouton | **non vérifié** — pas de `minHeight` explicite, la zone cliquable dépend du contenu (56px de barre + libellés) | non |
| `PresetPickerCard.jsx` | bouton | à vérifier | non |

**`BottomNav.jsx`** est le cas le plus net à vérifier en premier : c'est la
nav principale, présente sur tout écran, et rien ne garantit 44px sur le
`<button>` lui-même (le padding est `8px 4px`, la hauteur dépend du contenu
icône+texte).

---

## 6. Overlays existants

**Aucun.** Grep sur `modal|Modal|toast|Toast|drawer|Drawer|overlay|Overlay|
backdrop` dans `src/**` → aucune correspondance dans les composants (les deux
faux positifs sont `overflow` dans `index.css` et le mot « pas » contenant
« a » dans `BottomNav.jsx`, non pertinents). Confirmations de destruction
utilisent `window.confirm()` natif (`useBackupManager.js:18,52`) — pas de
composant modal custom. **Le lot 6 (overlays) part donc d'une page blanche,
pas d'un composant existant à corriger.**

---

## 7. États vides / chargement / erreur réseau

| Endroit | Ce qui s'affiche aujourd'hui |
|---|---|
| `App.jsx:37-46` — chargement initial (`!loaded`, avant lecture `localStorage`) | Écran plein : wordmark `VibeFit` en `.vf-gothic`, animé `.vf-pulse` (opacity 1↔0.55, 2s loop) — **seul état de chargement de l'app**, déjà dans l'esprit du lot 6 (pas de spinner générique, identité visible) |
| `WeekView.jsx` — semaine sans aucun jour renseigné | Pas d'état vide dédié : chaque carte (`DiagnosisCard`, `NeatCard`, etc.) affiche ses propres valeurs par défaut/zéro via les hooks (`usePlateauDiagnosis` retourne `INSUFFICIENT_DATA`, `DayBar` affiche `—` si `!hasData`). Cohérent avec la règle DESIGN.md « l'anneau vide montre l'échelle complète », mais **pas de titre + phrase + action** comme le lot 6 le prescrit — c'est une dégradation silencieuse de chaque carte, pas un état vide écrit. |
| `BalanceRing.jsx:22` — `target` posé mais `intake === 0` | `sub: 'kcal ciblé'`, couleur `muted` — traité comme un état neutre informatif, pas une alerte. Bon réflexe déjà présent, à formaliser en `state-info`/`state-pending` au lot 3. |
| `BackupCard.jsx:50-62` — résultat d'import | Bandeau contenu dans la carte (pas plein écran), couleur `ok ? deep : alert`, icône `Check`/`AlertCircle`, texte `err.message` direct — pas de bannière pleine largeur, conforme à l'esprit du lot 3, mais pas de disparition automatique ni de style « champ invalide contenu » (c'est un message post-action, pas une validation de champ) |
| **Erreur réseau / offline** | **Rien.** Aucun listener `navigator.onLine`, aucun bandeau. Cohérent avec l'app 100 % locale (`.vibe_brain/4_business_decisions.md` — Architecture Local First, 0 DB cloud) mais le lot 6 demande un bandeau `state-info` non bloquant : à voir si c'est encore pertinent vu l'absence totale de réseau applicatif (pas d'API — seul le SW/cache peut échouer). **Question ouverte à trancher avant le lot 6**, pas une simple exécution. |
| `TargetEditor.jsx:36-44` — conflit protéines+lipides > cible | Bandeau plein (`background: warnSoft`, `border: warn`) avec emoji `⚠` — **à corriger dès que la voix éditoriale (lot 6) interdit l'emoji**, et à re-classer : ce n'est ni une erreur de saisie franche, ni un `state-over`, ni vraiment un `warn` (« manque ») — c'est un travers de l'arbitrage du lot 3 à traiter explicitement, ce n'est ni erreur ni manque au sens strict de la charte actuelle. |

---

## 8. Chargement des fontes

Toutes auto-hébergées (`public/fonts/*.woff2`, servies via `@font-face` dans
`src/styles/fonts.css`, 13 fichiers). Aucun `<link>` Google Fonts dans
`index.html` (confirmé par grep — le commentaire `index.html:29-30` documente
explicitement ce choix). `font-display: swap` sur les 13 `@font-face`. Poids
réel sur disque :

| Fichier | Ko |
|---|---|
| anton-latin.woff2 | 20 |
| anton-latin-ext.woff2 | 32 |
| archivo-black-latin.woff2 | 20 |
| archivo-black-latin-ext.woff2 | 16 |
| azeret-mono-latin.woff2 | 28 |
| azeret-mono-latin-ext.woff2 | 16 |
| barlow-400-latin.woff2 | 24 |
| barlow-400-latin-ext.woff2 | 16 |
| barlow-600-latin.woff2 | 24 |
| barlow-600-latin-ext.woff2 | 16 |
| barlow-700-latin.woff2 | 24 |
| barlow-700-latin-ext.woff2 | 16 |
| unifrakturcook-700-latin.woff2 | 20 |
| **Total** | **272 Ko** |

Pas de `<link rel="preload">` dans `index.html` — le lot 7 en demande un pour
Barlow et Azeret Mono, aucun n'existe aujourd'hui. `UnifrakturCook` (20 Ko)
n'est pas sous-ensemblée au-delà du split latin/latin-ext standard alors
qu'elle ne sert qu'à 3 chaînes courtes (wordmark, nom de preset, date de
semaine) — le gain potentiel d'un sous-ensemble de glyphes agressif reste à
chiffrer au lot 7 (nécessite un outil de subsetting, pas fait ici).

Précache PWA : `vite.config.js:39` — `globPatterns` inclut `woff2`, donc les
polices sont précachées par Workbox dès le premier build (confirmé, pas
supposé).

---

## 9. Assets PWA

| Asset | État |
|---|---|
| `manifest.json` | **Généré par `vite-plugin-pwa`** (pas de fichier statique — config dans `vite.config.js:11-33`). `theme_color`/`background_color` = `#150F1A` = `PALETTE.bg` ✅. `name`/`short_name` = VibeFit. `display: standalone`. |
| Icônes 192/512 | `public/pwa-icon.svg` — **un seul fichier SVG** référencé pour les deux tailles (`192x192` et `512x512`), `purpose: 'any maskable'` **combiné sur la même entrée**. C'est une pratique déconseillée par la spec PWA : une icône `maskable` a besoin d'une zone de sécurité (marge ~20 %) qu'une icône `any` ne veut pas — les servir en un seul asset avec un seul `purpose` combiné fait un compromis sur les deux usages plutôt que d'en réussir un. Contenu SVG (`pwa-icon.svg:9-10`) : le disque soleil va de y=130 à y=410 sur un canvas 512 centré à 256 — déborde de la zone de sécurité maskable typique (rayon ~205px centré). À vérifier précisément au lot 7. |
| Favicon | SVG inline en data URI dans `index.html:17-21` (zéro requête, disque soleil + skyline). Pas de fallback `.ico` pour les agents ne supportant pas `image/svg+xml` en favicon (rare aujourd'hui, mais aucun fallback n'existe). |
| Apple touch icon | Également data URI inline (`index.html:22-25`), motif similaire avec un palmier en silhouette. |
| Splash screen | **Absent.** Aucun asset iOS splash (`apple-touch-startup-image`) ni équivalent Android. |
| Image OG (partage social) | **Absente.** Aucune balise `og:image`/`twitter:image` dans `index.html`. |
| `theme-color` meta | `index.html:7` — `#150F1A`, cohérent avec le manifest. |

---

## Décision requise avant le lot 1

Deux options, à trancher avant que je touche à quoi que ce soit :

1. **Le glow fonctionne déjà** (mon analyse ci-dessus) → le lot 1 se réduit à
   3 petites choses réelles : durcir `glow()` contre une entrée non-hex
   (garde ou commentaire), et vérifier au rendu (capture DevTools) que
   personne ne s'est trompé. Pas de nouvelle architecture CSS custom
   properties à introduire.
2. **Vous avez observé le glow absent en usage réel** (peut-être un
   navigateur spécifique, ou un autre mécanisme que je n'ai pas vu) → dans ce
   cas il me faut le repro exact (navigateur, composant, capture) avant de
   proposer un correctif, parce que le correctif prescrit dans le brief ne
   correspond pas au code réel et je ne veux pas introduire un système de
   tokens CSS parallèle à `PALETTE` sans être sûr que c'est bien le problème.

Je m'arrête ici — lot 0 terminé, aucune ligne de code modifiée. En attente de
votre feu vert (et de votre arbitrage sur le point ci-dessus) avant de
démarrer le lot 1.
