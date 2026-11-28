import { Markdown } from './Markdown'
import { RecipeStats } from './RecipeView'
import { durationText, logDate, logDuration, stepDuration, type BrewLog } from './brewLogs'

export function BrewLogSteps({ log }: { log: BrewLog }) {
  return (
    <div className="log-steps">
      <h2>実際の抽出手順</h2>
      <p>抽出時間：{durationText(logDuration(log))}（一時停止を含む）</p>
      <ol className="steps">
        {log.steps.map((step, index) => {
          const task = log.recipe.tasks[index]
          return (
            <li key={step.taskId}>
              <span className={`step-number ${task.type}`}>{index + 1}</span>
              <div className="step-body">
                <strong>{task.type === 'pour' ? 'お湯を注ぐ' : 'ゆっくり待つ'}</strong>
                <Markdown>{task.description}</Markdown>
                <p>
                  実際 {durationText(stepDuration(step))} / 予定 {durationText(task.seconds * 1000)}
                </p>
                <small>
                  実行 {durationText(step.activeMs)} · 一時停止 {durationText(step.pausedMs)}
                  {step.skipped && ' · スキップで終了'}
                  {task.type === 'pour' && ` · 注ぐ量 ${task.amount} g`}
                </small>
              </div>
            </li>
          )
        })}
      </ol>
      <p className="muted">注湯量はレシピの指定値です。実際に注いだ量は計測していません。</p>
    </div>
  )
}

export function BrewLogView({ log }: { log: BrewLog }) {
  return (
    <>
      <div className="page-intro">
        <span className="eyebrow">BREW LOG</span>
        <h1>{log.recipe.name}</h1>
        <p>
          開始：<time dateTime={log.startedAt}>{logDate(log.startedAt)}</time>
        </p>
        <p>
          完了：<time dateTime={log.finishedAt}>{logDate(log.finishedAt)}</time>
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
