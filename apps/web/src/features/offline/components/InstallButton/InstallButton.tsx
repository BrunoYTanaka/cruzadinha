import { Button } from '../../../../shared/components/Button/Button'
import { useInstallPrompt } from '../../hooks/useInstallPrompt/useInstallPrompt'

// Só existe quando o navegador permite instalar agora (feature 041, FR-011).
export function InstallButton() {
  const install = useInstallPrompt()
  return install ? (
    <Button variant="quiet" onClick={() => void install()}>
      Instalar
    </Button>
  ) : null
}
