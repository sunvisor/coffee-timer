import { useState } from 'react'
import { BrewLogView } from './BrewLogView'
import { logDate, MAX_LOGS, readBrewLogs, recipeFromLog } from './brewLogs'
import type { Recipe } from './recipes'
import { useI18n } from './useI18n'

function loadLogs() {
  try {
    return { logs: readBrewLogs(), error: false }
  } catch (reason) {
    console.warn('Could not read brew logs', reason)
    return {
      logs: [],
      error: true,
    }
  }
}

export function BrewHistory({
  id,
  onSelect,
  onRecipe,
  onBack,
}: {
  id?: string
  onSelect: (id: string) => void
  onRecipe: (recipe: Recipe) => void
  onBack: () => void
}) {
  const { t } = useI18n()
  const [{ logs, error }] = useState(loadLogs)
  if (error)
    return (
      <p className="error" role="alert">
        {t('history.readFailed')}
      </p>
    )
  if (id) {
    const log = logs.find((item) => item.id === id)
    return (
      <>
        <button className="back-button" onClick={onBack}>
          {t('history.back')}
        </button>
        {log ? (
          <>
            <BrewLogView log={log} />
            <p className="muted">{t('history.recipeHint')}</p>
            <button className="primary" onClick={() => onRecipe(recipeFromLog(log))}>
              {t('history.saveRecipe')}
            </button>
          </>
        ) : (
          <h1>{t('history.missing')}</h1>
        )}
      </>
    )
  }
  return (
    <>
      <button className="back-button" onClick={onBack}>
        {t('history.settings')}
      </button>
      <div className="page-intro">
        <span className="eyebrow">{t('eyebrow.history')}</span>
        <h1>{t('history.title')}</h1>
        <p>{t('history.limit', { count: MAX_LOGS })}</p>
      </div>
      {logs.length === 0 ? (
        <p className="panel">{t('history.empty')}</p>
      ) : (
        <ol className="log-list">
          {logs.map((log) => (
            <li key={log.id}>
              <button className="panel log-link" onClick={() => onSelect(log.id)}>
                <strong>{log.recipe.name}</strong>
                <time dateTime={log.startedAt}>{logDate(log.startedAt)}</time>
              </button>
            </li>
          ))}
        </ol>
      )}
    </>
  )
}
