import { useEffect, useRef, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'
import { useI18n } from './useI18n'

function watchForUpdates(registration: ServiceWorkerRegistration | undefined) {
  async function check() {
    if (!registration || document.visibilityState === 'hidden' || !navigator.onLine) return
    try {
      await registration.update()
    } catch (reason) {
      console.warn('Could not check for an app update.', reason)
    }
  }
  void check()
  const interval = window.setInterval(() => void check(), 60_000)
  document.addEventListener('visibilitychange', check)
  window.addEventListener('pageshow', check)
  window.addEventListener('online', check)
  return () => {
    window.clearInterval(interval)
    document.removeEventListener('visibilitychange', check)
    window.removeEventListener('pageshow', check)
    window.removeEventListener('online', check)
  }
}

export function usePwaUpdate(safeToReload: boolean) {
  const { t } = useI18n()
  const [ready, setReady] = useState(false)
  const [activated, setActivated] = useState(false)
  const [applying, setApplying] = useState(false)
  const [failed, setFailed] = useState(false)
  const update = useRef<ReturnType<typeof registerSW> | null>(null)

  useEffect(() => {
    let active = true
    let stopChecking = () => {}
    update.current = registerSW({
      immediate: true,
      onNeedRefresh: () => {
        if (active) setReady(true)
      },
      onNeedReload: () => {
        if (!active) return
        setReady(true)
        setActivated(true)
      },
      onRegisteredSW: (_url, value) => {
        if (!active) return
        stopChecking = watchForUpdates(value)
      },
      onRegisterError: (reason: unknown) =>
        console.warn('Could not register the service worker.', reason),
    })
    return () => {
      active = false
      stopChecking()
    }
  }, [])

  useEffect(() => {
    // Another tab may activate the worker; require approval and a safe screen to reload.
    if (activated && applying && safeToReload) window.location.reload()
  }, [activated, applying, safeToReload])

  async function apply() {
    if (!ready || !safeToReload || applying || !update.current) return
    setFailed(false)
    setApplying(true)
    try {
      if (!activated) await update.current()
    } catch (reason) {
      console.warn('Could not apply the app update.', reason)
      setFailed(true)
      setApplying(false)
    }
  }
  return { ready, applying, error: failed ? t('update.failed') : '', apply }
}
