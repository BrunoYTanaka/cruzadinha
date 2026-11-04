import { useState } from 'react'
import { Button } from '../../../../shared/components/Button/Button'
import styles from './ShareLinkPanel.module.css'

type Props = {
  linkToken: string
  code: string
  // Só o visitante tem token: ele ganha o link de retorno, com o token no fragmento.
  participantToken?: string
}

export function inviteUrl(linkToken: string, origin = window.location.origin): string {
  return `${origin}/x1/${linkToken}`
}

export function returnUrl(linkToken: string, participantToken: string): string {
  return `${inviteUrl(linkToken)}#p=${participantToken}`
}

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export function ShareLinkPanel({ linkToken, code, participantToken }: Props) {
  const [notice, setNotice] = useState('')
  const invite = inviteUrl(linkToken)

  async function onCopy(label: string, text: string) {
    setNotice(
      (await copy(text))
        ? `${label} copiado.`
        : `Não foi possível copiar. Selecione o texto de ${label.toLowerCase()}.`,
    )
  }

  const linkRow = (
    <div className={styles.block}>
      <h2 className={styles.label}>Link do convite</h2>
      <div className={styles.copyRow}>
        <p className={styles.value}>{invite}</p>
        <Button onClick={() => void onCopy('Link', invite)}>Copiar link</Button>
      </div>
    </div>
  )
  const codeRow = (
    <div className={styles.block}>
      <h2 className={styles.label}>Código</h2>
      <p className={styles.codeBox} aria-label={`Código ${code.split('').join(' ')}`}>
        {code}
      </p>
    </div>
  )

  return (
    <div className={styles.panel}>
      {participantToken ? linkRow : codeRow}
      {participantToken ? codeRow : linkRow}
      {participantToken ? (
        <div className={styles.block}>
          <h2 className={styles.label}>Link para voltar a este x1</h2>
          <div className={styles.copyRow}>
            <p className={styles.value}>{returnUrl(linkToken, participantToken)}</p>
            <Button
              onClick={() => void onCopy('Link de retorno', returnUrl(linkToken, participantToken))}
            >
              Copiar link
            </Button>
          </div>
          <p className={styles.hint}>
            Guarde este link: ele devolve o seu x1 em outro aparelho. Sem ele, e sem este aparelho,
            o x1 se perde. Não o envie a ninguém.
          </p>
        </div>
      ) : null}
      <p role="status" className={styles.hint}>
        {notice}
      </p>
    </div>
  )
}
