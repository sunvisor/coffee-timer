import { useState } from 'react'
import { getSampleRecipes, parseRecipes, STORAGE_KEY, type Recipe } from './recipes'
import { type MessageKey } from './i18n'
import { useI18n } from './useI18n'

function loadRecipes(): {
  recipes: Recipe[]
  snapshot: string | null | undefined
  error: MessageKey | null
} {
  let snapshot: string | null | undefined
  try {
    snapshot = localStorage.getItem(STORAGE_KEY)
    return {
      recipes: snapshot === null ? getSampleRecipes() : parseRecipes(JSON.parse(snapshot)),
      snapshot,
      error: null,
    }
  } catch {
    return {
      recipes: [] as Recipe[],
      snapshot,
      error: 'storage.readFailed',
    }
  }
}

export function useRecipes() {
  const { t } = useI18n()
  const [state, setState] = useState(loadRecipes)
  function save(recipes: Recipe[]) {
    try {
      const current = localStorage.getItem(STORAGE_KEY)
      if (state.snapshot === undefined || current !== state.snapshot) {
        setState((previous) => ({
          ...previous,
          error: 'storage.conflict',
        }))
        return false
      }
      const snapshot = JSON.stringify(parseRecipes(recipes))
      localStorage.setItem(STORAGE_KEY, snapshot)
      setState({ recipes, snapshot, error: null })
      return true
    } catch {
      setState((previous) => ({
        ...previous,
        error: 'storage.saveFailed',
      }))
      return false
    }
  }
  const recipes =
    state.snapshot === null && state.error === null ? getSampleRecipes() : state.recipes
  return { recipes, error: state.error ? t(state.error) : '', save }
}
