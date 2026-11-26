import { Markdown } from './Markdown'
import { formatTime, totalPourAmount, totalSeconds, type Recipe } from './recipes'
import { WaterAmountWarning } from './WaterAmountWarning'
import { ScreenAwakeNotice } from './ScreenAwakeNotice'

export function RecipeStats({ recipe }: { recipe: Recipe }) {
  return (
    <dl className="recipe-stats">
      <div>
        <dt>コーヒー</dt>
        <dd>
          {recipe.coffee}
          <small> g</small>
        </dd>
      </div>
      <div>
        <dt>お湯</dt>
        <dd>
          {recipe.water}
          <small> ml</small>
        </dd>
      </div>
      <div>
        <dt>湯温</dt>
        <dd>
          {recipe.temperature}
          <small> ℃</small>
        </dd>
      </div>
      <div>
        <dt>抽出時間</dt>
        <dd>{formatTime(totalSeconds(recipe))}</dd>
      </div>
    </dl>
  )
}

export function RecipeView({
  recipe,
  onStart,
  onEdit,
  onDelete,
}: {
  recipe: Recipe
  onStart: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <>
      <div className="detail-intro">
        <span className="eyebrow">YOUR BREW RECIPE</span>
        <h1>{recipe.name}</h1>
        <Markdown>{recipe.description}</Markdown>
        <WaterAmountWarning recipe={recipe} />
        <button className="primary detail-start" onClick={onStart}>
          抽出開始
        </button>
      </div>
      <RecipeStats recipe={recipe} />
      <section className="panel">
        <h2>淹れる前に</h2>
        <Markdown>{recipe.preparation || '器具とコーヒーを準備しましょう。'}</Markdown>
        <ScreenAwakeNotice />
      </section>
      <section className="panel">
        <div className="section-heading">
          <h2>抽出のステップ</h2>
          <span>{recipe.tasks.length} ステップ</span>
        </div>
        <ol className="steps">
          {recipe.tasks.map((task, index) => {
            const amount = totalPourAmount(recipe.tasks.slice(0, index + 1))
            return (
              <li key={task.id}>
                <span className={`step-number ${task.type}`}>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="step-body">
                  <strong>{task.type === 'pour' ? 'お湯を注ぐ' : 'ゆっくり待つ'}</strong>
                  <Markdown>{task.description}</Markdown>
                  {task.type === 'pour' && (
                    <small>
                      注ぐ量 {task.amount}g · 累計 {amount}g
                    </small>
                  )}
                </div>
                <span className="step-time">{formatTime(task.seconds)}</span>
              </li>
            )
          })}
        </ol>
      </section>
      <div className="detail-footer">
        <div className="actions">
          <button onClick={onEdit}>編集</button>
          <button className="danger" onClick={onDelete}>
            削除
          </button>
        </div>
      </div>
    </>
  )
}
