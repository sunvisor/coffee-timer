import { createId } from './createId'
import { parseRecipes, type Recipe } from './recipes'
import { getLanguage, languages, translate, TranslationError } from './i18n'

export type BrewStepLog = {
  taskId: string
  activeMs: number
  pausedMs: number
  skipped: boolean
}

export type BrewLog = {
  id: string
  recipe: Recipe
  startedAt: string
  finishedAt: string
  steps: BrewStepLog[]
}

export const LOG_STORAGE_KEY = 'coffee-timer.brew-logs.v1'
export const MAX_LOGS = 100
export const MAX_LOG_BYTES = 1_000_000
export const stepDuration = (step: BrewStepLog) => step.activeMs + step.pausedMs
export const logDuration = (log: BrewLog) =>
  log.steps.reduce((sum, step) => sum + stepDuration(step), 0)
export const durationText = (ms: number) =>
  translate('common.seconds', { value: Number((ms / 1000).toFixed(1)) })
export const logDate = (value: string) =>
  new Date(value).toLocaleString(languages[getLanguage()].locale, { hour12: false })

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function milliseconds(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function isStep(value: unknown): value is BrewStepLog {
  return (
    isRecord(value) &&
    typeof value.taskId === 'string' &&
    milliseconds(value.activeMs) &&
    milliseconds(value.pausedMs) &&
    typeof value.skipped === 'boolean'
  )
}

function isDate(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
}

function isLog(value: unknown): value is BrewLog {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    !value.id ||
    !isDate(value.startedAt) ||
    !isDate(value.finishedAt) ||
    Date.parse(value.finishedAt) < Date.parse(value.startedAt) ||
    !Array.isArray(value.steps) ||
    !value.steps.every(isStep)
  )
    return false
  const [recipe] = parseRecipes([value.recipe])
  return (
    value.steps.length === recipe.tasks.length &&
    value.steps.every((step, index) => {
      const task = recipe.tasks[index]
      return (
        step.taskId === task.id &&
        step.activeMs <= task.seconds * 1000 &&
        (step.skipped || step.activeMs === task.seconds * 1000)
      )
    }) &&
    Number.isSafeInteger(value.steps.reduce((sum, step) => sum + stepDuration(step), 0))
  )
}

export function parseBrewLogs(value: unknown): BrewLog[] {
  if (
    !Array.isArray(value) ||
    !value.every(isLog) ||
    new Set(value.map((log) => log.id)).size !== value.length
  ) {
    throw new TranslationError('history.invalid')
  }
  return value
}

export function readBrewLogs(): BrewLog[] {
  const stored = localStorage.getItem(LOG_STORAGE_KEY)
  return stored === null ? [] : parseBrewLogs(JSON.parse(stored))
}

function boundedLogs(logs: BrewLog[]) {
  const next = logs.slice(0, MAX_LOGS)
  while (next.length > 1 && JSON.stringify(next).length * 2 > MAX_LOG_BYTES) next.pop()
  if (JSON.stringify(next).length * 2 > MAX_LOG_BYTES) {
    throw new TranslationError('history.large')
  }
  return next
}

function writeBrewLog(log: BrewLog) {
  parseBrewLogs([log])
  const latest = readBrewLogs()
  if (latest.some((item) => item.id === log.id)) return
  const ordered = [...latest, log].sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))
  const next = boundedLogs(ordered)
  for (;;) {
    try {
      localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(next))
      return
    } catch (error) {
      if (
        !(error instanceof DOMException) ||
        error.name !== 'QuotaExceededError' ||
        next.length <= 1
      ) {
        throw error
      }
      next.pop()
    }
  }
}

export async function saveBrewLog(log: BrewLog) {
  if (navigator.locks) {
    await navigator.locks.request(LOG_STORAGE_KEY, () => writeBrewLog(log))
  } else {
    writeBrewLog(log)
  }
}

export function recipeFromLog(log: BrewLog): Recipe {
  return {
    ...log.recipe,
    id: createId(),
    name: translate('history.recipeName', { name: log.recipe.name }).slice(0, 100),
    tasks: log.recipe.tasks.map((task, index) => ({
      ...task,
      id: createId(),
      seconds: Math.max(1, Math.ceil(stepDuration(log.steps[index]) / 1000)),
    })),
  }
}
