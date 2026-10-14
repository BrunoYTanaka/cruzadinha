export const MAX_ELAPSED_MS = 604_800_000

// mm:ss, e h:mm:ss a partir de 1 hora.
export function formatElapsed(ms: number): string {
  const clamped = Math.min(Math.max(Math.floor(ms), 0), MAX_ELAPSED_MS)
  const totalSeconds = Math.floor(clamped / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const mm = String(minutes).padStart(2, '0')
  const ss = String(seconds).padStart(2, '0')
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`
}

// Tempo de espera das mensagens de limite: "N s" até 59 s e "N min" (para cima) depois.
export function formatWait(seconds: number): string {
  const safe = Math.max(Math.ceil(seconds), 1)
  return safe < 60 ? `${safe} s` : `${Math.ceil(safe / 60)} min`
}

// Tempo por extenso para leitores de tela: "7 minutos e 48 segundos".
export function spokenElapsed(ms: number): string {
  const totalSeconds = Math.floor(Math.min(Math.max(ms, 0), MAX_ELAPSED_MS) / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const parts: string[] = []
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? 'hora' : 'horas'}`)
  if (minutes > 0) parts.push(`${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`)
  if (seconds > 0 || parts.length === 0) {
    parts.push(`${seconds} ${seconds === 1 ? 'segundo' : 'segundos'}`)
  }
  return parts.length > 1
    ? `${parts.slice(0, -1).join(', ')} e ${parts[parts.length - 1]}`
    : (parts[0] ?? '')
}
