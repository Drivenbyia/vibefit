# Règles strictes React — VibeFit

## 1. Composants fonctionnels purs exclusivement
- **Interdit** : `class MyComponent extends React.Component`. Zéro classe, sans exception.
- **Obligatoire** : Chaque composant est une fonction pure qui retourne du JSX.
- Un composant ne doit produire aucun effet de bord dans son corps principal (uniquement dans des `useEffect`).

## 2. Immutabilité de l'état — interdiction absolue de mutation directe
- **Interdit** : `state.items.push(x)`, `state.user.name = "foo"`, toute mutation in-place.
- **Obligatoire** : Toujours retourner un nouvel objet/tableau depuis les setters.
  ```js
  // ✅ correct
  setItems(prev => [...prev, newItem]);
  setUser(prev => ({ ...prev, name: "foo" }));

  // ❌ interdit
  items.push(newItem);
  user.name = "foo";
  ```

## 3. Séparation stricte logique / UI

### Hooks (logique métier)
- Toute logique réutilisable vit dans un custom hook `use[NomDuConcept].js` dans `src/hooks/`.
- Un hook ne retourne jamais de JSX.
- Les appels fetch, les calculs, la gestion d'état complexe = dans les hooks.

### Composants (affichage)
- Un composant d'affichage reçoit ses données via props et appelle des callbacks.
- Il ne contient pas de logique métier inline.
- Règle des 80 lignes : si un composant dépasse 80 lignes, envisager de le découper.

## 4. Règles useEffect
- Chaque `useEffect` doit avoir un tableau de dépendances explicite et exhaustif.
- **Interdit** : `useEffect(() => { ... })` sans tableau (effet infini).
- Toute valeur référencée dans l'effet doit figurer dans les dépendances.
- Nettoyer les abonnements, timers et listeners dans la fonction de cleanup.
  ```js
  useEffect(() => {
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer); // cleanup obligatoire
  }, [tick]);
  ```

## 5. Props et typage
- Nommer les props de manière descriptive et explicite.
- Déstructurer les props en signature de fonction : `function Card({ title, onPress })`.
- Ne pas passer d'objets entiers si seuls quelques champs sont utilisés.

## 6. Performance
- Utiliser `React.memo` pour les composants purs recevant des props stables.
- Utiliser `useCallback` pour les fonctions passées en props à des composants mémoïsés.
- Utiliser `useMemo` uniquement pour des calculs réellement coûteux (pas par défaut).
