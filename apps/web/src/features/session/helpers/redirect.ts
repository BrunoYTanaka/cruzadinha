// O endereço de origem vai na própria URL do login (`?next=`), o que sobrevive a recarregar a
// página; `redirect()` do React Router não carrega `state`.
export function buildLoginPath(from: string): string {
  return from === '/' || from === '' ? '/login' : `/login?next=${encodeURIComponent(from)}`
}

// Só caminhos internos: nunca outra origem, nunca de volta ao login ou ao cadastro. Sem destino
// válido, quem entrou vai ao calendário (a landing, em `/`, é para quem chega de fora; feature 048).
export function safeNext(value: string | null | undefined): string {
  if (!value) return '/calendario'
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\'))
    return '/calendario'
  if (/^\/(login|cadastro)(\/|\?|$)/.test(value)) return '/calendario'
  return value
}
