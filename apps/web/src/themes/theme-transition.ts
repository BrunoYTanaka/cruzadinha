// Troca de tema animada pelo botão das configurações (feature 021): a página no tema novo aparece
// num círculo que cresce a partir do botão. Usa a View Transitions API do navegador; sem ela, ou
// com redução de movimento pedida pelo aparelho, o tema muda na hora (FR-007d).

type RunningTransition = { skipTransition: () => void; finished: Promise<void> }
// Navegadores antigos não têm `startViewTransition`, embora o tipo do DOM diga que sim.
type MaybeTransitionDocument = {
  startViewTransition?: (update: () => void) => RunningTransition
}

let running: RunningTransition | null = null

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

// `apply` muda o tema (grava a configuração, que aplica o `data-theme`). `origin` é o centro do
// botão, em px da janela.
export function startThemeTransition(apply: () => void, origin: { x: number; y: number }): void {
  const doc = document as unknown as MaybeTransitionDocument
  // Cliques seguidos: a anterior termina na hora, sem animações empilhadas.
  running?.skipTransition()
  running = null
  if (typeof doc.startViewTransition !== 'function' || prefersReducedMotion()) {
    apply()
    return
  }
  const root = document.documentElement
  root.style.setProperty('--theme-x', `${Math.round(origin.x)}px`)
  root.style.setProperty('--theme-y', `${Math.round(origin.y)}px`)
  const transition = doc.startViewTransition.call(document, apply)
  running = transition
  void transition.finished
    .catch(() => {})
    .finally(() => {
      if (running === transition) running = null
    })
}
