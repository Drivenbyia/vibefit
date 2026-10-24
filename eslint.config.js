import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

/**
 * Linter VibeFit — traduit en règles vérifiables ce que `.claude/rules/react-rules.md`
 * demande à la main. Rien ici ne modifie le code : `npm run lint` ne fait que lire.
 */
export default [
  { ignores: ['dist/**', 'dev-dist/**', 'node_modules/**', 'public/**'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser },
    },
    settings: { react: { version: '18.3' } },
    plugins: { react, 'react-hooks': reactHooks },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      // react-rules §4 : dépendances explicites et exhaustives, règles des hooks.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      // react-rules §1 : zéro composant classe, sans exception.
      'no-restricted-syntax': ['error', {
        selector: 'ClassDeclaration[superClass], ClassExpression[superClass]',
        message: 'Composants fonctionnels uniquement (react-rules §1).',
      }],
      // Pas de TypeScript ni de PropTypes dans le projet : les props sont
      // déstructurées en signature (react-rules §5).
      'react/prop-types': 'off',
      // Texte français : l'apostrophe s'affiche correctement en JSX. Seuls
      // `>` et `}` y sont réellement ambigus.
      'react/no-unescaped-entities': ['error', { forbid: ['>', '}'] }],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
    },
  },
  {
    // Configs d'outillage et tests : environnement Node.
    files: ['*.config.js', 'src/**/__tests__/**'],
    languageOptions: { globals: { ...globals.node } },
  },
];
