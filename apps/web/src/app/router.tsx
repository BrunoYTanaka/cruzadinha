import type { QueryClient } from '@tanstack/react-query'
import { createBrowserRouter, type LoaderFunction, type RouteObject } from 'react-router'
import { isServerReady, waitForServer } from '../api/server-wake'
import { LoginPage } from '../features/auth/LoginPage'
import { RegisterPage } from '../features/auth/RegisterPage'
import { DayRoute } from '../features/library/DayRoute'
import { LibraryPage } from '../features/library/LibraryPage'
import { ServerWake } from '../features/status/ServerWake'
import { StatusPage } from '../features/status/StatusPage'
import { AppLayout } from './AppLayout'
import { NotFoundPage } from './NotFoundPage'
import { requireSessionLoader } from './RequireSession'
import { RouteError } from './RouteError'
import { installSessionHandlers } from './session-handlers'

const serverReadyLoader: LoaderFunction = async ({ request }) => {
  await waitForServer({ signal: request.signal })
  return null
}

export function createAppRoutes(queryClient: QueryClient): RouteObject[] {
  return [
    {
      element: <AppLayout />,
      errorElement: <RouteError />,
      children: [
        // A página de status mostra o próprio health; não espera o servidor acordar.
        { path: '/status', element: <StatusPage /> },
        {
          // Espera a API gratuita acordar antes de qualquer outra tela (feature 012, FR-008). O
          // fallback aparece dentro do layout; depois de pronto, o loader não roda de novo.
          loader: serverReadyLoader,
          shouldRevalidate: () => !isServerReady(),
          hydrateFallbackElement: <ServerWake />,
          errorElement: <RouteError />,
          children: [
            { path: '/login', element: <LoginPage /> },
            { path: '/cadastro', element: <RegisterPage /> },
            {
              loader: requireSessionLoader(queryClient),
              children: [
                { path: '/', element: <LibraryPage /> },
                { path: '/dia/:date', element: <DayRoute /> },
                {
                  path: '/jogo/:puzzleId',
                  // O código do jogo (tabuleiro, relógio, fila de salvamento) só carrega ao jogar.
                  lazy: async () => ({
                    Component: (await import('../features/game/GamePage')).GamePage,
                  }),
                },
              ],
            },
            { path: '*', element: <NotFoundPage /> },
          ],
        },
      ],
    },
  ]
}

export function createAppRouter(queryClient: QueryClient) {
  const router = createBrowserRouter(createAppRoutes(queryClient))
  installSessionHandlers(router, queryClient)
  return router
}
