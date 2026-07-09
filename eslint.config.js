const { FlatCompat } = require('@eslint/eslintrc');
const js = require('@eslint/js');

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

module.exports = [
  {
    ignores: ['dist/**', 'doc/**', 'scripts/**', 'eslint.config.js'],
  },
  ...compat.config({
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint', 'n', 'prettier'],
    parserOptions: {
      tsconfigRootDir: __dirname,
      project: ['./tsconfig.json'],
    },
    extends: [
      'eslint:recommended',
      'plugin:n/recommended',
      'plugin:@typescript-eslint/eslint-recommended',
      'plugin:@typescript-eslint/recommended',
      'plugin:@typescript-eslint/recommended-requiring-type-checking',
      'plugin:prettier/recommended',
    ],
    rules: {
      'prettier/prettier': 'warn',
      // The node plugin does not understand this repo's TS path/transformer setup.
      'n/no-missing-import': 'off',
      'n/no-empty-function': 'off',
      'n/no-unsupported-features/es-syntax': 'off',
      'n/no-missing-require': 'off',
      'n/shebang': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      // Existing test/helper structure still has declaration-order dependencies.
      '@typescript-eslint/no-use-before-define': 'off',
      quotes: ['warn', 'single', { avoidEscape: true }],
      // Tests and build-time transformer inputs import files outside published package paths.
      'n/no-unpublished-import': 'off',
      // Existing Salesforce/JSForce and test-helper boundaries use broad untyped values.
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-explicit-any': 'off',

      // Existing namespace and unsafe-value usage needs a larger type-tightening pass.
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      // Chai's fluent assertion style needs a test-specific rule configuration.
      '@typescript-eslint/no-unused-expressions': 'off',
      // Async and promise/error rules need behavioral review before broad enablement.
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/only-throw-error': 'error',
      '@typescript-eslint/prefer-promise-reject-errors': 'off',
      '@typescript-eslint/no-require-imports': 'error',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/unbound-method': 'off',
      // Remaining core rule disables require focused code cleanup passes.
      'no-async-promise-executor': 'off',
      'no-useless-escape': 'off',
      'no-case-declarations': 'off',
      'no-useless-assignment': 'error',
      'preserve-caught-error': 'error',
    },
  }),
];
