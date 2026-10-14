import { useEffect } from 'react'

// Cada tela dá nome à aba; o nome do site fica no fim.
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    const previous = document.title
    document.title = title ? `${title} · Cruzadinha` : 'Cruzadinha'
    return () => {
      document.title = previous
    }
  }, [title])
}
