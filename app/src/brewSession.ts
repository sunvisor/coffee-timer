import { createId } from './createId'
import { stepDuration, type BrewLog, type BrewStepLog } from './brewLogs'
import { getBrewProgress, totalSeconds, type Recipe } from './recipes'

export function createBrewSession(recipe: Recipe, now: number) {
  return {
    id: createId(),
    recipe: structuredClone(recipe),
    startedAt: now,
    last: now,
    paused: false,
    index: 0,
    activeMs: 0,
    pausedMs: 0,
    steps: [] as BrewStepLog[],
    log: null as BrewLog | null,
  }
}

export type BrewSession = ReturnType<typeof createBrewSession>

function finishStep(session: BrewSession, skipped: boolean) {
  session.steps.push({
    taskId: session.recipe.tasks[session.index].id,
    activeMs: session.activeMs,
    pausedMs: session.pausedMs,
    skipped,
  })
  session.index++
  session.activeMs = 0
  session.pausedMs = 0
  if (session.index !== session.recipe.tasks.length) return
  const duration = session.steps.reduce((sum, step) => sum + step.activeMs + step.pausedMs, 0)
  session.log = {
    id: session.id,
    recipe: session.recipe,
    steps: [...session.steps],
    startedAt: new Date(session.startedAt).toISOString(),
    finishedAt: new Date(session.startedAt + duration).toISOString(),
  }
}

export function advanceBrew(session: BrewSession, now: number) {
  let delta = Math.max(0, now - session.last)
  session.last = Math.max(now, session.last)
  if (session.log) return
  if (session.paused) {
    session.pausedMs += delta
    return
  }
  while (delta > 0 && !session.log) {
    const remaining = session.recipe.tasks[session.index].seconds * 1000 - session.activeMs
    const spent = Math.min(delta, remaining)
    session.activeMs += spent
    delta -= spent
    if (spent === remaining) finishStep(session, false)
  }
}

export function pauseBrew(session: BrewSession, now: number) {
  advanceBrew(session, now)
  if (!session.log) session.paused = !session.paused
}

export function skipBrew(session: BrewSession, now: number) {
  advanceBrew(session, now)
  if (!session.log) finishStep(session, true)
}

export function brewSnapshot(session: BrewSession) {
  const plannedMs =
    session.recipe.tasks
      .slice(0, session.index)
      .reduce((sum, task) => sum + task.seconds * 1000, 0) + session.activeMs
  const elapsedMs =
    session.steps.reduce((sum, step) => sum + stepDuration(step), 0) +
    session.activeMs +
    session.pausedMs
  return {
    elapsed: elapsedMs / 1000,
    total: (elapsedMs + totalSeconds(session.recipe) * 1000 - plannedMs) / 1000,
    paused: session.paused,
    log: session.log,
    progress: getBrewProgress(session.recipe.tasks, plannedMs / 1000),
  }
}
