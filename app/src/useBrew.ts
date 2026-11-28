import { useEffect, useRef, useState } from 'react'
import { ring } from './audio'
import { advanceBrew, brewSnapshot, createBrewSession, pauseBrew, skipBrew } from './brewSession'
import type { Recipe } from './recipes'

export function useBrew(recipe: Recipe, audio: AudioContext | null) {
  const [session] = useState(() => createBrewSession(recipe, Date.now()))
  const [state, setState] = useState(() => brewSnapshot(session))
  const previous = useRef(0)
  useEffect(() => {
    if (state.log) return
    const timer = window.setInterval(() => {
      advanceBrew(session, Date.now())
      setState(brewSnapshot(session))
    }, 50)
    return () => window.clearInterval(timer)
  }, [session, state.log])
  useEffect(() => {
    if (state.progress.index > previous.current && audio) ring(audio)
    previous.current = state.progress.index
  }, [state.progress.index, audio])
  function pause() {
    pauseBrew(session, Date.now())
    setState(brewSnapshot(session))
  }
  function skip() {
    skipBrew(session, Date.now())
    setState(brewSnapshot(session))
  }
  return { ...state, pause, skip }
}
