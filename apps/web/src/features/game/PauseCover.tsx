import { useEffect, useRef } from 'react'
import { Button } from '../../components/Button'
import styles from './PauseCover.module.css'

// Cobre o tabuleiro enquanto o jogo está pausado, para não dar para pensar com o tempo parado.
// O foco vai para "Continuar", porque o tabuleiro fica inerte.
export function PauseCover({ onResume }: { onResume: () => void }) {
  const button = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    button.current?.focus()
  }, [])
  return (
    <div className={styles.cover}>
      <p className={styles.text}>Jogo pausado</p>
      <Button variant="primary" onClick={onResume} ref={button}>
        Continuar
      </Button>
    </div>
  )
}
