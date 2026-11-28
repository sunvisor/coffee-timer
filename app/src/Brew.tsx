import { type CSSProperties } from 'react'
import { Markdown } from './Markdown'
import { BrewControls } from './BrewControls'
import { ScreenAwake } from './ScreenAwake'
import { formatTime, type Recipe } from './recipes'
import { useBrew } from './useBrew'
import { BrewCompletion } from './BrewCompletion'
import { useI18n } from './useI18n'

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
  const { t, number } = useI18n()
  const { elapsed, total, paused, pause, progress, log, skip } = useBrew(recipe, audio)
  const task = recipe.tasks[progress.index]
  if (log) return <BrewCompletion log={log} onExit={onExit} onHome={onHome} />
  return (
    <section className="brew">
      <div className="panel brew-panel">
        <div className="section-heading">
          <span className="eyebrow">
            {t('brew.step', {
              number: String(progress.index + 1).padStart(2, '0'),
              count: String(recipe.tasks.length).padStart(2, '0'),
            })}
          </span>
          <span>{recipe.name}</span>
        </div>
        <div className="brew-status" role="status" aria-live="polite">
          {paused ? t('brew.paused') : task.type === 'pour' ? t('brew.pour') : t('brew.wait')}
        </div>
        <div className="timer-controls">
          <BrewControls
            paused={paused}
            onStop={() => {
              if (window.confirm(t('brew.stopConfirm'))) onExit()
            }}
            onPause={pause}
            onSkip={skip}
          />
          <div
            className="timer-ring"
            style={{ '--progress': `${progress.progress * 360}deg` } as CSSProperties}
          >
            <div>
              <span className="muted">{t('brew.remaining')}</span>
              <strong className="countdown" role="timer">
                {formatTime(progress.remaining)}
              </strong>
              <small> / {formatTime(task.seconds)}</small>
            </div>
          </div>
        </div>
        {task.type === 'pour' ? (
          <div className="pour-amount">
            <span>{t('brew.scale')}</span>
            <strong>
              {number(Math.floor(progress.poured + progress.amount))}
              <small> / {number(progress.poured + task.amount)} g</small>
            </strong>
            <span>{t('brew.amount', { amount: task.amount })}</span>
          </div>
        ) : (
          <p className="wait-message">{t('brew.waitHint')}</p>
        )}
        <Markdown>{task.description}</Markdown>
        <div className="brew-total">
          {t('brew.total', { elapsed: formatTime(Math.floor(elapsed)), total: formatTime(total) })}
        </div>
      </div>
      <div className="brew-notes">
        <p className="muted">{t('brew.hint')}</p>
        <ScreenAwake />
      </div>
    </section>
  )
}
