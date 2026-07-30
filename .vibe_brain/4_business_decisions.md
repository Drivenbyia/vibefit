---
type: RÉFÉRENCE — lire avant toute proposition architecturale
---

# ⚖️ Business Decisions — VibeFit

> Ce fichier documente toutes les décisions techniques et produit significatives, avec leur contexte et leur justification. Toute proposition architecturale doit être confrontée à ce document avant validation.

---

## Template de décision
```
### [DATE] — [Titre court]
- **Décision** : …
- **Contexte** : …
- **Alternatives considérées** : …
- **Raison du choix** : …
- **Impact** : …
- **Réversibilité** : Facile / Moyenne / Difficile
```

---

## Décisions enregistrées

### 2026-05-04 — Pas de state manager externe
- **Décision** : Utiliser uniquement `useState`, `useReducer` et le Context API natif de React.
- **Contexte** : Application de taille modeste (tracker personnel), surcharge cognitive d'une librairie externe non justifiée à ce stade.
- **Alternatives considérées** : Zustand, Jotai, Redux Toolkit.
- **Raison du choix** : Minimalisme de la stack, zéro dépendance supplémentaire, facilité de maintenance solo.
- **Impact** : Toute logique d'état complexe doit être gérée via des custom hooks.
- **Réversibilité** : Moyenne (migration vers Zustand possible sans refactoring total).

### 2026-05-04 — Vite comme build tool
- **Décision** : Conserver Vite 5 comme bundler principal.
- **Contexte** : Déjà en place à l'initialisation du projet.
- **Alternatives considérées** : Create React App (déprécié), Parcel.
- **Raison du choix** : DX supérieur (HMR ultra-rapide), taille de bundle optimisée, support ESM natif.
- **Impact** : Configuration dans `vite.config.js`.
- **Réversibilité** : Difficile.

### 2026-05-04 — Déploiement Netlify
- **Décision** : Déployer sur Netlify via `netlify.toml`.
- **Contexte** : Fichier `netlify.toml` présent dès le commit initial.
- **Alternatives considérées** : Vercel, GitHub Pages.
- **Raison du choix** : Configuration déjà en place, tier gratuit suffisant.
- **Impact** : Le build command est `vite build`, output dir `dist`.
- **Réversibilité** : Facile.

### 2026-05-04 — Architecture Local First (0 DB cloud)
- **Décision** : L'application est totalement autonome. Aucune donnée ne quitte l'appareil sans action explicite de l'utilisateur (bouton export).
- **Contexte** : Tracker personnel, données de santé sensibles, volonté de simplicité maximale.
- **Alternatives considérées** : Firebase Firestore, Supabase, PocketBase.
- **Raison du choix** : Zéro RGPD, zéro backend, zéro coût d'infra, zéro latence réseau. `localStorage` + export/import JSON suffisent pour un usage solo.
- **Impact** : `useVibefitStorage` est le seul point de persistance. La clé `vibefit_v1` dans localStorage est l'unique source de vérité.
- **Réversibilité** : Moyenne (migration possible vers une DB si multi-device requis un jour).

### 2026-05-04 — Architecture modulaire (refactoring du monolithe)
- **Décision** : Découper `App.jsx` (1478 lignes) en modules cohérents selon Clean Architecture.
- **Contexte** : Le monolithe devenait difficile à maintenir et à étendre.
- **Alternatives considérées** : Garder le monolithe, utiliser un générateur de structure.
- **Raison du choix** : Séparation stricte constantes / utils / hooks / UI / layout / vues, conforme aux react-rules du projet.
- **Impact** : Structure `src/constants/`, `src/utils/`, `src/hooks/`, `src/models/`, `src/components/ui/`, `src/components/layout/`, `src/components/views/`.
- **Réversibilité** : Facile (imports directs, pas de magie).

### 2026-05-04 — Feature Freeze V1.0 & entrée en phase RUN
- **Décision** : Gel immédiat et total de toutes les nouvelles fonctionnalités. VibeFit V1.0 est déclaré **Golden Master**. Le produit entre en cycle de test terrain intensif (RUN) pour une durée minimale de 4 semaines, jusqu'au 2026-06-01.
- **Contexte** : Le scope V1.0 est complet — tracker quotidien, WeekView analytique, poids, backup JSON, PWA offline-first, gestion des objectifs. Aucun bug bloquant connu. Le produit est prêt pour une évaluation en conditions réelles.
- **Alternatives considérées** : Continuer à itérer (historique graphique multi-semaines, notifications), lancer une bêta ouverte.
- **Raison du choix** : Toute fonctionnalité ajoutée avant test terrain est du gaspillage potentiel. La priorité est de valider les hypothèses d'usage réel avant d'investir davantage.
- **Impact** :
  - Aucune PR de feature ne sera mergée avant la fin du cycle RUN.
  - Les bugs critiques (perte de données, crash) restent éligibles à un patch d'urgence.
  - Le backlog post-RUN est documenté dans `2_project_overview.md`.
- **Réversibilité** : Facile (décision de process, non technique — peut être levée à tout moment par décision explicite).

### 2026-07-30 — Direction artistique « Millimétré » & DESIGN.md
- **Décision** : Figer une direction visuelle propre à VibeFit, registre *instrument de mesure*, et la persister dans `DESIGN.md` à la racine — document **prescriptif**, relu avant toute tâche UI. Palette gris froid + vert instrument, typographie Archivo / IBM Plex Sans / IBM Plex Mono auto-hébergée, signature « règle graduée ».
- **Contexte** : Le système visuel V1 violait deux interdits explicites du développeur — fond crème `#F6F2EC` + accent orange `#FF5A1F` (le pairing crème/terracotta refusé), et `Inter Tight` comme police de corps (Inter est banni). Il n'existait aucun document de direction : la charte se redonnait à chaque session.
- **Alternatives considérées** : (A) « Millimétré » clair et froid, signature = règle graduée ; (B) « Console » sombre, signature = trace OLS brute sur nuage de points ; (C) « Fiche clinique » typographique, signature = chiffre géant + marginalia. Également considéré : ne produire que `DESIGN.md` sans toucher au code, et un re-skin complet des 4 vues.
- **Raison du choix** : (A) tient WCAG AA le plus facilement, reste clair-first pour un usage diurne, et sa signature est la plus ancrée dans le sujet (mesurer un corps dans le temps) donc la moins générique. (B) était la plus distinctive mais aussi la plus proche du cliché « dashboard terminal ». (C) est fragile sur des écrans très denses.
- **Impact** :
  - `PALETTE` reste la source de vérité unique. Les clés `accent` / `accentDark` sont **supprimées** : leur sémantique était ambiguë (à la fois emphase décorative et « hors cible »). Leurs 37 sites d'appel ont été routés explicitement vers `deep` / `warn` / `alert` / `slate` / `ink`.
  - Nouvelle règle de couleur, à tenir : `deep` = dans la cible, `warn` = **manque**, `alert` = **hors bornes**. Un manque ordinaire n'est pas une alerte — diluer `alert` lui retire sa valeur de signal.
  - `tick` est séparé de `line` (WCAG 1.4.11 : les graduations portent l'information, ≥ 3:1 requis).
  - Polices auto-hébergées dans `public/fonts` : les 2 règles `runtimeCaching` Google Fonts de `vite.config.js` et le `<link>` CDN d'`index.html` sont retirés, devenus morts.
  - Zéro `box-shadow` dans le projet ; rayons ramenés à 0 / 2 / 3.
  - Cibles tactiles portées à ≥ 44 px partout (`NumberInput`, `Pill`, chrome du header).
- **Réversibilité** : Moyenne. Changer de palette ou de typo reste peu coûteux (tokens centralisés, 3 classes typographiques). Revenir sur la signature « règle graduée » demanderait de réécrire `Bar.jsx` et `BalanceRing.jsx`.

### 2026-07-30 — Rejet de « Millimétré », nouvelle direction « Signal » (dark, glow, référence Whoop)
- **Décision** : Abandonner la direction « Millimétré » (entrée ci-dessus, livrée le même jour) et la remplacer intégralement par « Signal » — dark-first presque noir, couleurs d'état saturées avec **glow** (halo coloré), anneaux et pistes à bouts ronds. Registre explicitement calqué sur Whoop. `DESIGN.md` réécrit en totalité, pas complété : ce n'est pas une variante de la direction précédente.
- **Contexte** : Au premier rendu de « Millimétré », le développeur l'a jugée « triste et froide », sans rapport avec une application moderne, et a cité Whoop comme référence explicite. C'est le développeur lui-même qui avait guidé la direction précédente (choix « Instrument de mesure » / palette froide) — le retour n'était donc pas une question mal comprise mais un jugement sur le résultat une fois vu en vrai, ce que la palette de propositions textuelles en amont n'avait pas permis de tester.
- **Alternatives considérées** : Ajuster « Millimétré » en surface (juste assombrir la palette en gardant la règle graduée) plutôt que changer de signature. Écarté : la règle graduée (bouts droits, ticks fins, aucun remplissage plein) est intrinsèquement le contraire du langage visuel Whoop (arcs épais à bouts ronds, glow). Un compromis aurait produit un entre-deux sans identité claire plutôt que la direction demandée.
- **Raison du choix** : Whoop est une référence nommée et non ambiguë (contrairement à un round de « 2-3 directions contrastées » sans référence) — le travail devient de traduire fidèlement cette référence dans le vocabulaire de VibeFit (macros/calories *contre une cible*, ce que Whoop ne fait pas) plutôt que d'en inventer une nouvelle.
- **Impact** :
  - `PALETTE` renommée en profondeur : `paper`→`bg`, `highlight` supprimé (routé vers `warnSoft`/`alertSoft` selon contexte), couleurs d'état resaturées pour glow (green `#2FEA7A` / amber `#FFB020` / red `#FF4D5E`), rampe catégorielle passée à blue/purple.
  - Nouveau helper `glow(hex, size)` dans `config.js` — halo `box-shadow` teinté par l'état, utilisé sur pills actives, pistes non nulles, onglet actif.
  - Rayons inversés : l'ancienne règle « 0/2/3 uniquement » est remplacée par 12–20px + `999` (rond complet) sur pistes/chips. Bouts de tracé passés de `butt` à `round`.
  - `BalanceRing` et `Bar` réécrits : l'ancienne « règle graduée » (graduations physiques, encoche gravée) devient une piste/anneau plein qui glowe, avec un marqueur de cible plus discret — la seule pièce conservée de l'ancienne signature, car propre à VibeFit (Whoop n'a pas de cible fixe).
  - `PALETTE.ink`/`PALETTE.inkSoft` inversent de rôle par rapport à avant (ink devient le texte quasi-blanc, inkSoft le texte sur remplissage saturé) — tous les sites `color: PALETTE.surface` utilisés comme "texte clair sur fond sombre" dans l'ancienne palette ont dû être réaudités un par un, pas remplacés en masse, car `surface` a changé de luminance (clair → sombre) entre les deux directions.
  - Contraste AA revérifié intégralement sur la nouvelle palette (paires bg/surface/états + texte sur remplissage saturé) ; cibles tactiles ≥44px reconfirmées après le passage aux nouveaux rayons.
- **Réversibilité** : Moyenne, comme la décision précédente. Le coût dominant n'est pas le remplacement de valeurs (tokens centralisés) mais l'audit ligne à ligne des usages sémantiquement ambigus (`PALETTE.surface` comme couleur de texte) qu'un renommage global aurait cassés silencieusement.

---
