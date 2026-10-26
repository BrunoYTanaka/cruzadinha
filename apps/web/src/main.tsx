import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { ApiRequestError } from './shared/services/api/client/client'
import { installReloadAfterDeploy } from './app/reload-after-deploy'
import { createAppRouter } from './app/router'
import { installThemeSync } from './shared/themes/theme/theme'
import './shared/themes/fonts.css'
import './shared/themes/tokens.css'
import './shared/themes/light.css'
import './shared/themes/dark.css'
import './shared/themes/global.css'

const root = document.getElementById('root')
if (!root) throw new Error('elemento #root não encontrado')

// Erros 4xx não melhoram ao repetir; falha de rede e 5xx ganham até duas novas tentativas.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) =>
        !(error instanceof ApiRequestError && error.status > 0 && error.status < 500) &&
        failureCount < 2,
    },
  },
})

installReloadAfterDeploy(window)
installThemeSync()

const router = createAppRouter(queryClient)

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
