import { useEffect, useState } from 'react'
import { keepScreenAwake, type ScreenWakeLockStatus } from './screenWakeLock'

const messages: Record<ScreenWakeLockStatus, string> = {
  requesting: '画面オフの防止を準備しています。',
  active: '抽出中は画面が自動でオフにならないようにしています。',
  unsupported: 'この環境では画面オフを防止できません。端末の画面設定を確認してください。',
  released: '画面オフの防止が解除されました。端末の画面設定を確認してください。',
  failed: '画面オフを防止できませんでした。省電力モードや端末の画面設定を確認してください。',
}

export function ScreenAwakeNotice() {
  const [status, setStatus] = useState<ScreenWakeLockStatus>('requesting')
  useEffect(() => keepScreenAwake(setStatus), [])
  return (
    <p className="muted" aria-live="polite">
      {messages[status]}
    </p>
  )
}
