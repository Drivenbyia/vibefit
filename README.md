# VibeFit

Tracker quotidien de recomposition corporelle. Saisie kcal + macros (depuis FatSecret), dépense + pas (Garmin), séances, tour de taille hebdo. Cibles personnalisables (sèche / maintenance / prise de masse).

Données stockées **localement** dans `localStorage` (zéro backend, zéro compte). Backup via export/import JSON.

---

## Stack

- **React 18** + **Vite 5**
- **lucide-react** (icônes)
- Pas de Tailwind, pas de UI lib : styles inline pour éviter toute friction de build
- Fonts : Archivo (display) + Inter Tight (body) + JetBrains Mono (numbers) via Google Fonts

---

## Lancer en local

```bash
npm install
npm run dev
```

Ouvre [http://localhost:5173](http://localhost:5173).

Build de production :

```bash
npm run build
npm run preview   # pour tester le build avant deploy
```

Le résultat est dans `dist/`.

---

## Déployer sur Netlify

### Option A — Auto-deploy depuis GitHub (recommandé)

1. **Crée un repo GitHub** et pousse ce projet :
   ```bash
   git init
   git add .
   git commit -m "init: vibefit v1"
   git branch -M main
   git remote add origin git@github.com:TON_USER/vibefit.git
   git push -u origin main
   ```

2. **Sur Netlify** ([app.netlify.com](https://app.netlify.com)) :
   - *Add new site* → *Import an existing project*
   - Choisis GitHub → autorise → sélectionne `vibefit`
   - Build command : `npm run build` (auto-détecté grâce à `netlify.toml`)
   - Publish directory : `dist` (idem)
   - *Deploy site*

3. **C'est en ligne** sous une URL `https://nom-aleatoire.netlify.app`.
   Renomme-la dans *Site settings → Domain management → Change site name* (ex: `vibefit-thomas`).

À chaque `git push` sur `main`, Netlify rebuild et redéploie automatiquement.

### Option B — Drag and drop (déploiement instantané sans Git)

1. `npm run build`
2. Va sur [app.netlify.com/drop](https://app.netlify.com/drop)
3. Glisse le dossier `dist/` dans la zone
4. C'est en ligne en 30 sec

---

## Utilisation sur mobile

L'app est **responsive et installable** :

- **iPhone** : Safari → bouton Partager → *Sur l'écran d'accueil*
- **Android** : Chrome → menu → *Ajouter à l'écran d'accueil*

Elle s'ouvre alors comme une vraie app, sans la barre du navigateur.

---

## Backup des données

Tes données sont dans le `localStorage` de **chaque navigateur** où tu utilises l'app. Si tu changes de téléphone ou navigateur, elles ne sont pas synchronisées automatiquement.

**Workflow recommandé** :
- **Tous les dimanches** : onglet *Données* → *Exporter en JSON* → garde le fichier dans iCloud/Drive
- Si tu veux récupérer sur un autre appareil : *Importer un JSON* avec ton dernier export

Le fichier exporté contient toutes tes journées, tes cibles personnalisées et ton mode actuel.

---

## Cibles & presets

Onglet **Cibles** :

| Mode             | Effet                          | Bilan estimé |
|------------------|--------------------------------|--------------|
| Maintenance      | Valeurs VIBEFIT par défaut     | −1900 kcal/sem |
| Sèche légère     | −200 kcal/jour                 | −3300 kcal/sem (~250 g) |
| Sèche forte      | −400 kcal/jour, P 170g         | −4700 kcal/sem (~500 g) |
| Prise de masse   | +250 kcal/jour                 | +800 kcal/sem (~250 g) |

Tu peux aussi éditer chaque valeur à la main (passe en mode "Personnalisé").

---

## Structure du projet

```
vibefit/
├── index.html              ← entry HTML + favicon SVG inline + fonts
├── netlify.toml            ← config build & SPA redirect
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx            ← bootstrap React
    ├── App.jsx             ← l'app entière (single-file, ~1500 lignes)
    └── index.css           ← reset CSS minimal
```

Tout est dans `App.jsx`. Les composants sont organisés par sections :

1. Constantes (cibles par défaut, presets sèche/bulk)
2. Utils (dates, storage hook avec localStorage, coercion)
3. UI primitives (`Card`, `NumberInput`, `Pill`, `Bar`)
4. Header (date nav, day type pills)
5. TodayView (anneau bilan, macros, formulaires)
6. WeekView (strip 7 jours, totaux, tour de taille)
7. TargetsView (presets + édition)
8. DataView (export/import/reset)
9. App root + BottomNav

---

## Idées d'évolution

- Sync automatique Garmin via API Connect (nécessite OAuth, plus complexe)
- Sync automatique FatSecret (l'API existe mais payante)
- Graphe d'évolution sur 12 semaines
- Notifications de rappel le lundi matin pour le tour de taille
- Mode sombre automatique
- PWA avec service worker pour usage offline complet

---

Ship it.
