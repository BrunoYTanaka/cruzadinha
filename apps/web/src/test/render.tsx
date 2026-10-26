import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { StrictMode } from 'react'
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router'
import { setUnauthenticatedHandler } from '../shared/services/api/client'
import { waitForServer } from '../shared/services/api/server-wake'
import { installSessionHandlers } from '../features/session/services/session-handlers'

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}

// Monta as rotas num roteador em memória, com os mesmos tratadores de sessão do site.
export function renderRoutes(
  routes: RouteObject[],
  initialEntries: string[],
  queryClient: QueryClient = makeQueryClient(),
  options: { strict?: boolean } = {},
) {
  const router = createMemoryRouter(routes, { initialEntries })
  installSessionHandlers(router, queryClient)
  const tree = (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
  const view = render(options.strict ? <StrictMode>{tree}</StrictMode> : tree)
  return { router, queryClient, ...view }
}

export function resetSessionHandlers() {
  setUnauthenticatedHandler(null)
}

export const aUser = { id: '0b9a3a4e-6d0e-4b6c-9a52-1f2e3d4c5b6a', email: 'ana@exemplo.com' }

// Marca o servidor como pronto para testes que montam loaders fora do portão pai (feature 032).
// Quem usa chama `resetServerWake()` no `afterEach`.
export async function serverIsReady() {
  await waitForServer({
    fetch: async () =>
      new Response(JSON.stringify({ status: 'ok', database: 'up' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
  })
}
