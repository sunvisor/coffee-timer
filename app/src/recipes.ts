import { createId } from './createId'
import { translate, TranslationError } from './i18n'
import { ja } from './locales/ja'

export type BrewTask = {
  id: string
  type: 'pour' | 'wait'
  description: string
  seconds: number
  amount: number
}

export type Recipe = {
  id: string
  name: string
  description: string
  coffee: number
  water: number
  temperature: number
  preparation: string
  tasks: BrewTask[]
}

export const STORAGE_KEY = 'coffee-timer.recipes.v1'
export function formatTime(seconds: number) {
  const rounded = Math.max(0, Math.ceil(seconds))
  return `${Math.floor(rounded / 60)
    .toString()
    .padStart(2, '0')}:${(rounded % 60).toString().padStart(2, '0')}`
}
export const totalSeconds = (recipe: Recipe) =>
  recipe.tasks.reduce((sum, task) => sum + task.seconds, 0)
export const totalPourAmount = (tasks: BrewTask[]) =>
  tasks.reduce((sum, task) => sum + (task.type === 'pour' ? task.amount : 0), 0)
export const newTask = (): BrewTask => ({
  id: createId(),
  type: 'pour',
  description: '',
  seconds: 30,
  amount: 50,
})
export const newRecipe = (): Recipe => ({
  id: createId(),
  name: '',
  description: '',
  coffee: 15,
  water: 250,
  temperature: 92,
  preparation: '',
  tasks: [newTask()],
})

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null
const isText = (value: unknown): value is string => typeof value === 'string'
const positive = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0
const validSeconds = (value: unknown) =>
  positive(value) && Number.isSafeInteger(value) && value <= 86400

function isTask(value: unknown): value is BrewTask {
  if (!isRecord(value)) return false
  return (
    isText(value.id) &&
    value.id.length > 0 &&
    isText(value.description) &&
    (value.type === 'pour' || value.type === 'wait') &&
    validSeconds(value.seconds) &&
    (value.type === 'pour' ? positive(value.amount) : value.amount === 0)
  )
}

function isRecipe(value: unknown): value is Recipe {
  if (!isRecord(value)) return false
  return (
    isText(value.id) &&
    value.id.length > 0 &&
    isText(value.name) &&
    value.name.trim().length > 0 &&
    isText(value.description) &&
    isText(value.preparation) &&
    positive(value.coffee) &&
    positive(value.water) &&
    positive(value.temperature) &&
    value.temperature <= 100 &&
    Array.isArray(value.tasks) &&
    value.tasks.length > 0 &&
    value.tasks.every(isTask) &&
    new Set(value.tasks.map((task) => task.id)).size === value.tasks.length
  )
}

export function parseRecipes(value: unknown): Recipe[] {
  if (
    !Array.isArray(value) ||
    !value.every(isRecipe) ||
    new Set(value.map((recipe) => recipe.id)).size !== value.length
  ) {
    throw new TranslationError('recipe.invalid')
  }
  return value
}

export function getBrewProgress(tasks: BrewTask[], elapsed: number) {
  let start = 0
  let poured = 0
  for (let index = 0; index < tasks.length; index++) {
    const task = tasks[index]
    if (elapsed < start + task.seconds) {
      const progress = Math.max(0, (elapsed - start) / task.seconds)
      return {
        index,
        remaining: Math.ceil(start + task.seconds - elapsed),
        progress,
        amount: task.type === 'pour' ? task.amount * progress : 0,
        poured,
      }
    }
    start += task.seconds
    if (task.type === 'pour') poured += task.amount
  }
  return { index: tasks.length, remaining: 0, progress: 1, amount: 0, poured }
}

export const sampleRecipes: Recipe[] = [
  {
    id: 'house-blend',
    name: ja['sample.name'],
    description: ja['sample.description'],
    coffee: 15,
    water: 250,
    temperature: 92,
    preparation: ja['sample.preparation'],
    tasks: [
      {
        id: 'bloom',
        type: 'pour',
        description: ja['sample.bloom'],
        seconds: 10,
        amount: 30,
      },
      {
        id: 'bloom-wait',
        type: 'wait',
        description: ja['sample.bloomWait'],
        seconds: 30,
        amount: 0,
      },
      {
        id: 'first-pour',
        type: 'pour',
        description: ja['sample.firstPour'],
        seconds: 40,
        amount: 120,
      },
      {
        id: 'last-pour',
        type: 'pour',
        description: ja['sample.lastPour'],
        seconds: 30,
        amount: 100,
      },
      {
        id: 'drawdown',
        type: 'wait',
        description: ja['sample.drawdown'],
        seconds: 40,
        amount: 0,
      },
    ],
  },
]

export function getSampleRecipes(): Recipe[] {
  const recipe = sampleRecipes[0]
  const descriptions = [
    'sample.bloom',
    'sample.bloomWait',
    'sample.firstPour',
    'sample.lastPour',
    'sample.drawdown',
  ] as const
  return [
    {
      ...recipe,
      name: translate('sample.name'),
      description: translate('sample.description'),
      preparation: translate('sample.preparation'),
      tasks: recipe.tasks.map((task, index) => ({
        ...task,
        description: translate(descriptions[index]),
      })),
    },
  ]
}
