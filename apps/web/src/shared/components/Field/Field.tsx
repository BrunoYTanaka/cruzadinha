import { useId, type ComponentPropsWithoutRef } from 'react'
import styles from './Field.module.css'

type FieldProps = ComponentPropsWithoutRef<'input'> & {
  label: string
  hint?: string
  error?: string
}

// Campo de formulário: rótulo visível ligado ao campo, dica e erro ligados por `aria-describedby`.
export function Field({ label, hint, error, id, ...input }: FieldProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const hintId = `${inputId}-hint`
  const errorId = `${inputId}-error`
  const describedBy = [hint ? hintId : '', error ? errorId : ''].filter(Boolean).join(' ')
  return (
    <div className={styles.field}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>
      <input
        id={inputId}
        className={styles.input}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        {...input}
      />
      {hint ? (
        <span id={hintId} className={styles.hint}>
          {hint}
        </span>
      ) : null}
      {error ? (
        <span id={errorId} className={styles.error}>
          {error}
        </span>
      ) : null}
    </div>
  )
}
