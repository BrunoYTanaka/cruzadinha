import { LandingContent } from '../../features/landing'
import { LoadingState } from '../../shared/components/LoadingState/LoadingState'
import { getSettings } from '../../shared/services/settings-store/settings-store'

// O título da aba é o do `index.html`, que também é o que o buscador lê (feature 048).
export function LandingPage() {
  return <LandingContent />
}

// Enquanto o loader de `/` roda: a landing, ou a tela de espera do servidor para quem ligou "Ir direto
// ao jogo", que não deve ver a landing nem uma tela em branco (feature 048, FR-002).
export function LandingFallback() {
  return getSettings().directToGame ? <LoadingState level={1} /> : <LandingContent />
}
