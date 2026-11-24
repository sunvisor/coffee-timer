import { useLayoutEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { closeAudio, prepareAudio } from './audio'
import type { Recipe } from './recipes'

type OnStart = (recipe: Recipe, audio: AudioContext | null, error: string) => void

export function useBrewStart(onStart: OnStart) {
  const { key } = useLocation()
  const current = useRef<AbortController | null>(null)
  useLayoutEffect(
    () => () => {
      current.current?.abort()
    },
    [key],
  )
  const cancel = () => {
    current.current?.abort()
  }
  async function start(recipe: Recipe) {
    cancel()
    const controller = new AbortController()
    current.current = controller
    let audio: AudioContext | null = null
    let error = ''
    try {
      audio = await prepareAudio(controller.signal)
    } catch {
      error = '通知音を有効にできませんでした。画面で残り時間を確認してください。'
    }
    if (controller.signal.aborted) {
      closeAudio(audio)
      return
    }
    onStart(recipe, audio, error)
  }
  return { start, cancel }
}
