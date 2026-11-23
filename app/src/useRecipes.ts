import { useState } from 'react'
import { parseRecipes, sampleRecipes, STORAGE_KEY, type Recipe } from './recipes'

function loadRecipes() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return {
      recipes: stored === null ? sampleRecipes : parseRecipes(JSON.parse(stored)),
      error: '',
    }
  } catch {
    return {
      recipes: [] as Recipe[],
      error:
        '保存データを読み込めませんでした。既存データは変更していません。設定からバックアップを読み込んでください。',
    }
  }
}

export function useRecipes() {
  const [state, setState] = useState(loadRecipes)
  function save(recipes: Recipe[]) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parseRecipes(recipes)))
      setState({ recipes, error: '' })
      return true
    } catch {
      setState((previous) => ({
        ...previous,
        error: '保存できませんでした。入力内容、ブラウザーの保存許可、空き容量を確認してください。',
      }))
      return false
    }
  }
  return { ...state, save }
}
