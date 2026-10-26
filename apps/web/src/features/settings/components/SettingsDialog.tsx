import { puzzleSourceIdSchema, puzzleSourceNames, type Settings } from '@cruzadinha/shared'
import { useEffect, useId, useRef, type CSSProperties, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import { Button, buttonClass } from '../../../shared/components/Button'
import { Dialog } from '../../../shared/components/Dialog'
import { ThemeButton } from '../../../shared/themes/ThemeButton'
import { buildLoginPath } from '../../session'
import { useViewer } from '../../session'
import { loadSourceChoice } from '../../library'
import { Notice } from '../../../shared/components/Notice'
import { setSettingsOpen, useSettingsOpen } from '../services/settings-open'
import { useSettingsSyncStatus } from '../services/settings-sync'
import {
  restoreDefaults,
  settingsDefaults,
  updateSettings,
  useSettings,
} from '../../../shared/services/settings-store'
import styles from './SettingsDialog.module.css'

const MAX_HELP = 99

type LimitField = 'helpLetters' | 'helpWords'

function Switch({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={styles.switch}
      onClick={() => onChange(!checked)}
    >
      <span className={styles.knob} />
    </button>
  )
}

function Row({ title, hint, children }: { title: string; hint: ReactNode; children: ReactNode }) {
  return (
    <div className={styles.row}>
      <div className={styles.rowText}>
        <span className={styles.label}>{title}</span>
        <span className={styles.hint}>{hint}</span>
      </div>
      {children}
    </div>
  )
}

// Limite de uma ajuda: − e +, o valor e "Sem limite" (`null`). Desmarcar volta ao último número.
function LimitControl({
  name,
  plural,
  field,
  settings,
}: {
  name: string
  plural: string
  field: LimitField
  settings: Settings
}) {
  const value = settings[field]
  // Último número escolhido, para "Sem limite" desmarcado voltar a ele.
  const last = useRef(value ?? settingsDefaults()[field] ?? 0)
  useEffect(() => {
    if (value !== null) last.current = value
  }, [value])
  const nameId = useId()
  const unlimited = value === null
  const set = (next: number) => updateSettings({ [field]: Math.min(MAX_HELP, Math.max(0, next)) })
  return (
    <div role="group" aria-labelledby={nameId} className={styles.limit}>
      <span id={nameId} className={styles.limitName}>
        {name}
      </span>
      <div className={styles.stepper}>
        <button
          type="button"
          className={`${buttonClass()} ${styles.step}`}
          aria-label={`Menos ${plural}`}
          disabled={unlimited || value <= 0}
          onClick={() => value !== null && set(value - 1)}
        >
          −
        </button>
        <output className={styles.value} aria-live="polite">
          {unlimited ? 'Sem limite' : value}
        </output>
        <button
          type="button"
          className={`${buttonClass()} ${styles.step}`}
          aria-label={`Mais ${plural}`}
          disabled={unlimited || value >= MAX_HELP}
          onClick={() => value !== null && set(value + 1)}
        >
          +
        </button>
      </div>
      <label className={styles.check}>
        <input
          type="checkbox"
          checked={unlimited}
          onChange={(event) =>
            updateSettings({ [field]: event.target.checked ? null : last.current })
          }
        />
        Sem limite
      </label>
    </div>
  )
}

// Variáveis CSS do destaque do seletor, tipadas para o `style` do React.
type GroupStyle = CSSProperties & { '--i': number; '--count': number }

export type SourceOption = { id: string; name: string }

const SOURCE_OPTIONS: SourceOption[] = puzzleSourceIdSchema.options.map((id) => ({
  id,
  name: puzzleSourceNames[id],
}))

// Cruzada padrão (FR-012a): botões lado a lado até 3 fontes; acima disso, uma lista de rádios.
export function SourcePicker({
  sources,
  value,
  onChange,
}: {
  sources: SourceOption[]
  value: string
  onChange: (id: string) => void
}) {
  const name = useId()
  if (sources.length <= 3) {
    // O destaque desliza até a fonte marcada (feature 024): só precisa do índice e da quantidade.
    // Um valor desconhecido vale como a primeira fonte (FR-012b). Com 1 fonte não há para onde ir.
    const index = Math.max(
      0,
      sources.findIndex((source) => source.id === value),
    )
    const style: GroupStyle = { '--i': index, '--count': sources.length }
    return (
      <div
        role="group"
        aria-label="Cruzada padrão"
        className={sources.length > 1 ? styles.segment : `${styles.segment} ${styles.single}`}
        style={style}
      >
        {sources.length > 1 ? (
          <span data-thumb aria-hidden="true" className={styles.thumb} />
        ) : null}
        {sources.map((source) => (
          <button
            key={source.id}
            type="button"
            aria-pressed={source.id === value}
            className={styles.segmentButton}
            onClick={() => onChange(source.id)}
          >
            {source.name}
          </button>
        ))}
      </div>
    )
  }
  return (
    <fieldset className={styles.radios}>
      <legend className={styles.legend}>Cruzada padrão</legend>
      {sources.map((source) => (
        <label key={source.id} className={styles.radio}>
          <input
            type="radio"
            name={name}
            checked={source.id === value}
            onChange={() => onChange(source.id)}
          />
          {source.name}
        </label>
      ))}
    </fieldset>
  )
}

// Modal de configurações (feature 021). Cada mudança vale na hora e fica guardada; não há "Salvar".
export function SettingsDialog() {
  const open = useSettingsOpen()
  const settings = useSettings()
  const viewer = useViewer()
  const syncStatus = useSettingsSyncStatus()
  const location = useLocation()
  const solvedOnly = settings.strikeMode === 'solved'
  // Uma cruzada padrão desconhecida vale como a primeira (FR-012b).
  const defaultSource = loadSourceChoice()
  const defaultName = puzzleSourceNames[defaultSource]

  return (
    <Dialog
      open={open}
      onClose={() => setSettingsOpen(false)}
      title="Configurações"
      closeButton
      closeOnBackdrop
      size="wide"
    >
      <div className={styles.body}>
        <Row
          title="Tema"
          hint={settings.theme === 'auto' ? 'Segue o aparelho.' : 'Toque para trocar.'}
        >
          <ThemeButton />
        </Row>

        <hr className={styles.separator} />

        <section className={styles.group} aria-labelledby="ajudas">
          <h3 id="ajudas" className={styles.label}>
            Ajudas por cruzada
          </h3>
          <LimitControl name="Letras" plural="letras" field="helpLetters" settings={settings} />
          <LimitControl name="Palavras" plural="palavras" field="helpWords" settings={settings} />
        </section>

        <hr className={styles.separator} />

        <Row
          title="Riscar a dica só quando acerta"
          hint={
            solvedOnly
              ? 'Ligado: riscada, com fundo verde e visto, só quando a palavra está certa.'
              : 'Desligado: riscada ao preencher a palavra, certa ou errada, sem fundo verde nem visto.'
          }
        >
          <Switch
            label="Riscar a dica só quando acerta"
            checked={solvedOnly}
            onChange={(next) => updateSettings({ strikeMode: next ? 'solved' : 'filled' })}
          />
        </Row>

        <Row
          title="Copiar a dica"
          hint="Dois cliques numa dica copiam o texto, o tamanho da palavra e as letras já preenchidas."
        >
          <Switch
            label="Copiar a dica"
            checked={settings.copyClue}
            onChange={(next) => updateSettings({ copyClue: next })}
          />
        </Row>

        <hr className={styles.separator} />

        <section className={styles.group} aria-labelledby="cruzada-padrao">
          <h3 id="cruzada-padrao" className={styles.label}>
            Cruzada padrão
          </h3>
          <span className={styles.hint}>O calendário abre nesta cruzada.</span>
          <SourcePicker
            sources={SOURCE_OPTIONS}
            value={defaultSource}
            onChange={(id) => updateSettings({ defaultSource: id })}
          />
        </section>

        <Row
          title="Ir direto ao jogo"
          hint={`Ao abrir o site, vai para a cruzada de hoje de ${defaultName} em vez do calendário.`}
        >
          <Switch
            label="Ir direto ao jogo"
            checked={settings.directToGame}
            onChange={(next) => updateSettings({ directToGame: next })}
          />
        </Row>

        <hr className={styles.separator} />

        {viewer?.kind === 'user' && syncStatus === 'failing' ? (
          <Notice variant="warning">
            Não foi possível salvar na sua conta agora. As mudanças valem neste aparelho e serão
            enviadas assim que der.
          </Notice>
        ) : null}

        <div className={styles.footer}>
          {viewer?.kind === 'user' ? (
            <span className={styles.hint}>
              Salvo automaticamente neste aparelho e na sua conta.
            </span>
          ) : (
            <span className={styles.hint}>
              As configurações ficam só neste aparelho.{' '}
              <Link
                to={buildLoginPath(location.pathname + location.search)}
                onClick={() => setSettingsOpen(false)}
              >
                Entre
              </Link>{' '}
              para levar para outros.
            </span>
          )}
          <Button variant="quiet" onClick={restoreDefaults}>
            Restaurar padrões
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
