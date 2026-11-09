import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'
import type { GuestProgress } from '../../../../domain/guest/guest-progress'
import { Button } from '../../../../shared/components/Button/Button'
import { Notice } from '../../../../shared/components/Notice/Notice'
import { Dialog } from '../../../../shared/components/Dialog/Dialog'
import { queryKeys } from '../../../../shared/services/api/query-keys/query-keys'
import { guestStore } from '../../../guest'
import { clearDraft } from '../../../offline'
import { summarizeGuest } from '../../helpers/summarize'
import { runImport, type ImportSummary } from '../../services/run-import'
import styles from './ImportOffer.module.css'

type ImportOfferProps = {
  // Id da conta; `null` para visitante, que não recebe a oferta. Quem monta usa `key={userId}`
  // para que outra conta comece de novo, respeitando só o "Agora não" desta página.
  userId: string | null
  // Em telas em que um diálogo atrapalharia (o jogo), a oferta espera.
  suspended?: boolean
}

type Step = 'offer' | 'discard' | 'working' | 'done' | 'error'

// "Agora não" vale até a página ser recarregada: a oferta volta na próxima entrada (feature 057).
let postponed = false
export function resetPostponedImport() {
  postponed = false
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

// Oferece levar o progresso de visitante deste aparelho para a conta que acabou de entrar.
// Nada é enviado nem apagado sem um clique de confirmação.
export function ImportOffer({ userId, suspended = false }: ImportOfferProps) {
  const queryClient = useQueryClient()
  const [records, setRecords] = useState<GuestProgress[]>([])
  const [step, setStep] = useState<Step>('offer')
  const [result, setResult] = useState<ImportSummary | null>(null)
  const [hidden, setHidden] = useState(postponed)

  const load = useCallback(() => {
    void guestStore.getAll().then(setRecords)
  }, [])
  useEffect(() => {
    if (!userId) return
    load()
    return guestStore.subscribe(load)
  }, [userId, load])

  const finishing = step === 'done'
  const open = userId !== null && !suspended && !hidden && (records.length > 0 || finishing)
  if (!open) return null

  const summary = summarizeGuest(records)

  const confirmImport = async () => {
    setStep('working')
    try {
      const outcome = await runImport(records)
      setResult(outcome)
      setStep('done')
      void queryClient.invalidateQueries({ queryKey: queryKeys.libraryAll })
      void queryClient.invalidateQueries({ queryKey: ['stats'] })
    } catch {
      setStep('error')
    }
  }

  const discard = async () => {
    for (const record of records) {
      if (await guestStore.removeIfUnchanged(record.puzzleId, record.savedAt)) {
        clearDraft('guest', record.puzzleId)
      }
    }
    setHidden(true)
  }

  const notNow = () => {
    postponed = true
    setHidden(true)
  }

  if (step === 'done' && result) {
    const left = result.rejected
    return (
      <Dialog
        open
        onClose={() => setHidden(true)}
        title="Progresso importado"
        closeButton={false}
        description={`${plural(result.imported, 'cruzada importada', 'cruzadas importadas')}; ${plural(result.kept, 'já estava melhor na conta', 'já estavam melhores na conta')}.`}
      >
        {left > 0 ? (
          <p className={styles.message}>
            {plural(
              left,
              'cruzada não pôde ser importada e continua',
              'cruzadas não puderam ser importadas e continuam',
            )}{' '}
            neste aparelho.
          </p>
        ) : null}
        <div className={styles.actions}>
          <Button size="small" variant="primary" onClick={() => setHidden(true)} data-autofocus>
            Fechar
          </Button>
        </div>
      </Dialog>
    )
  }

  if (step === 'discard') {
    return (
      <Dialog
        open
        onClose={() => setStep('offer')}
        title="Descartar o progresso deste aparelho?"
        description="O que você jogou como visitante será apagado deste aparelho e não entrará na conta. Isso não pode ser desfeito."
      >
        <div className={styles.actions}>
          <Button size="small" variant="secondary" onClick={() => setStep('offer')} data-autofocus>
            Voltar
          </Button>
          <Button size="small" variant="primary" onClick={() => void discard()}>
            Descartar mesmo assim
          </Button>
        </div>
      </Dialog>
    )
  }

  const busy = step === 'working'
  return (
    <Dialog
      open
      onClose={notNow}
      title="Importar seu progresso de visitante?"
      description="Você jogou neste aparelho antes de entrar. Quer levar esse progresso para a sua conta?"
    >
      <ul className={styles.summary}>
        <li>{plural(summary.total, 'cruzada', 'cruzadas')} no aparelho</li>
        <li>{plural(summary.completed, 'concluída', 'concluídas')}</li>
        <li>{plural(summary.inProgress, 'em andamento', 'em andamento')}</li>
      </ul>
      <p className={styles.message}>
        Se a conta já tiver a mesma cruzada, fica a versão salva mais recentemente, e uma cruzada
        concluída na conta nunca é trocada.
      </p>
      {step === 'error' ? (
        <Notice variant="error">
          Não foi possível importar agora. Seu progresso continua neste aparelho.
        </Notice>
      ) : null}
      <div className={styles.actions}>
        <Button size="small" variant="quiet" onClick={() => setStep('discard')} disabled={busy}>
          Descartar
        </Button>
        <Button size="small" variant="secondary" onClick={notNow} disabled={busy}>
          Agora não
        </Button>
        <Button
          size="small"
          variant="primary"
          onClick={() => void confirmImport()}
          disabled={busy}
          data-autofocus
        >
          {busy ? 'Importando…' : 'Importar'}
        </Button>
      </div>
    </Dialog>
  )
}
