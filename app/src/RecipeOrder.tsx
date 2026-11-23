import { useState } from 'react'
import type { Recipe } from './recipes'
import { OrderButton } from './OrderButton'

type Props = {
  recipes: Recipe[]
  onSave: (recipes: Recipe[]) => void
  onCancel: () => void
}

export function RecipeOrder({ recipes, onSave, onCancel }: Props) {
  const [ordered, setOrdered] = useState(recipes)
  function move(index: number, direction: -1 | 1) {
    const next = [...ordered]
    ;[next[index], next[index + direction]] = [next[index + direction], next[index]]
    setOrdered(next)
  }
  return (
    <>
      <div className="page-intro">
        <span className="eyebrow">RECIPE ORDER</span>
        <h1>レシピの並べ替え</h1>
        <p>上下のボタンで順序を変更し、保存してください。</p>
      </div>
      <section className="panel">
        <ol className="recipe-sort-list" aria-label="レシピの順序">
          {ordered.map((recipe, index) => (
            <li key={recipe.id}>
              <span>{recipe.name}</span>
              <div className="recipe-order">
                <OrderButton
                  direction="up"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  label={`${recipe.name}を上へ`}
                />
                <OrderButton
                  direction="down"
                  disabled={index === ordered.length - 1}
                  onClick={() => move(index, 1)}
                  label={`${recipe.name}を下へ`}
                />
              </div>
            </li>
          ))}
        </ol>
        <div className="form-footer actions">
          <button onClick={onCancel}>キャンセル</button>
          <button className="primary" onClick={() => onSave(ordered)}>
            順序を保存
          </button>
        </div>
      </section>
    </>
  )
}
