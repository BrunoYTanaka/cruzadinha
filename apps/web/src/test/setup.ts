import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'
import { cleanup } from '@testing-library/react'
import { IDBFactory } from 'fake-indexeddb'
import { afterEach, beforeEach } from 'vitest'
import { resetServerWake, waitForServer } from '../shared/services/api/server-wake'
import { forgetFragmentTokens } from '../features/account/helpers/token-fragment'
import { setSettingsOpen } from '../features/settings/services/settings-open'
import { resetSettingsStore } from '../shared/services/settings-store'

// O axe tenta usar canvas para ler cores de ícones; o jsdom não tem e avisa a cada teste.
// Os arquivos em ambiente node (Function, plugin de versão) não têm HTMLCanvasElement.
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = () => null
}

// IndexedDB vazio a cada teste (progresso de visitante, feature 013); as configurações (feature 021)
// são relidas do armazenamento do teste.
// Por padrão o servidor está pronto (feature 032: a sessão só é pedida depois disso); os testes da
// espera chamam `resetServerWake()`.
beforeEach(async () => {
  resetServerWake()
  await waitForServer({
    fetch: async () => Response.json({ status: 'ok', database: 'up' }, { status: 200 }),
  })
  globalThis.indexedDB = new IDBFactory()
  resetSettingsStore()
  setSettingsOpen(false)
})

afterEach(() => {
  cleanup()
  forgetFragmentTokens()
})
