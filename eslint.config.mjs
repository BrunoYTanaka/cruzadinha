// @ts-check
import js from '@eslint/js'
import prettierConfig from 'eslint-config-prettier'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import reactHooks from 'eslint-plugin-react-hooks'
import { defineConfig } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig(
  {
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      '**/test-results/**',
      '**/playwright-report/**',
      '.specify/**',
      '.claude/**',
      // Scripts de fixture imitam o arquivo do jogo de terceiros (rodam só na sandbox, nos testes).
      'apps/api/src/sources/clube/fixtures/**',
    ],
  },
  {
    files: ['**/*.{ts,tsx,js,mjs}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    files: ['apps/api/**', 'packages/**', 'apps/web/e2e/**', '**/*.config.{ts,mjs}'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    // Pages Functions rodam no runtime de Workers (Request, Response, fetch).
    files: ['apps/web/functions/**/*.ts'],
    languageOptions: {
      globals: globals.serviceworker,
    },
  },
  {
    files: ['apps/web/version-plugin*.ts', 'apps/web/public-headers.test.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended, jsxA11y.flatConfigs.recommended],
    languageOptions: {
      globals: globals.browser,
    },
  },
  prettierConfig,
)
