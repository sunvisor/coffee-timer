import { useState } from 'react'
import type { Recipe } from './recipes'
import { OrderButton } from './OrderButton'
import { useI18n } from './useI18n'

type Props = {
  recipes: Recipe[]
  onSave: (recipes: Recipe[]) => void
  onCancel: () => void
}

export function RecipeOrder({ recipes, onSave, onCancel }: Props) {
  const { t } = useI18n()
  const [ordered, setOrdered] = useState(recipes)
  function move(index: number, direction: -1 | 1) {
    const next = [...ordered]
    ;[next[index], next[index + direction]] = [next[index + direction], next[index]]
    setOrdered(next)
  }
  return (
    <>
      <div className="page-intro">
        <span className="eyebrow">{t('eyebrow.order')}</span>
        <h1>{t('order.title')}</h1>
        <p>{t('order.hint')}</p>
      </div>
      <section className="panel">
        <ol className="recipe-sort-list" aria-label={t('order.label')}>
          {ordered.map((recipe, index) => (
            <li key={recipe.id}>
              <span>{recipe.name}</span>
              <div className="recipe-order">
                <OrderButton
                  direction="up"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  label={t('order.up', { name: recipe.name })}
                />
                <OrderButton
                  direction="down"
                  disabled={index === ordered.length - 1}
                  onClick={() => move(index, 1)}
                  label={t('order.down', { name: recipe.name })}
                />
              </div>
            </li>
          ))}
        </ol>
        <div className="form-footer actions">
          <button onClick={onCancel}>{t('common.cancel')}</button>
          <button className="primary" onClick={() => onSave(ordered)}>
            {t('order.save')}
          </button>
        </div>
      </section>
    </>
  )
}
