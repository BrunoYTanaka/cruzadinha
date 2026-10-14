import { Pill } from '../../components/Pill'
import { VisuallyHidden } from '../../components/VisuallyHidden'
import type { GameLimits, HelpResult } from '../../game-logic/state'
import styles from './HelpButtons.module.css'

type HelpButtonsProps = {
  usage: GameLimits
  limits: GameLimits
  lastHelp: HelpResult | null
  disabled?: boolean
  onLetter: () => void
  onWord: () => void
  onVerify: () => void
}

function announcement(help: HelpResult | null): string {
  if (!help) return ''
  switch (help.kind) {
    case 'letter':
      return 'Letra revelada'
    case 'word':
      return help.count === 1
        ? 'Palavra revelada: 1 letra'
        : `Palavra revelada: ${help.count} letras`
    case 'verify':
      return help.count === 0
        ? 'Verificado: nenhuma letra errada'
        : help.count === 1
          ? 'Verificado: 1 letra errada'
          : `Verificado: ${help.count} letras erradas`
    case 'letter-limit':
      return 'Limite de letras atingido'
    case 'word-limit':
      return 'Limite de palavras atingido'
    case 'nothing':
      return 'Nada para ajudar aqui'
  }
}

// As três ajudas na faixa de ferramentas. Esgotada fica `aria-disabled` (continua focável, para o
// leitor de tela explicar o motivo) e não age.
export function HelpButtons({
  usage,
  limits,
  lastHelp,
  disabled = false,
  onLetter,
  onWord,
  onVerify,
}: HelpButtonsProps) {
  const lettersLeft = limits.letters - usage.letters
  const wordsLeft = limits.words - usage.words
  const lettersOut = lettersLeft <= 0
  const wordsOut = wordsLeft <= 0
  return (
    <>
      <Pill
        className={styles.help}
        aria-disabled={disabled || lettersOut || undefined}
        aria-label={
          lettersOut
            ? `Revelar letra: limite de ${limits.letters} atingido`
            : `Revelar letra: ${usage.letters} de ${limits.letters} usadas`
        }
        onClick={disabled || lettersOut ? undefined : onLetter}
      >
        <span aria-hidden="true">
          {usage.letters}/{limits.letters} Letra
        </span>
      </Pill>
      <Pill
        className={styles.help}
        aria-disabled={disabled || wordsOut || undefined}
        aria-label={
          wordsOut
            ? `Revelar palavra: limite de ${limits.words} atingido`
            : `Revelar palavra: ${usage.words} de ${limits.words} usadas`
        }
        onClick={disabled || wordsOut ? undefined : onWord}
      >
        <span aria-hidden="true">
          {usage.words}/{limits.words} Palavra
        </span>
      </Pill>
      <Pill
        className={styles.help}
        aria-disabled={disabled || undefined}
        onClick={disabled ? undefined : onVerify}
      >
        Verificar
      </Pill>
      <VisuallyHidden role="status" aria-live="polite">
        {/* O número da ajuda muda o texto vivo mesmo quando a frase se repete. */}
        {announcement(lastHelp)}
        {lastHelp ? <span hidden>{lastHelp.seq}</span> : null}
      </VisuallyHidden>
    </>
  )
}
