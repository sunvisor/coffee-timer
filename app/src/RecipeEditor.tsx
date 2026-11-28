import { useState, type FormEvent } from 'react'
import { newTask, type BrewTask, type Recipe } from './recipes'
import { WaterAmountWarning } from './WaterAmountWarning'
import { OrderButton } from './OrderButton'
import { useI18n } from './useI18n'

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
  const { t } = useI18n()
  return (
    <fieldset className="task-editor">
      <legend>{t('common.step', { number: String(index + 1).padStart(2, '0') })}</legend>
      <div className="task-toolbar">
        <label>
          {t('task.type')}
          <select
            value={task.type}
            onChange={(event) => {
              const type = event.target.value === 'pour' ? 'pour' : 'wait'
              onChange({ ...task, type, amount: type === 'wait' ? 0 : 50 })
            }}
          >
            <option value="pour">{t('task.pour')}</option>
            <option value="wait">{t('task.wait')}</option>
          </select>
        </label>
        <div className="actions">
          <OrderButton
            direction="up"
            disabled={index === 0}
            onClick={() => onMove(-1)}
            label={t('task.up', { number: index + 1 })}
          />
          <OrderButton
            direction="down"
            disabled={index === count - 1}
            onClick={() => onMove(1)}
            label={t('task.down', { number: index + 1 })}
          />
          <button type="button" disabled={count === 1} onClick={onRemove}>
            {t('common.delete')}
          </button>
        </div>
      </div>
      <label>
        {t('recipe.description')}
        <textarea
          value={task.description}
          onChange={(event) => onChange({ ...task, description: event.target.value })}
        />
      </label>
      <div className="field-grid">
        <NumberField
          label={t('task.seconds')}
          value={task.seconds}
          integer
          max={86400}
          onChange={(seconds) => onChange({ ...task, seconds })}
        />
        {task.type === 'pour' && (
          <NumberField
            label={t('task.amount')}
            value={task.amount}
            onChange={(amount) => onChange({ ...task, amount })}
          />
        )}
      </div>
    </fieldset>
  )
}

export function RecipeEditor({ initial, onSave, onCancel }: Props) {
  const { t } = useI18n()
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
        {t('recipe.name')}
        <input
          required
          maxLength={100}
          pattern=".*\S.*"
          value={recipe.name}
          placeholder={t('recipe.namePlaceholder')}
          onChange={(event) => update('name', event.target.value)}
        />
      </label>
      <label>
        {t('recipe.description')}
        <textarea
          value={recipe.description}
          onChange={(event) => update('description', event.target.value)}
          placeholder={t('recipe.descriptionPlaceholder')}
        />
      </label>
      <div className="field-grid">
        <NumberField
          label={t('recipe.coffeeField')}
          value={recipe.coffee}
          onChange={(value) => update('coffee', value)}
        />
        <NumberField
          label={t('recipe.waterField')}
          value={recipe.water}
          onChange={(value) => update('water', value)}
        />
        <NumberField
          label={t('recipe.temperatureField')}
          value={recipe.temperature}
          max={100}
          onChange={(value) => update('temperature', value)}
        />
      </div>
      <label>
        {t('recipe.preparation')}
        <textarea
          rows={4}
          value={recipe.preparation}
          onChange={(event) => update('preparation', event.target.value)}
        />
      </label>
      <p className="muted">{t('recipe.markdown')}</p>
      <div className="section-heading">
        <h2>{t('recipe.steps')}</h2>
        <span>{t('common.steps', { count: recipe.tasks.length })}</span>
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
        {t('recipe.addStep')}
      </button>
      <WaterAmountWarning recipe={recipe} />
      <div className="form-footer actions">
        <button type="button" onClick={onCancel}>
          {t('common.cancel')}
        </button>
        <button className="primary" type="submit">
          {t('recipe.save')}
        </button>
      </div>
    </form>
  )
}
