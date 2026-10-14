import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { ApiRequestError } from './api/client'
import { createAppRouter } from './app/router'
import './themes/fonts.css'
import './themes/tokens.css'
import './themes/light.css'
import './themes/dark.css'
import './themes/global.css'

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

const router = createAppRouter(queryClient)

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
