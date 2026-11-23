import { useEffect, useState } from 'react'
import { useBeforeUnload, useBlocker, useLocation, useNavigate } from 'react-router-dom'
import { newRecipe, type Recipe } from './recipes'
import { resolveScreen, screenPath, type BrewScreen, type Screen } from './screens'

function useBrewNavigationGuard(active: boolean) {
  const blocker = useBlocker(({ historyAction }) => active && historyAction === 'POP')
  useEffect(() => {
    if (blocker.state === 'blocked') blocker.reset()
  }, [blocker])
  useBeforeUnload((event) => {
    if (!active) return
    event.preventDefault()
    event.returnValue = ''
  })
}

export function useScreen(recipes: Recipe[]) {
  const location = useLocation()
  const navigate = useNavigate()
  const [draft, setDraft] = useState(newRecipe)
  const [brew, setBrew] = useState<BrewScreen | null>(null)
  const [initialRecipePath] = useState(() =>
    /^\/recipes\/[^/]+\/brew$/.test(location.pathname)
      ? location.pathname.slice(0, -'/brew'.length)
      : null,
  )
  const screen = resolveScreen(location.pathname, recipes, draft, brew)
  useBrewNavigationGuard(screen.type === 'brew')
  // A reload cannot restore a running timer or its audio context.
  useEffect(() => {
    if (initialRecipePath) void navigate(initialRecipePath, { replace: true })
  }, [initialRecipePath, navigate])
  function setScreen(next: Screen, options: { replace?: boolean } = {}) {
    if (next.type === 'edit' && !recipes.some((recipe) => recipe.id === next.recipe.id))
      setDraft(next.recipe)
    setBrew(next.type === 'brew' ? next : null)
    const path = screenPath(next, recipes)
    void navigate(path, { replace: options.replace || path === location.pathname })
  }
  return { screen, setScreen }
}
