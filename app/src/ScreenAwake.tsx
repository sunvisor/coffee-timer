import { useEffect } from 'react'
import { keepScreenAwake } from './screenWakeLock'

export function ScreenAwake() {
  useEffect(() => keepScreenAwake(), [])
  return null
}
