import type { CaptchaAction } from '@cruzadinha/shared'
import { Button } from '../../../../shared/components/Button/Button'
import { Turnstile } from '../../../../shared/components/Turnstile/Turnstile'
import styles from '../../../../shared/components/AuthPage.module.css'
import { authMessages } from '../../../session'
import type { Captcha } from '../../hooks/useCaptcha'

// O desafio da tela ou, se não carregar, o aviso com nova tentativa: a página nunca fica parada em
// silêncio (feature 049). Sem captcha na API, não renderiza nada.
export function CaptchaField({ captcha, action }: { captcha: Captcha; action: CaptchaAction }) {
  if (!captcha.required) return null
  if (captcha.unavailable) {
    return (
      <div role="alert" className={styles.alert}>
        <p className={styles.alertText}>{authMessages.captchaUnavailable}</p>
        {/* Sem a chave pública do site, tentar de novo não resolve: só o texto. */}
        {captcha.siteKey ? (
          <Button type="button" size="small" onClick={captcha.retry}>
            Tentar de novo
          </Button>
        ) : null}
      </div>
    )
  }
  return (
    <Turnstile
      key={captcha.attempt}
      resetSignal={captcha.resets}
      siteKey={captcha.siteKey ?? ''}
      action={action}
      onToken={captcha.onToken}
      onUnavailable={captcha.onUnavailable}
    />
  )
}
