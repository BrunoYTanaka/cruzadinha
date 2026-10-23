import variant from '@jitl/quickjs-singlefile-mjs-release-sync'
import {
  newQuickJSWASMModuleFromVariant,
  shouldInterruptAfterDeadline,
  type QuickJSContext,
  type QuickJSWASMModule,
} from 'quickjs-emscripten-core'

// O arquivo do jogo vem de um terceiro e é código: roda aqui dentro de um QuickJS compilado para
// WebAssembly, que não tem rede, arquivos, `process` nem `require`, e que não recebe nenhuma função
// do servidor. Também tem memória, pilha e tempo limitados (research R1).
export type SandboxLimits = {
  memoryBytes: number
  stackBytes: number
  timeoutMs: number
  /** Tamanho máximo do texto que o script pode entregar. */
  maxBytes: number
}

export const DEFAULT_LIMITS: SandboxLimits = {
  memoryBytes: 32 * 1024 * 1024,
  // A pilha do WebAssembly é menor que 512 KB: acima disso o estouro vira erro do Node, não do QuickJS.
  stackBytes: 256 * 1024,
  timeoutMs: 1_000,
  maxBytes: 1_048_576,
}

export type SandboxResult = { ok: true; value: string } | { ok: false; detail: string }

// O módulo WebAssembly é carregado uma vez; cada leitura cria um runtime novo e o descarta.
let quickjs: Promise<QuickJSWASMModule> | undefined
const loadQuickJs = () => (quickjs ??= newQuickJSWASMModuleFromVariant(variant))

/**
 * Executa o script e devolve o texto da variável global `CrosswordPuzzleData`. O detalhe da falha
 * só diz o que deu errado, nunca o conteúdo do script nem do erro que ele produziu.
 */
export async function readPuzzleData(
  script: string,
  limits: SandboxLimits = DEFAULT_LIMITS,
): Promise<SandboxResult> {
  const module = await loadQuickJs()
  const runtime = module.newRuntime()
  let context: QuickJSContext | undefined
  try {
    runtime.setMemoryLimit(limits.memoryBytes)
    runtime.setMaxStackSize(limits.stackBytes)
    runtime.setInterruptHandler(shouldInterruptAfterDeadline(Date.now() + limits.timeoutMs))
    context = runtime.newContext()

    const evaluated = context.evalCode(script, 'jogo.js')
    if (evaluated.error) {
      evaluated.error.dispose()
      return { ok: false, detail: 'script: falhou ao executar' }
    }
    evaluated.value.dispose()

    const data = context.getProp(context.global, 'CrosswordPuzzleData')
    try {
      if (context.typeof(data) !== 'string') {
        return { ok: false, detail: 'script: CrosswordPuzzleData ausente ou não é texto' }
      }
      const value = context.getString(data)
      if (Buffer.byteLength(value) > limits.maxBytes) {
        return { ok: false, detail: 'script: resultado grande demais' }
      }
      return { ok: true, value }
    } finally {
      data.dispose()
    }
  } catch {
    // Um erro do próprio motor (como o estouro da pilha do WebAssembly) deixa a instância num
    // estado que não se pode reaproveitar: descarta o módulo e carrega outro na próxima leitura.
    quickjs = undefined
    return { ok: false, detail: 'script: falha na sandbox' }
  } finally {
    try {
      context?.dispose()
      runtime.dispose()
    } catch {
      quickjs = undefined
    }
  }
}
