import { useState, type FormEvent } from 'react'
import { newTask, type BrewTask, type Recipe } from './recipes'

type Props = { initial: Recipe; onSave: (recipe: Recipe) => void; onCancel: () => void }
type NumberFieldProps = {
  label: string
  value: number
  onChange: (value: number) => void
  max?: number
  integer?: boolean
}

function NumberField({ label, value, onChange, max, integer }: NumberFieldProps) {
  return (
    <label>
      {label}
      <input
        type="number"
        required
        min={integer ? 1 : 0.1}
        max={max}
        step={integer ? 1 : 'any'}
        value={Number.isNaN(value) ? '' : value}
        onChange={(event) => onChange(event.target.valueAsNumber)}
      />
    </label>
  )
}

function TaskEditor({
  task,
  index,
  count,
  onChange,
  onMove,
  onRemove,
}: {
  task: BrewTask
  index: number
  count: number
  onChange: (task: BrewTask) => void
  onMove: (direction: number) => void
  onRemove: () => void
}) {
  return (
    <fieldset className="task-editor">
      <legend>STEP {String(index + 1).padStart(2, '0')}</legend>
      <div className="task-toolbar">
        <label>
          種別
          <select
            value={task.type}
            onChange={(event) => {
              const type = event.target.value === 'pour' ? 'pour' : 'wait'
              onChange({ ...task, type, amount: type === 'wait' ? 0 : 50 })
            }}
          >
            <option value="pour">抽出</option>
            <option value="wait">待機</option>
          </select>
        </label>
        <div className="actions">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => onMove(-1)}
            aria-label={`タスク${index + 1}を上へ`}
          >
            ↑
          </button>
          <button
            type="button"
            disabled={index === count - 1}
            onClick={() => onMove(1)}
            aria-label={`タスク${index + 1}を下へ`}
          >
            ↓
          </button>
          <button type="button" disabled={count === 1} onClick={onRemove}>
            削除
          </button>
        </div>
      </div>
      <label>
        説明
        <textarea
          value={task.description}
          onChange={(event) => onChange({ ...task, description: event.target.value })}
        />
      </label>
      <div className="field-grid">
        <NumberField
          label="時間（秒）"
          value={task.seconds}
          integer
          max={86400}
          onChange={(seconds) => onChange({ ...task, seconds })}
        />
        {task.type === 'pour' && (
          <NumberField
            label="注ぐ量（g）"
            value={task.amount}
            onChange={(amount) => onChange({ ...task, amount })}
          />
        )}
      </div>
    </fieldset>
  )
}

export function RecipeEditor({ initial, onSave, onCancel }: Props) {
  const [recipe, setRecipe] = useState(initial)
  const update = <K extends keyof Recipe>(key: K, value: Recipe[K]) =>
    setRecipe({ ...recipe, [key]: value })
  function move(index: number, direction: number) {
    const tasks = [...recipe.tasks]
    ;[tasks[index], tasks[index + direction]] = [tasks[index + direction], tasks[index]]
    update('tasks', tasks)
  }
  function submit(event: FormEvent) {
    event.preventDefault()
    onSave({ ...recipe, name: recipe.name.trim() })
  }
  return (
    <form onSubmit={submit} className="editor panel">
      <label>
        レシピ名
        <input
          required
          maxLength={100}
          pattern=".*\S.*"
          value={recipe.name}
          placeholder="例：休日のハンドドリップ"
          onChange={(event) => update('name', event.target.value)}
        />
      </label>
      <label>
        説明
        <textarea
          value={recipe.description}
          onChange={(event) => update('description', event.target.value)}
          placeholder="味わいやレシピの特徴を記録"
        />
      </label>
      <div className="field-grid">
        <NumberField
          label="コーヒー（g）"
          value={recipe.coffee}
          onChange={(value) => update('coffee', value)}
        />
        <NumberField
          label="お湯（ml）"
          value={recipe.water}
          onChange={(value) => update('water', value)}
        />
        <NumberField
          label="湯温（℃）"
          value={recipe.temperature}
          max={100}
          onChange={(value) => update('temperature', value)}
        />
      </div>
      <label>
        準備
        <textarea
          rows={4}
          value={recipe.preparation}
          onChange={(event) => update('preparation', event.target.value)}
        />
      </label>
      <p className="muted">説明と準備には Markdown が使えます。改行もそのまま表示されます。</p>
      <div className="section-heading">
        <h2>抽出のステップ</h2>
        <span>{recipe.tasks.length} ステップ</span>
      </div>
      {recipe.tasks.map((task, index) => (
        <TaskEditor
          key={task.id}
          task={task}
          index={index}
          count={recipe.tasks.length}
          onChange={(changed) =>
            update(
              'tasks',
              recipe.tasks.map((item) => (item.id === task.id ? changed : item)),
            )
          }
          onMove={(direction) => move(index, direction)}
          onRemove={() =>
            update(
              'tasks',
              recipe.tasks.filter((item) => item.id !== task.id),
            )
          }
        />
      ))}
      <button
        type="button"
        className="add-task"
        onClick={() => update('tasks', [...recipe.tasks, newTask()])}
      >
        ＋ ステップを追加
      </button>
      <div className="form-footer actions">
        <button type="button" onClick={onCancel}>
          キャンセル
        </button>
        <button className="primary" type="submit">
          レシピを保存
        </button>
      </div>
    </form>
  )
}
