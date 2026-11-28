import { useEffect, useState } from 'react'
import { BrewLogSteps } from './BrewLogView'
import { logDate, saveBrewLog, type BrewLog } from './brewLogs'
import { useI18n } from './useI18n'

async function persist(log: BrewLog) {
  try {
    await saveBrewLog(log)
    return false
  } catch (reason) {
    console.warn('Could not save brew log', reason)
    return true
  }
}

export function BrewCompletion({
  log,
  onExit,
  onHome,
}: {
  log: BrewLog
  onExit: () => void
  onHome: () => void
}) {
  const { t } = useI18n()
  const [error, setError] = useState(false)
  useEffect(() => {
    let active = true
    void persist(log).then((message) => {
      if (active) setError(message)
    })
    return () => {
      active = false
    }
  }, [log])
  return (
    <section className="completion panel">
      <span className="eyebrow">{t('eyebrow.complete')}</span>
      <h1>{t('brew.complete')}</h1>
      <p>{t('brew.enjoy')}</p>
      <p className="completion-summary">
        {log.recipe.name} · {logDate(log.startedAt)}
        <br />
        {t('brew.summary', { coffee: log.recipe.coffee, water: log.recipe.water })}
      </p>
      {error && (
        <div>
          <p className="error" role="alert">
            {t('history.saveFailed')}
          </p>
          <button onClick={() => void persist(log).then(setError)}>{t('history.retry')}</button>
        </div>
      )}
      <BrewLogSteps log={log} />
      <div className="actions completion-actions">
        <button className="primary" onClick={onExit}>
          {t('brew.back')}
        </button>
        <button onClick={onHome}>{t('nav.home')}</button>
      </div>
    </section>
  )
}
