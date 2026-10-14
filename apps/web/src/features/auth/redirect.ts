// O endereço de origem vai na própria URL do login (`?next=`), o que sobrevive a recarregar a
// página; `redirect()` do React Router não carrega `state`.
export function buildLoginPath(from: string): string {
  return from === '/' || from === '' ? '/login' : `/login?next=${encodeURIComponent(from)}`
}

// Só caminhos internos: nunca outra origem, nunca de volta ao login ou ao cadastro.
export function safeNext(value: string | null | undefined): string {
  if (!value) return '/'
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return '/'
  if (/^\/(login|cadastro)(\/|\?|$)/.test(value)) return '/'
  return value
}
