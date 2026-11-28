import { type CSSProperties } from 'react'
import { Markdown } from './Markdown'
import { BrewControls } from './BrewControls'
import { ScreenAwake } from './ScreenAwake'
import { formatTime, totalSeconds, type Recipe } from './recipes'
import { useBrew } from './useBrew'
import { BrewCompletion } from './BrewCompletion'

export function Brew({
  recipe,
  audio,
  onExit,
  onHome,
}: {
  recipe: Recipe
  audio: AudioContext | null
  onExit: () => void
  onHome: () => void
}) {
  const { elapsed, paused, pause, progress, log, skip } = useBrew(recipe, audio)
  const task = recipe.tasks[progress.index]
  if (log) return <BrewCompletion log={log} onExit={onExit} onHome={onHome} />
  return (
    <section className="brew">
      <div className="panel brew-panel">
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
        <div className="timer-controls">
          <BrewControls
            paused={paused}
            onStop={() => {
              if (window.confirm('抽出を終了してレシピに戻りますか？')) onExit()
            }}
            onPause={pause}
            onSkip={skip}
          />
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
        </div>
        {task.type === 'pour' ? (
          <div className="pour-amount">
            <span>スケールの表示の目安（累計）</span>
            <strong>
              {Math.floor(progress.poured + progress.amount)}
              <small> / {progress.poured + task.amount} g</small>
            </strong>
            <span>このステップで注ぐ量：{task.amount} g</span>
          </div>
        ) : (
          <p className="wait-message">おいしさが引き出されるのを待ちましょう。</p>
        )}
        <Markdown>{task.description}</Markdown>
        <div className="brew-total">
          全体 {formatTime(Math.min(Math.floor(elapsed), totalSeconds(recipe)))} /{' '}
          {formatTime(totalSeconds(recipe))}
        </div>
      </div>
      <div className="brew-notes">
        <p className="muted">
          ステップは自動で切り替わります。通知音が聞こえる音量にし、この画面を開いたままお使いください。
        </p>
        <ScreenAwake />
      </div>
    </section>
  )
}
