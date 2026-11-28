import { useEffect, useState } from 'react'
import { BrewLogSteps } from './BrewLogView'
import { logDate, saveBrewLog, type BrewLog } from './brewLogs'

async function persist(log: BrewLog) {
  try {
    await saveBrewLog(log)
    return ''
  } catch (reason) {
    console.warn('Could not save brew log', reason)
    return '抽出記録を保存できませんでした。保存許可や空き容量を確認して再試行してください。'
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
  const [error, setError] = useState('')
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
      <span className="eyebrow">BREW COMPLETE</span>
      <h1>美味しいコーヒーをどうぞ。</h1>
      <p>お疲れ様でした。淹れたての一杯を楽しんでください。</p>
      <p className="completion-summary">
        {log.recipe.name} · {logDate(log.startedAt)}
        <br />
        {log.recipe.coffee} g のコーヒー · {log.recipe.water} ml のお湯
      </p>
      {error && (
        <div>
          <p className="error" role="alert">
            {error}
          </p>
          <button onClick={() => void persist(log).then(setError)}>記録の保存を再試行</button>
        </div>
      )}
      <BrewLogSteps log={log} />
      <div className="actions completion-actions">
        <button className="primary" onClick={onExit}>
          レシピに戻る
        </button>
        <button onClick={onHome}>ホームに戻る</button>
      </div>
    </section>
  )
}
