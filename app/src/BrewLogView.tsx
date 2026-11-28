import { Markdown } from './Markdown'
import { RecipeStats } from './RecipeView'
import { durationText, logDate, logDuration, stepDuration, type BrewLog } from './brewLogs'
import { useI18n } from './useI18n'

export function BrewLogSteps({ log }: { log: BrewLog }) {
  const { t } = useI18n()
  return (
    <div className="log-steps">
      <h2>{t('history.steps')}</h2>
      <p>{t('history.duration', { time: durationText(logDuration(log)) })}</p>
      <ol className="steps">
        {log.steps.map((step, index) => {
          const task = log.recipe.tasks[index]
          return (
            <li key={step.taskId}>
              <span className={`step-number ${task.type}`}>{index + 1}</span>
              <div className="step-body">
                <strong>{t(task.type === 'pour' ? 'common.pour' : 'common.wait')}</strong>
                <Markdown>{task.description}</Markdown>
                <p>
                  {t('history.actual', {
                    actual: durationText(stepDuration(step)),
                    planned: durationText(task.seconds * 1000),
                  })}
                </p>
                <small>
                  {t('history.breakdown', {
                    active: durationText(step.activeMs),
                    paused: durationText(step.pausedMs),
                  })}
                  {step.skipped && t('history.skipped')}
                  {task.type === 'pour' && t('history.amount', { amount: task.amount })}
                </small>
              </div>
            </li>
          )
        })}
      </ol>
      <p className="muted">{t('history.amountHint')}</p>
    </div>
  )
}

export function BrewLogView({ log }: { log: BrewLog }) {
  const { t } = useI18n()
  return (
    <>
      <div className="page-intro">
        <span className="eyebrow">{t('eyebrow.record')}</span>
        <h1>{log.recipe.name}</h1>
        <p>
          {t('history.started')}
          <time dateTime={log.startedAt}>{logDate(log.startedAt)}</time>
        </p>
        <p>
          {t('history.finished')}
          <time dateTime={log.finishedAt}>{logDate(log.finishedAt)}</time>
        </p>
        <Markdown>{log.recipe.description}</Markdown>
      </div>
      <RecipeStats recipe={log.recipe} seconds={logDuration(log) / 1000} />
      <section className="panel">
        <BrewLogSteps log={log} />
      </section>
    </>
  )
}
