import { useRef, useState, type ChangeEvent } from 'react'
import { parseRecipes, type Recipe } from './recipes'
import { createId } from './createId'
import { RecipeImport, type ImportMode } from './RecipeImport'
import { errorText, isLanguage, languages, setLanguage, TranslationError } from './i18n'
import { useI18n } from './useI18n'

export function Settings({
  recipes,
  onImport,
}: {
  recipes: Recipe[]
  onImport: (recipes: Recipe[]) => boolean
}) {
  const { t, language } = useI18n()
  const input = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<{ mode: ImportMode; count: number; total: number } | null>(
    null,
  )
  const [error, setError] = useState<unknown>(null)
  const [languageError, setLanguageError] = useState(false)
  const [pending, setPending] = useState<{ filename: string; recipes: Recipe[] } | null>(null)
  function download() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(recipes, null, 2)], { type: 'application/json' }),
    )
    const link = document.createElement('a')
    link.href = url
    link.download = 'coffee-recipes.json'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const target = event.target
    const file = target.files?.[0]
    if (!file) return
    setError(null)
    setMessage(null)
    setPending(null)
    try {
      if (file.size > 5_000_000) throw new TranslationError('import.large')
      const imported = parseRecipes(JSON.parse(await file.text()))
      setPending({ filename: file.name, recipes: imported })
    } catch (reason) {
      setError(reason instanceof SyntaxError ? new TranslationError('import.json') : reason)
    }
    target.value = ''
  }
  function confirmImport(mode: ImportMode) {
    if (!pending) return
    const count = pending.recipes.length
    if (
      mode === 'replace' &&
      !window.confirm(t('import.confirm', { current: recipes.length, count }))
    )
      return
    const next =
      mode === 'add'
        ? [...recipes, ...pending.recipes.map((recipe) => ({ ...recipe, id: createId() }))]
        : pending.recipes
    if (!onImport(next)) return
    setMessage({ mode, count, total: next.length })
    setPending(null)
  }
  return (
    <div className="settings">
      <section className="panel">
        <h2>{t('settings.language')}</h2>
        <p>{t('settings.languageHint')}</p>
        <label>
          {t('settings.language')}
          <select
            value={language}
            onChange={(event) => {
              if (!isLanguage(event.target.value)) return
              try {
                setLanguage(event.target.value)
                setLanguageError(false)
              } catch (reason) {
                console.warn('Could not save language preference', reason)
                setLanguageError(true)
              }
            }}
          >
            {Object.entries(languages).map(([code, value]) => (
              <option key={code} value={code} lang={code}>
                {value.name}
              </option>
            ))}
          </select>
        </label>
        {languageError && (
          <p className="error" role="alert">
            {t('settings.languageFailed')}
          </p>
        )}
      </section>
      <section className="panel">
        <span className="eyebrow">{t('eyebrow.backup')}</span>
        <h2>{t('settings.title')}</h2>
        <p>
          {t('settings.local')}
          <br />
          {t('settings.backupHint')}
        </p>
        <div className="setting-row">
          <div>
            <h3>{t('settings.export')}</h3>
            <p>{t('settings.exportHint')}</p>
          </div>
          <button onClick={download}>{t('settings.download')}</button>
        </div>
        <div className="setting-row">
          <div>
            <h3>{t('settings.import')}</h3>
            <p>{t('settings.importHint')}</p>
          </div>
          <button onClick={() => input.current?.click()}>{t('settings.choose')}</button>
        </div>
        <input
          ref={input}
          type="file"
          accept=".json,application/json"
          aria-label={t('settings.file')}
          hidden
          onChange={upload}
        />
        {pending && (
          <RecipeImport
            filename={pending.filename}
            count={pending.recipes.length}
            currentCount={recipes.length}
            onConfirm={confirmImport}
            onCancel={() => setPending(null)}
          />
        )}
        {message && (
          <p role="status" className="success">
            {t(message.mode === 'add' ? 'import.added' : 'import.replaced', message)}
          </p>
        )}
        {error != null && (
          <p role="alert" className="error">
            {errorText(error, 'import.failed')}
          </p>
        )}
      </section>
      <p className="muted">{t('settings.privacy')}</p>
    </div>
  )
}
