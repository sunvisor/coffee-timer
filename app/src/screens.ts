import type { Recipe } from './recipes'

export type Screen =
  | { type: 'home' | 'settings' | 'order' | 'logs' | 'not-found' }
  | { type: 'log'; id: string }
  | { type: 'detail' | 'edit'; recipe: Recipe }
  | { type: 'brew'; recipe: Recipe; audio: AudioContext | null }

export type BrewScreen = Extract<Screen, { type: 'brew' }>

export function screenPath(screen: Screen, recipes: Recipe[]) {
  switch (screen.type) {
    case 'home':
      return '/'
    case 'settings':
      return '/settings'
    case 'order':
      return '/order'
    case 'logs':
      return '/logs'
    case 'log':
      return `/logs/${encodeURIComponent(screen.id)}`
    case 'not-found':
      return '/404'
    case 'edit':
      return recipes.some((recipe) => recipe.id === screen.recipe.id)
        ? `/recipes/${encodeURIComponent(screen.recipe.id)}/edit`
        : '/new'
    case 'detail':
      return `/recipes/${encodeURIComponent(screen.recipe.id)}`
    case 'brew':
      return `/recipes/${encodeURIComponent(screen.recipe.id)}/brew`
  }
}

export function resolveScreen(
  path: string,
  recipes: Recipe[],
  draft: Recipe,
  brew: BrewScreen | null,
): Screen {
  if (path === '/') return { type: 'home' }
  if (path === '/settings') return { type: 'settings' }
  if (path === '/order') return { type: 'order' }
  if (path === '/logs') return { type: 'logs' }
  const logMatch = /^\/logs\/([^/]+)$/.exec(path)
  if (logMatch) {
    try {
      return { type: 'log', id: decodeURIComponent(logMatch[1]) }
    } catch {
      return { type: 'not-found' }
    }
  }
  if (path === '/new') return { type: 'edit', recipe: draft }
  const match = /^\/recipes\/([^/]+)(?:\/(edit|brew))?$/.exec(path)
  const recipe = match && recipes.find((item) => encodeURIComponent(item.id) === match[1])
  if (!recipe) return { type: 'not-found' }
  if (match[2] === 'brew' && brew?.recipe.id === recipe.id) return brew
  return { type: match[2] === 'edit' ? 'edit' : 'detail', recipe }
}
