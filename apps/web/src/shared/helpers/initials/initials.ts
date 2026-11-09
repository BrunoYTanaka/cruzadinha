// Iniciais do círculo da conta no cabeçalho (feature 062): até duas letras ou números do e-mail,
// em maiúsculas. Nunca vazio: sem nenhuma letra ou número, volta "?".
export function initials(email: string): string {
  const local = (email.split('@')[0] ?? '').normalize('NFD').replace(/\p{M}/gu, '')
  const parts = local.split(/[^\p{L}\p{N}]+/u).filter(Boolean)
  const letters =
    parts.length >= 2 ? [parts[0]?.[0], parts[1]?.[0]] : [...(parts[0] ?? '')].slice(0, 2)
  const result = letters.filter(Boolean).join('').toUpperCase()
  return result || '?'
}
