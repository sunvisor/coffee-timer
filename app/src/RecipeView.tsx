import { Markdown } from './Markdown'
import { formatTime, totalPourAmount, totalSeconds, type Recipe } from './recipes'
import { WaterAmountWarning } from './WaterAmountWarning'
import { ScreenAwake } from './ScreenAwake'
import { useI18n } from './useI18n'

export function RecipeStats({
  recipe,
  seconds = totalSeconds(recipe),
}: {
  recipe: Recipe
  seconds?: number
}) {
  const { t, number } = useI18n()
  return (
    <dl className="recipe-stats">
      <div>
        <dt>{t('recipe.coffee')}</dt>
        <dd>
          {number(recipe.coffee)}
          <small> g</small>
        </dd>
      </div>
      <div>
        <dt>{t('recipe.water')}</dt>
        <dd>
          {number(recipe.water)}
          <small> ml</small>
        </dd>
      </div>
      <div>
        <dt>{t('recipe.temperature')}</dt>
        <dd>
          {number(recipe.temperature)}
          <small> ℃</small>
        </dd>
      </div>
      <div>
        <dt>{t('recipe.duration')}</dt>
        <dd>{formatTime(seconds)}</dd>
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
  const { t } = useI18n()
  return (
    <>
      <div className="detail-intro">
        <span className="eyebrow">{t('eyebrow.recipe')}</span>
        <h1>{recipe.name}</h1>
        <Markdown>{recipe.description}</Markdown>
        <WaterAmountWarning recipe={recipe} />
        <button className="primary detail-start" onClick={onStart}>
          {t('recipe.start')}
        </button>
      </div>
      <RecipeStats recipe={recipe} />
      <section className="panel">
        <h2>{t('recipe.before')}</h2>
        <Markdown>{recipe.preparation || t('recipe.prepareHint')}</Markdown>
        <ScreenAwake />
      </section>
      <section className="panel">
        <div className="section-heading">
          <h2>{t('recipe.steps')}</h2>
          <span>{t('common.steps', { count: recipe.tasks.length })}</span>
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
                  <strong>{t(task.type === 'pour' ? 'common.pour' : 'common.wait')}</strong>
                  <Markdown>{task.description}</Markdown>
                  {task.type === 'pour' && (
                    <small>{t('recipe.pourAmount', { amount: task.amount, total: amount })}</small>
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
          <button onClick={onEdit}>{t('common.edit')}</button>
          <button className="danger" onClick={onDelete}>
            {t('common.delete')}
          </button>
        </div>
      </div>
    </>
  )
}
