// Regras de fronteira do site e da API (specs/037-reorganizar-por-feature/contracts/boundaries.md).
// Rode com `npm run check:deps`. Todas as regras são erro: o lint (e, por ele, o commit, o push e a CI) falha numa violação.
const SEVERITY = 'error'

const WEB = '^apps/web/src'
const API = '^apps/api/src'
// Uma feature só importa de feature anterior (D2); conta e status só de session.
const FEATURE_ORDER = ['session', 'guest', 'offline', 'library', 'settings', 'game']
const NOT_INDEX = '(?!index\\.tsx?$)'

const featureOrderRules = FEATURE_ORDER.flatMap((name, rank) => {
  const later = FEATURE_ORDER.slice(rank + 1)
  if (later.length === 0) return []
  return [
    {
      name: `web-feature-order-${name}`,
      comment: `features/${name} não importa de feature posterior na ordem ${FEATURE_ORDER.join(' < ')}`,
      severity: SEVERITY,
      from: { path: `${WEB}/features/${name}/` },
      to: { path: `${WEB}/features/(${later.join('|')})/` },
    },
  ]
})

module.exports = {
  forbidden: [
    {
      name: 'no-cycles',
      comment: 'Sem ciclos de importação (site e API).',
      severity: SEVERITY,
      from: {},
      to: { circular: true },
    },

    // --- site ---
    {
      name: 'web-layer-app',
      comment: 'Só `main` e o router conhecem app/; o resto não importa de app/.',
      severity: SEVERITY,
      from: { path: `${WEB}/(shared|domain|features|pages)/` },
      to: { path: `${WEB}/app/` },
    },
    {
      name: 'web-layer-pages',
      comment: 'Feature, shared e domain nunca importam de pages/.',
      severity: SEVERITY,
      from: { path: `${WEB}/(shared|domain|features)/` },
      to: { path: `${WEB}/pages/` },
    },
    {
      name: 'web-pages-isolated',
      comment: 'Uma página não importa de outra página.',
      severity: SEVERITY,
      from: { path: `${WEB}/pages/([^/]+)/` },
      to: { path: `${WEB}/pages/`, pathNot: `${WEB}/pages/$1/` },
    },
    {
      name: 'web-shared-up',
      comment: 'shared e domain nunca importam de features/; domain não importa de shared.',
      severity: SEVERITY,
      from: { path: `${WEB}/(shared|domain)/` },
      to: { path: `${WEB}/features/` },
    },
    {
      name: 'web-domain-no-shared',
      severity: SEVERITY,
      from: { path: `${WEB}/domain/` },
      to: { path: `${WEB}/shared/` },
    },
    {
      name: 'web-domain-pure',
      comment: 'Regra pura: sem React.',
      severity: SEVERITY,
      from: { path: `${WEB}/domain/` },
      to: { dependencyTypes: ['npm'], path: '^(react|react-dom|react-router|@tanstack)' },
    },
    {
      name: 'web-feature-public-api',
      comment: 'Entre features só pelo index.ts.',
      severity: SEVERITY,
      from: { path: `${WEB}/features/([^/]+)/` },
      to: {
        path: `${WEB}/features/[^/]+/${NOT_INDEX}`,
        pathNot: `${WEB}/features/$1/`,
      },
    },
    ...featureOrderRules,
    {
      name: 'web-account-status-only-session',
      comment: 'account e status dependem só de session e do que é compartilhado.',
      severity: SEVERITY,
      from: { path: `${WEB}/features/(account|status)/` },
      to: {
        path: `${WEB}/features/(guest|library|settings|game|account|status)/`,
        pathNot: `${WEB}/features/$1/`,
      },
    },
    {
      name: 'web-guest-no-feature',
      comment: 'guest só usa domain e shared.',
      severity: SEVERITY,
      from: { path: `${WEB}/features/guest/` },
      to: { path: `${WEB}/features/`, pathNot: `${WEB}/features/guest/` },
    },

    {
      name: 'web-landing-no-feature',
      comment: 'landing (feature 048) só usa domain e shared; fora da ordem das features.',
      severity: SEVERITY,
      from: { path: `${WEB}/features/landing/` },
      to: { path: `${WEB}/features/`, pathNot: `${WEB}/features/landing/` },
    },

    // --- API ---
    {
      name: 'api-platform-up',
      comment: 'platform/ não conhece modules/ nem sources/.',
      severity: SEVERITY,
      from: { path: `${API}/platform/` },
      to: { path: `${API}/(modules|sources)/` },
    },
    {
      name: 'api-rate-limit-entry',
      severity: SEVERITY,
      from: { pathNot: `${API}/platform/rate-limit/` },
      to: { path: `${API}/platform/rate-limit/${NOT_INDEX}` },
    },
    {
      name: 'api-email-entry',
      severity: SEVERITY,
      from: { pathNot: `${API}/platform/email/` },
      to: { path: `${API}/platform/email/${NOT_INDEX}` },
    },
    {
      name: 'api-modules-isolated',
      comment: 'Módulo só importa de outro pelo index.ts.',
      severity: SEVERITY,
      from: { path: `${API}/modules/([^/]+)/` },
      to: {
        path: `${API}/modules/[^/]+/${NOT_INDEX}`,
        pathNot: `${API}/modules/$1/`,
      },
    },
    {
      name: 'api-identity-sessions-alone',
      comment: 'identity/sessions não importa de registration nem de recovery.',
      severity: SEVERITY,
      from: { path: `${API}/modules/identity/sessions/` },
      to: { path: `${API}/modules/identity/(registration|recovery|account)/` },
    },
    {
      name: 'api-identity-registration-alone',
      comment: 'identity/registration não importa de sessions nem de recovery.',
      severity: SEVERITY,
      from: { path: `${API}/modules/identity/registration/` },
      to: { path: `${API}/modules/identity/(sessions|recovery|account)/` },
    },
    {
      name: 'api-identity-recovery-no-registration',
      comment: 'identity/recovery só usa sessions (para encerrar sessões), nunca registration.',
      severity: SEVERITY,
      from: { path: `${API}/modules/identity/recovery/` },
      to: { path: `${API}/modules/identity/(registration|account)/` },
    },
    {
      name: 'api-identity-account-no-registration',
      comment: 'identity/account usa sessions e recovery, nunca registration.',
      severity: SEVERITY,
      from: { path: `${API}/modules/identity/account/` },
      to: { path: `${API}/modules/identity/registration/` },
    },
    {
      name: 'web-api-never-import',
      comment: 'O site e a API nunca importam um do outro; o que os dois usam fica em shared.',
      severity: SEVERITY,
      from: { path: '^apps/web/' },
      to: { path: '^apps/api/' },
    },
    {
      name: 'api-web-never-import',
      severity: SEVERITY,
      from: { path: '^apps/api/' },
      to: { path: '^apps/web/' },
    },
    {
      name: 'api-sources-isolated',
      severity: SEVERITY,
      from: { path: `${API}/sources/([^/]+)/` },
      to: {
        path: `${API}/sources/[^/]+/`,
        pathNot: [`${API}/sources/$1/`, `${API}/sources/common/`],
      },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: {
      path: [
        '\\.css$',
        '\\.test\\.tsx?$',
        '\\.int\\.test\\.ts$',
        `${WEB}/test/`,
        `${API}/test/`,
        '^apps/web/e2e/',
        '/fixtures',
      ],
    },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.base.json' },
    enhancedResolveOptions: { extensions: ['.ts', '.tsx', '.js', '.mjs'] },
  },
}
