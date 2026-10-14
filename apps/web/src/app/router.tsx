import type { QueryClient } from '@tanstack/react-query'
import { createBrowserRouter, type RouteObject } from 'react-router'
import { LoginPage } from '../features/auth/LoginPage'
import { RegisterPage } from '../features/auth/RegisterPage'
import { DayRoute } from '../features/library/DayRoute'
import { LibraryPage } from '../features/library/LibraryPage'
import { StatusPage } from '../features/status/StatusPage'
import { AppLayout } from './AppLayout'
import { LoadingState } from './ErrorState'
import { NotFoundPage } from './NotFoundPage'
import { requireSessionLoader } from './RequireSession'
import { RouteError } from './RouteError'
import { installSessionHandlers } from './session-handlers'

export function createAppRoutes(queryClient: QueryClient): RouteObject[] {
  return [
    {
      element: <AppLayout />,
      hydrateFallbackElement: <LoadingState />,
      errorElement: <RouteError />,
      children: [
        { path: '/login', element: <LoginPage /> },
        { path: '/cadastro', element: <RegisterPage /> },
        { path: '/status', element: <StatusPage /> },
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
  ]
}

export function createAppRouter(queryClient: QueryClient) {
  const router = createBrowserRouter(createAppRoutes(queryClient))
  installSessionHandlers(router, queryClient)
  return router
}
