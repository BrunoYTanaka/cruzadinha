import pkg from '../package.json' with { type: 'json' }

// Versão da API (semver do package.json), mantida pela release-please e embutida no build.
// Aparece no /api/health para o workflow de publicação saber o que está no ar (feature 012).
export const API_VERSION: string = pkg.version
