type Props = {
  paused: boolean
  onStop: () => void
  onPause: () => void
  onSkip: () => void
}

export function BrewControls({ paused, onStop, onPause, onSkip }: Props) {
  return (
    <>
      <button
        className="timer-control timer-stop"
        aria-label="抽出を中止"
        title="抽出を中止"
        onClick={onStop}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      </button>
      <button
        className="timer-control timer-pause"
        aria-label={paused ? '再開する' : '一時停止'}
        title={paused ? '再開する' : '一時停止'}
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
        aria-label="スキップ"
        title="スキップ"
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
