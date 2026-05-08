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

---
