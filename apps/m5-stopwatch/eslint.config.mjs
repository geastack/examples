import js from '@eslint/js'
import globals from 'globals'
import stylistic from '@stylistic/eslint-plugin'
import prettier from 'eslint-config-prettier'
import tseslint from 'typescript-eslint'

export default [
  { ignores: ['node_modules/**', '.gea/**', 'dist/**', 'assets/**', 'native/**'] },
  { languageOptions: { globals: { ...globals.node, ...globals.browser } } },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    files: ['**/*.{mjs,ts,tsx}'],
    plugins: { '@stylistic': stylistic },
    rules: {
      eqeqeq: ['error', 'always'],
      'one-var': ['error', 'never'],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      curly: ['error', 'all'],
      '@stylistic/lines-between-class-members': [
        'error',
        {
          enforce: [
            { blankLine: 'always', prev: '*', next: 'method' },
            { blankLine: 'always', prev: 'method', next: '*' },
          ],
        },
      ],
      '@stylistic/padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: 'import', next: '*' },
        { blankLine: 'any', prev: 'import', next: 'import' },
        { blankLine: 'always', prev: ['const', 'let', 'var'], next: '*' },
        { blankLine: 'any', prev: ['const', 'let', 'var'], next: ['const', 'let', 'var'] },
        {
          blankLine: 'always',
          prev: '*',
          next: ['return', 'class', 'function', 'interface', 'type'],
        },
        {
          blankLine: 'always',
          prev: ['block-like', 'class', 'function', 'interface', 'type'],
          next: '*',
        },
      ],
    },
  },
]
