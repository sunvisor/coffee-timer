import { totalPourAmount, type Recipe } from './recipes'

export function WaterAmountWarning({ recipe }: { recipe: Recipe }) {
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
      <strong>お湯の量が一致していません。</strong>
      <br />
      レシピは {recipe.water} ml、抽出タスクの合計は {Number(total.toPrecision(15))} g です。
      <br />
      お湯 1 ml ≒ 1 g として比較しています。量を確認してください。
    </p>
  )
}
