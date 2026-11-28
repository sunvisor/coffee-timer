import { useI18n } from './useI18n'

type Props = {
  paused: boolean
  onStop: () => void
  onPause: () => void
  onSkip: () => void
}

export function BrewControls({ paused, onStop, onPause, onSkip }: Props) {
  const { t } = useI18n()
  return (
    <>
      <button
        className="timer-control timer-stop"
        aria-label={t('brew.stop')}
        title={t('brew.stop')}
        onClick={onStop}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      </button>
      <button
        className="timer-control timer-pause"
        aria-label={t(paused ? 'brew.resume' : 'brew.pause')}
        title={t(paused ? 'brew.resume' : 'brew.pause')}
        onClick={onPause}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          {paused ? (
            <path d="M8 5v14l11-7z" />
          ) : (
            <>
              <rect x="5" y="5" width="5" height="14" rx="1" />
              <rect x="14" y="5" width="5" height="14" rx="1" />
            </>
          )}
        </svg>
      </button>
      <button
        className="timer-control timer-skip"
        aria-label={t('brew.skip')}
        title={t('brew.skip')}
        onClick={onSkip}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 5v14l10-7z" />
          <rect x="17" y="5" width="3" height="14" rx="1" />
        </svg>
      </button>
    </>
  )
}
