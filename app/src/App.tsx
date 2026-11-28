import { useEffect, useState } from 'react'
import { useI18n } from './useI18n'
import { translate } from './i18n'
import { version } from '../package.json'
import { Brew } from './Brew'
import { BrewHistory } from './BrewHistory'
import { Breadcrumbs } from './Breadcrumbs'
import { closeAudio } from './audio'
import { Markdown } from './Markdown'
import { RecipeEditor } from './RecipeEditor'
import { RecipeOrder } from './RecipeOrder'
import { RecipeStats, RecipeView } from './RecipeView'
import { Settings } from './Settings'
import { newRecipe, type Recipe } from './recipes'
import { useRecipes } from './useRecipes'
import { useScreen } from './useScreen'
import { useBrewStart } from './useBrewStart'
import type { Screen } from './screens'
import { usePwaUpdate } from './usePwaUpdate'
import './App.css'

function Home({
  recipes,
  onSelect,
  onAdd,
  onOrder,
}: {
  recipes: Recipe[]
  onSelect: (recipe: Recipe) => void
  onAdd: () => void
  onOrder: () => void
}) {
  const { t } = useI18n()
  return (
    <>
      <section className="home-intro">
        <div className="home-intro-copy">
          <span className="eyebrow">{t('eyebrow.home')}</span>
          <h1>{t('home.title')}</h1>
          <p>
            {t('home.intro')}
            <br />
            {t('home.invitation')}
          </p>
        </div>
        <div className="cup-art" aria-hidden="true">
          <svg className="steam" viewBox="0 0 90 100" fill="currentColor">
            <path d="M34 99C42 77 27 57 17 43C6 28 5 20 10 13C-1 23 4 38 13 51C25 69 36 81 34 99Z" />
            <path d="M43 84C53 73 55 59 51 45C47 31 50 22 61 20C73 18 81 26 77 35C74 42 64 42 62 35C60 31 62 28 66 27C58 26 55 34 59 40C64 49 78 47 83 37C90 23 78 10 64 12C43 13 39 29 44 47C49 64 48 73 43 84Z" />
            <path
              d="M32 32C23 20 25 14 30 7C33 2 33-1 32-4C43 4 39 12 35 18C32 23 30 26 32 32Z"
              transform="translate(0 4)"
            />
          </svg>
          <div className="cup" />
          <div className="saucer" />
        </div>
      </section>
      <div className="section-heading recipes-heading">
        <h2>
          {t('home.recipes')} <span className="count-badge">{recipes.length}</span>
        </h2>
        {recipes.length > 1 && (
          <button className="recipe-sort-link" onClick={onOrder}>
            {t('home.order')}
          </button>
        )}
      </div>
      <div className="recipe-grid">
        {recipes.map((recipe, index) => (
          <article className="recipe-card" key={recipe.id}>
            <div className="card-top">
              <span className="eyebrow">
                {t('common.recipeNumber', { number: String(index + 1).padStart(2, '0') })}
              </span>
              <span className="pill">{t('common.steps', { count: recipe.tasks.length })}</span>
            </div>
            <h3>
              <button className="recipe-title" onClick={() => onSelect(recipe)}>
                {recipe.name}
              </button>
            </h3>
            <Markdown>{recipe.description}</Markdown>
            <RecipeStats recipe={recipe} />
            <button className="card-link" onClick={() => onSelect(recipe)}>
              {t('home.brew')}
            </button>
          </article>
        ))}
        <button className="new-recipe-card" onClick={onAdd}>
          <span className="add-symbol">＋</span>
          <strong>{t('home.new')}</strong>
          <span>{t('home.newHint')}</span>
        </button>
      </div>
      <p className="home-note">{t('home.note')}</p>
    </>
  )
}

function App() {
  const { t, language } = useI18n()
  useEffect(() => {
    document.documentElement.lang = language
    document.title = translate('app.title', {}, language)
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', translate('app.description', {}, language))
  }, [language])
  const { recipes, error, save } = useRecipes()
  const { screen, setScreen: navigateScreen } = useScreen(recipes)
  const appUpdate = usePwaUpdate(screen.type === 'home')
  const [audioError, setAudioError] = useState(false)
  const { start, cancel } = useBrewStart((recipe, audio, error) => {
    setAudioError(error)
    navigateScreen({ type: 'brew', recipe, audio })
  })
  function setScreen(next: Screen, options?: { replace?: boolean }) {
    cancel()
    navigateScreen(next, options)
  }
  const add = () => setScreen({ type: 'edit', recipe: newRecipe() })
  const detail = (recipe: Recipe) => setScreen({ type: 'detail', recipe })
  function saveOrder(ordered: Recipe[]) {
    if (save(ordered)) setScreen({ type: 'home' }, { replace: true })
  }
  function saveRecipe(recipe: Recipe) {
    const updated = recipes.some((item) => item.id === recipe.id)
      ? recipes.map((item) => (item.id === recipe.id ? recipe : item))
      : [...recipes, recipe]
    if (save(updated)) setScreen({ type: 'detail', recipe }, { replace: true })
  }
  function exitBrew(next: Screen, audio: AudioContext | null) {
    closeAudio(audio)
    setScreen(next, { replace: true })
  }
  function remove(recipe: Recipe) {
    if (
      window.confirm(t('recipe.deleteConfirm', { name: recipe.name })) &&
      save(recipes.filter((item) => item.id !== recipe.id))
    )
      setScreen({ type: 'home' }, { replace: true })
  }
  return (
    <div className="app-shell">
      {screen.type === 'home' && (
        <header className="site-header">
          <button className="brand" onClick={() => setScreen({ type: 'home' })}>
            <span className="brand-icon" aria-hidden="true">
              ☕
            </span>
            <span>
              coffee timer<small>{t('app.tagline')}</small>
            </span>
          </button>
          <nav aria-label={t('nav.menu')}>
            <button
              className="icon-button"
              onClick={() => setScreen({ type: 'settings' })}
              aria-label={t('nav.settings')}
              title={t('nav.settings')}
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path
                  d="m9 3 .5-2h5l.5 2 2 1 2-.5 2.5 4.3L20 9.5v2l1.5 1.7L19 17.5l-2-.5-2 1-.5 2h-5L9 18l-2-1-2 .5-2.5-4.3L4 11.5v-2L2.5 7.8 5 3.5 7 4Z"
                  transform="translate(0 1.5)"
                />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          </nav>
        </header>
      )}
      <main>
        {screen.type === 'home' && appUpdate.ready && (
          <div className="update-notice">
            <p role="status">{t('update.available')}</p>
            <button disabled={appUpdate.applying} onClick={() => void appUpdate.apply()}>
              {t(appUpdate.applying ? 'update.applying' : 'update.apply')}
            </button>
            {appUpdate.error && (
              <p role="alert" className="error">
                {appUpdate.error}
              </p>
            )}
          </div>
        )}
        <Breadcrumbs screen={screen} recipes={recipes} />
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {audioError && screen.type === 'brew' && (
          <p className="error" role="alert">
            {t('audio.failed')}
          </p>
        )}
        {screen.type === 'home' && (
          <Home
            recipes={recipes}
            onSelect={detail}
            onAdd={add}
            onOrder={() => setScreen({ type: 'order' })}
          />
        )}
        {screen.type === 'order' && (
          <RecipeOrder
            recipes={recipes}
            onSave={saveOrder}
            onCancel={() => setScreen({ type: 'home' }, { replace: true })}
          />
        )}
        {screen.type === 'detail' && (
          <RecipeView
            recipe={screen.recipe}
            onStart={() => void start(screen.recipe)}
            onEdit={() => setScreen({ type: 'edit', recipe: screen.recipe })}
            onDelete={() => remove(screen.recipe)}
            onBack={() => setScreen({ type: 'home' })}
          />
        )}
        {screen.type === 'edit' && (
          <>
            <div className="page-intro">
              <span className="eyebrow">{t('eyebrow.editor')}</span>
              <h1>
                {recipes.some((item) => item.id === screen.recipe.id)
                  ? t('recipe.edit')
                  : t('recipe.new')}
              </h1>
              <p>{t('recipe.editorIntro')}</p>
            </div>
            <RecipeEditor
              key={screen.recipe.id}
              initial={screen.recipe}
              onSave={saveRecipe}
              onCancel={() => setScreen({ type: 'home' }, { replace: true })}
            />
          </>
        )}
        {screen.type === 'settings' && (
          <>
            <div className="page-intro">
              <span className="eyebrow">{t('eyebrow.settings')}</span>
              <h1>{t('nav.settings')}</h1>
            </div>
            <Settings recipes={recipes} onImport={save} />
            <section className="panel">
              <h2>{t('history.title')}</h2>
              <p>{t('history.intro')}</p>
              <button onClick={() => setScreen({ type: 'logs' })}>{t('history.open')}</button>
            </section>
          </>
        )}
        {(screen.type === 'logs' || screen.type === 'log') && (
          <BrewHistory
            id={screen.type === 'log' ? screen.id : undefined}
            onSelect={(id) => setScreen({ type: 'log', id })}
            onRecipe={(recipe) => setScreen({ type: 'edit', recipe })}
          />
        )}
        {screen.type === 'not-found' && (
          <section className="panel">
            <h1>{t('missing.title')}</h1>
            <p>{t('missing.hint')}</p>
          </section>
        )}
        {screen.type === 'brew' && (
          <Brew
            recipe={screen.recipe}
            audio={screen.audio}
            onExit={() => exitBrew({ type: 'detail', recipe: screen.recipe }, screen.audio)}
            onHome={() => exitBrew({ type: 'home' }, screen.audio)}
          />
        )}
      </main>
      <footer className="site-footer">
        <span>
          coffee timer <small>v{version}</small>
        </span>
        <span>{t('app.footer')}</span>
      </footer>
    </div>
  )
}

export default App
