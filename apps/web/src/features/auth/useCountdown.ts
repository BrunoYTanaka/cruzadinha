import { useEffect, useState } from 'react'

type Countdown = { endsAt: number; now: number; total: number; hidden: boolean }

// Contagem regressiva até o próximo reenvio permitido. O tempo vem sempre da API (`retryAfter`),
// nunca de um número fixo (feature 035, FR-014).
export function useCountdown(): {
  secondsLeft: number
  total: number
  // Com `hidden`, a espera existe mas o tempo não aparece (e-mail indisponível, FR-018).
  hidden: boolean
  start: (seconds: number, options?: { hidden?: boolean }) => void
} {
  const [state, setState] = useState<Countdown>({ endsAt: 0, now: 0, total: 0, hidden: false })

  useEffect(() => {
    if (state.endsAt === 0) return
    const id = setInterval(() => {
      const now = Date.now()
      setState((current) => ({ ...current, now }))
      if (now >= state.endsAt) clearInterval(id)
    }, 1000)
    return () => clearInterval(id)
  }, [state.endsAt])

  return {
    secondsLeft: Math.max(0, Math.ceil((state.endsAt - state.now) / 1000)),
    total: state.total,
    hidden: state.hidden,
    start(seconds, options) {
      const now = Date.now()
      setState({
        endsAt: now + seconds * 1000,
        now,
        total: seconds,
        hidden: options?.hidden ?? false,
      })
    },
  }
}
