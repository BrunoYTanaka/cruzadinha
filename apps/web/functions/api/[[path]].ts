import { proxyRequest } from '../proxy'

// Pages Function que atende todo /api/*. A lógica e os testes ficam em ../proxy.ts.
export const onRequest = (context: { request: Request; env: unknown }) =>
  proxyRequest(context.request, context.env, fetch)
