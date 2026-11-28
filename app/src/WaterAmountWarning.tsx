import { totalPourAmount, type Recipe } from './recipes'
import { useI18n } from './useI18n'

export function WaterAmountWarning({ recipe }: { recipe: Recipe }) {
  const { t } = useI18n()
  const total = totalPourAmount(recipe.tasks)
  const valid =
    Number.isFinite(recipe.water) &&
    recipe.water > 0 &&
    recipe.tasks.every(
      (task) => task.type === 'wait' || (Number.isFinite(task.amount) && task.amount > 0),
    )
  // Ignore floating-point rounding when adding decimal amounts.
  const tolerance = Number.EPSILON * Math.max(1, recipe.water, total) * recipe.tasks.length
  if (!valid || !Number.isFinite(total) || Math.abs(total - recipe.water) <= tolerance) return null
  return (
    <p className="water-warning" role="status">
      <strong>{t('water.mismatch')}</strong>
      <br />
      {t('water.amounts', { water: recipe.water, total: Number(total.toPrecision(15)) })}
      <br />
      {t('water.hint')}
    </p>
  )
}
