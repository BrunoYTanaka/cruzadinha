import { forwardRef, type ComponentProps } from 'react'
import { Link as RouterLink } from 'react-router'
import styles from './Link.module.css'

type LinkProps = ComponentProps<typeof RouterLink>

// Link de texto do site (feature 062): negrito em repouso e sublinhado amarelo que corre da
// esquerda para a direita com o mouse. Para navegar dentro do site; o `<a>` externo usa `ExternalLink`.
export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { className, ...rest },
  ref,
) {
  return (
    <RouterLink
      ref={ref}
      className={className ? `${styles.link} ${className}` : styles.link}
      {...rest}
    />
  )
})

type ExternalLinkProps = ComponentProps<'a'>

// Mesmo visual, para endereços de fora do site.
export const ExternalLink = forwardRef<HTMLAnchorElement, ExternalLinkProps>(function ExternalLink(
  { className, children, ...rest },
  ref,
) {
  return (
    <a ref={ref} className={className ? `${styles.link} ${className}` : styles.link} {...rest}>
      {children}
    </a>
  )
})
