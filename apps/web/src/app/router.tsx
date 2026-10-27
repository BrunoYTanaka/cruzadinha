import type { QueryClient } from '@tanstack/react-query'
import { createBrowserRouter, type LoaderFunction, type RouteObject } from 'react-router'
import { isServerReady, waitForServer } from '../shared/services/api/server-wake/server-wake'
import { ForgotPasswordPage } from '../pages/forgot-password/ForgotPasswordPage'
import { LoginPage } from '../pages/login/LoginPage'
import { RegisterPage } from '../pages/register/RegisterPage'
import { ResetPasswordPage } from '../pages/reset-password/ResetPasswordPage'
import { VerifyEmailPage } from '../pages/verify-email/VerifyEmailPage'
import { DayRoute } from '../pages/day/DayRoute'
import { LibraryPage } from '../pages/library/LibraryPage'
import { ServerWake } from '../features/status'
import { StatusPage } from '../pages/status/StatusPage'
import { AppLayout } from './AppLayout'
import { directPlayLoader } from '../pages/library/direct-play'
import { NotFoundPage } from '../shared/components/NotFoundPage/NotFoundPage'
import { RouteError } from './RouteError'
import { readPuzzle } from '../features/offline'
import { viewerLoader, installSessionHandlers, seedSessionFromLastUser } from '../features/session'

const serverReadyLoader: LoaderFunction = async ({ request }) => {
  await waitForServer({ signal: request.signal })
  return null
}

// A cruzada guardada abre sem esperar o servidor acordar nem a sessão (feature 041, FR-019): vale o
// último usuário conhecido e o servidor confirma depois. Sem cópia, é o que as outras telas fazem.
function gameLoader(queryClient: QueryClient): LoaderFunction {
  const waitForViewer = viewerLoader(queryClient)
  return async (args) => {
    const stored = await readPuzzle(args.params.puzzleId ?? '')
    if (stored && seedSessionFromLastUser(queryClient)) return null
    await serverReadyLoader(args)
    return waitForViewer(args)
  }
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
          path: '/jogo/:puzzleId',
          loader: gameLoader(queryClient),
          hydrateFallbackElement: <ServerWake />,
          errorElement: <RouteError />,
          // O código do jogo (tabuleiro, relógio, fila de salvamento) só carrega ao jogar.
          lazy: async () => ({ Component: (await import('../pages/game/GamePage')).GamePage }),
        },
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
            { path: '/verificar-email', element: <VerifyEmailPage /> },
            { path: '/esqueci-a-senha', element: <ForgotPasswordPage /> },
            { path: '/redefinir-senha', element: <ResetPasswordPage /> },
            {
              loader: viewerLoader(queryClient),
              children: [
                // "Ir direto ao jogo" decide antes de desenhar o calendário (feature 021).
                { path: '/', element: <LibraryPage />, loader: directPlayLoader(queryClient) },
                { path: '/dia/:date', element: <DayRoute /> },
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
