export type ScreenWakeLockStatus = 'requesting' | 'active' | 'unsupported' | 'released' | 'failed'

function release(lock: WakeLockSentinel | null) {
  if (!lock || lock.released) return
  void lock.release().catch((error) => console.warn('Could not release screen wake lock', error))
}

export function keepScreenAwake(onStatus: (status: ScreenWakeLockStatus) => void) {
  if (typeof navigator.wakeLock?.request !== 'function') {
    onStatus('unsupported')
    return () => {}
  }
  let stopped = false
  let pending = false
  let lock: WakeLockSentinel | null = null

  function watch(next: WakeLockSentinel) {
    lock = next
    next.addEventListener(
      'release',
      () => {
        if (lock !== next) return
        lock = null
        if (!stopped) onStatus('released')
      },
      { once: true },
    )
    onStatus(next.released ? 'released' : 'active')
  }

  async function acquire() {
    if (stopped || pending || (lock && !lock.released) || document.visibilityState !== 'visible')
      return
    pending = true
    onStatus('requesting')
    try {
      const next = await navigator.wakeLock.request('screen')
      if (stopped || document.visibilityState !== 'visible') release(next)
      else watch(next)
    } catch (error) {
      if (!stopped) {
        console.warn('Could not acquire screen wake lock', error)
        onStatus('failed')
      }
    } finally {
      pending = false
    }
  }

  const onVisibility = () => {
    void acquire()
  }
  document.addEventListener('visibilitychange', onVisibility)
  void acquire()
  return () => {
    stopped = true
    document.removeEventListener('visibilitychange', onVisibility)
    release(lock)
  }
}
