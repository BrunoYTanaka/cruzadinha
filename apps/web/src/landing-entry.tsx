import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import { LandingShell } from './app/LandingShell'

// Entrada só do build (feature 048): `prerender-plugin.ts` a carrega num build SSR e põe o HTML no
// `#root` do `index.html`, para o texto da landing estar na página entregue sem JavaScript.
export function renderLanding(): string {
  return renderToString(
    <StaticRouter location="/">
      <LandingShell />
    </StaticRouter>,
  )
}
