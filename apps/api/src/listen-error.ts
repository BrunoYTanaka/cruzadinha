export function describeListenError(error: unknown, port: number): string {
  if (error instanceof Error && 'code' in error && error.code === 'EADDRINUSE') {
    return `porta ${port} em uso; troque PORT (ou API_PORT no Compose)`
  }
  if (error instanceof Error) {
    return `não foi possível abrir a porta ${port}: ${error.message}`
  }
  return `não foi possível abrir a porta ${port}`
}
