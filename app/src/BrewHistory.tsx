import { useState } from 'react'
import { BrewLogView } from './BrewLogView'
import { logDate, MAX_LOGS, readBrewLogs, recipeFromLog } from './brewLogs'
import type { Recipe } from './recipes'

function loadLogs() {
  try {
    return { logs: readBrewLogs(), error: '' }
  } catch (reason) {
    console.warn('Could not read brew logs', reason)
    return {
      logs: [],
      error: '抽出記録を読み込めませんでした。保存データやブラウザーの保存許可を確認してください。',
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
  const [{ logs, error }] = useState(loadLogs)
  if (error)
    return (
      <p className="error" role="alert">
        {error}
      </p>
    )
  if (id) {
    const log = logs.find((item) => item.id === id)
    return (
      <>
        <button className="back-button" onClick={onBack}>
          記録一覧に戻る
        </button>
        {log ? (
          <>
            <BrewLogView log={log} />
            <p className="muted">
              実測時間を秒単位で切り上げます。1秒未満は1秒とし、編集画面で確認して保存できます。
            </p>
            <button className="primary" onClick={() => onRecipe(recipeFromLog(log))}>
              レシピとして保存
            </button>
          </>
        ) : (
          <h1>抽出記録が見つかりません</h1>
        )}
      </>
    )
  }
  return (
    <>
      <button className="back-button" onClick={onBack}>
        設定に戻る
      </button>
      <div className="page-intro">
        <span className="eyebrow">BREW HISTORY</span>
        <h1>抽出記録</h1>
        <p>新しい順に最大 {MAX_LOGS} 件を保存します。容量に応じて古い記録から削除します。</p>
      </div>
      {logs.length === 0 ? (
        <p className="panel">抽出記録はまだありません。</p>
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
