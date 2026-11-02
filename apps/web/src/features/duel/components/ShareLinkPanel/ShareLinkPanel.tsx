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

  return (
    <div className={styles.panel}>
      <div className={styles.row}>
        <span className={styles.label}>Link do convite</span>
        <p className={styles.value}>{invite}</p>
        <Button onClick={() => void onCopy('Link', invite)}>Copiar link</Button>
      </div>
      <div className={styles.row}>
        <span className={styles.label}>Código para digitar</span>
        <p
          className={`${styles.value} ${styles.code}`}
          aria-label={`Código ${code.split('').join(' ')}`}
        >
          {code}
        </p>
        <Button onClick={() => void onCopy('Código', code)}>Copiar código</Button>
      </div>
      {participantToken ? (
        <div className={styles.row}>
          <span className={styles.label}>Link para voltar a este x1</span>
          <p className={styles.value}>{returnUrl(linkToken, participantToken)}</p>
          <p className={styles.hint}>
            Guarde este link: ele devolve o seu x1 em outro aparelho. Sem ele, e sem este aparelho,
            o x1 se perde. Não o envie a ninguém.
          </p>
          <Button
            onClick={() => void onCopy('Link de retorno', returnUrl(linkToken, participantToken))}
          >
            Copiar link de retorno
          </Button>
        </div>
      ) : null}
      <p role="status" className={styles.hint}>
        {notice}
      </p>
    </div>
  )
}
