import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Markdown } from './Markdown'
import { ring } from './audio'
import { formatTime, getBrewProgress, totalSeconds, type Recipe } from './recipes'

function useBrew(recipe: Recipe, audio: AudioContext | null) {
  const [elapsed, setElapsed] = useState(0)
  const [paused, setPaused] = useState(false)
  const clock = useRef({ start: 0, elapsed: 0, previous: 0 })
  const progress = getBrewProgress(recipe.tasks, elapsed)
  const done = progress.index === recipe.tasks.length
  useEffect(() => {
    if (paused || done) return
    clock.current.start = Date.now() - clock.current.elapsed * 1000
    const timer = window.setInterval(() => {
      clock.current.elapsed = (Date.now() - clock.current.start) / 1000
      setElapsed(clock.current.elapsed)
    }, 50)
    return () => window.clearInterval(timer)
  }, [paused, done])
  useEffect(() => {
    if (progress.index > clock.current.previous && audio) ring(audio)
    clock.current.previous = progress.index
  }, [progress.index, audio])
  return { elapsed, paused, setPaused, progress, done }
}

export function Brew({
  recipe,
  audio,
  onExit,
}: {
  recipe: Recipe
  audio: AudioContext | null
  onExit: () => void
}) {
  const { elapsed, paused, setPaused, progress, done } = useBrew(recipe, audio)
  const task = recipe.tasks[progress.index]
  if (done)
    return (
      <section className="completion panel">
        <span className="eyebrow">BREW COMPLETE</span>
        <h1>美味しいコーヒーをどうぞ。</h1>
        <p>
          お疲れ様でした。
          <br />
          ひと息ついて、淹れたての一杯を楽しみましょう。
        </p>
        <p className="completion-summary">
          {recipe.coffee} g のコーヒー · {recipe.water} ml のお湯 ·{' '}
          {formatTime(totalSeconds(recipe))}
        </p>
        <button className="primary" onClick={onExit}>
          レシピに戻る
        </button>
      </section>
    )
  return (
    <section className="brew panel">
      <div className="section-heading">
        <span className="eyebrow">
          STEP {String(progress.index + 1).padStart(2, '0')} /{' '}
          {String(recipe.tasks.length).padStart(2, '0')}
        </span>
        <span>{recipe.name}</span>
      </div>
      <div className="brew-status" role="status" aria-live="polite">
        {paused
          ? '一時停止中'
          : task.type === 'pour'
            ? 'お湯を注ぎましょう'
            : 'ゆっくり待ちましょう'}
      </div>
      <div
        className="timer-ring"
        style={{ '--progress': `${progress.progress * 360}deg` } as CSSProperties}
      >
        <div>
          <span className="muted">このステップの残り時間</span>
          <strong className="countdown" role="timer">
            {formatTime(progress.remaining)}
          </strong>
          <small> / {formatTime(task.seconds)}</small>
        </div>
      </div>
      {task.type === 'pour' ? (
        <div className="pour-amount">
          <span>いま注ぐ量の目安</span>
          <strong>
            {Math.floor(progress.amount)}
            <small> / {task.amount} g</small>
          </strong>
          <span>スケールの累計目標：{progress.poured + task.amount} g</span>
        </div>
      ) : (
        <p className="wait-message">おいしさが引き出されるのを待ちましょう。</p>
      )}
      <Markdown>{task.description}</Markdown>
      <div className="brew-total">
        全体 {formatTime(Math.min(Math.floor(elapsed), totalSeconds(recipe)))} /{' '}
        {formatTime(totalSeconds(recipe))}
      </div>
      <div className="actions brew-actions">
        <button
          onClick={() => {
            if (window.confirm('抽出を終了してレシピに戻りますか？')) onExit()
          }}
        >
          抽出を中止
        </button>
        <button className="primary" onClick={() => setPaused(!paused)}>
          {paused ? '再開する' : '一時停止'}
        </button>
      </div>
      <p className="muted">
        ステップは自動で切り替わります。通知音が聞こえる音量にし、この画面を開いたままお使いください。
      </p>
    </section>
  )
}
