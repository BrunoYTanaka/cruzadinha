import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// O axe tenta usar canvas para ler cores de ícones; o jsdom não tem e avisa a cada teste.
HTMLCanvasElement.prototype.getContext = () => null

afterEach(() => {
  cleanup()
})
