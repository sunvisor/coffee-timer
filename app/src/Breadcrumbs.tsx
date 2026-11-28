import { Link } from 'react-router-dom'
import type { Recipe } from './recipes'
import type { Screen } from './screens'
import { useI18n } from './useI18n'

type Crumb = { label: string; path?: string }

export function Breadcrumbs({ screen, recipes }: { screen: Screen; recipes: Recipe[] }) {
  const { t } = useI18n()
  if (screen.type === 'home' || screen.type === 'brew') return null
  const home = { label: t('nav.homeLabel'), path: '/' }
  const settings = { label: t('nav.settings'), path: '/settings' }
  const history = { label: t('history.title'), path: '/logs' }
  const recipe = screen.type === 'detail' || screen.type === 'edit' ? screen.recipe : null
  const saved = recipe && recipes.some((item) => item.id === recipe.id)
  const crumbs: Crumb[] = [home]
  switch (screen.type) {
    case 'settings':
      crumbs.push({ label: settings.label })
      break
    case 'logs':
      crumbs.push(settings, { label: history.label })
      break
    case 'log':
      crumbs.push(settings, history, { label: t('history.detail') })
      break
    case 'detail':
      crumbs.push({ label: screen.recipe.name })
      break
    case 'edit':
      if (saved && recipe)
        crumbs.push({ label: recipe.name, path: `/recipes/${encodeURIComponent(recipe.id)}` })
      crumbs.push({ label: t(saved ? 'recipe.edit' : 'recipe.new') })
      break
    case 'order':
      crumbs.push({ label: t('order.title') })
      break
    case 'not-found':
      crumbs.push({ label: t('missing.title') })
      break
  }
  return (
    <nav className="breadcrumbs" aria-label={t('nav.breadcrumbs')}>
      <ol>
        {crumbs.map((crumb, index) => (
          <li key={index}>
            {index > 0 && (
              <span className="breadcrumb-separator" aria-hidden="true">
                /
              </span>
            )}
            {crumb.path ? (
              <Link to={crumb.path}>{crumb.label}</Link>
            ) : (
              <span aria-current="page">{crumb.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
