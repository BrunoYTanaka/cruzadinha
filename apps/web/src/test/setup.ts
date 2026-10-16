import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'
import { cleanup } from '@testing-library/react'
import { IDBFactory } from 'fake-indexeddb'
import { afterEach, beforeEach } from 'vitest'

// O axe tenta usar canvas para ler cores de ícones; o jsdom não tem e avisa a cada teste.
// Os arquivos em ambiente node (Function, plugin de versão) não têm HTMLCanvasElement.
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = () => null
}

// IndexedDB vazio a cada teste (progresso de visitante, feature 013).
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
})

afterEach(() => {
  cleanup()
})
