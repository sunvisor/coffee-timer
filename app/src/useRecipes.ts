import { useState } from 'react'
import { parseRecipes, sampleRecipes, STORAGE_KEY, type Recipe } from './recipes'

function loadRecipes() {
  let snapshot: string | null | undefined
  try {
    snapshot = localStorage.getItem(STORAGE_KEY)
    return {
      recipes: snapshot === null ? sampleRecipes : parseRecipes(JSON.parse(snapshot)),
      snapshot,
      error: '',
    }
  } catch {
    return {
      recipes: [] as Recipe[],
      snapshot,
      error:
        '保存データを読み込めませんでした。既存データは変更していません。設定からバックアップを読み込んでください。',
    }
  }
}

export function useRecipes() {
  const [state, setState] = useState(loadRecipes)
  function save(recipes: Recipe[]) {
    try {
      const current = localStorage.getItem(STORAGE_KEY)
      if (state.snapshot === undefined || current !== state.snapshot) {
        setState((previous) => ({
          ...previous,
          error:
            '別のタブでレシピが変更されたか、保存データを確認できません。入力内容を控え、このページを再読み込みしてから保存し直してください。',
        }))
        return false
      }
      const snapshot = JSON.stringify(parseRecipes(recipes))
      localStorage.setItem(STORAGE_KEY, snapshot)
      setState({ recipes, snapshot, error: '' })
      return true
    } catch {
      setState((previous) => ({
        ...previous,
        error: '保存できませんでした。入力内容、ブラウザーの保存許可、空き容量を確認してください。',
      }))
      return false
    }
  }
  return { recipes: state.recipes, error: state.error, save }
}
