import { useState } from 'react'
import { Brew } from './Brew'
import { prepareAudio } from './audio'
import { Markdown } from './Markdown'
import { RecipeEditor } from './RecipeEditor'
import { RecipeOrder } from './RecipeOrder'
import { RecipeStats, RecipeView } from './RecipeView'
import { Settings } from './Settings'
import { newRecipe, type Recipe } from './recipes'
import { useRecipes } from './useRecipes'
import './App.css'

type Screen =
  | { type: 'home' | 'settings' | 'order' }
  | { type: 'detail' | 'edit'; recipe: Recipe }
  | { type: 'brew'; recipe: Recipe; audio: AudioContext | null }

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
  return (
    <>
      <section className="home-intro">
        <div>
          <span className="eyebrow">A LITTLE RITUAL, A BETTER DAY.</span>
          <h1>一杯を、ていねいに。</h1>
          <p>
            豆を量って、お湯を注いで、ひと呼吸。
            <br />
            お気に入りのレシピで、今日のコーヒーを淹れましょう。
          </p>
        </div>
        <div className="cup-art" aria-hidden="true">
          <div className="steam">﹏</div>
          <div className="cup" />
          <div className="saucer" />
        </div>
      </section>
      <div className="section-heading recipes-heading">
        <h2>
          マイレシピ <span className="count-badge">{recipes.length}</span>
        </h2>
        {recipes.length > 1 && (
          <button className="recipe-sort-link" onClick={onOrder}>
            並べ替え
          </button>
        )}
      </div>
      <div className="recipe-grid">
        {recipes.map((recipe, index) => (
          <article className="recipe-card" key={recipe.id}>
            <div className="card-top">
              <span className="eyebrow">RECIPE {String(index + 1).padStart(2, '0')}</span>
              <span className="pill">{recipe.tasks.length} ステップ</span>
            </div>
            <h3>
              <button className="recipe-title" onClick={() => onSelect(recipe)}>
                {recipe.name}
              </button>
            </h3>
            <Markdown>{recipe.description}</Markdown>
            <RecipeStats recipe={recipe} />
            <button className="card-link" onClick={() => onSelect(recipe)}>
              このレシピで淹れる
            </button>
          </article>
        ))}
        <button className="new-recipe-card" onClick={onAdd}>
          <span className="add-symbol">＋</span>
          <strong>新しいレシピを作る</strong>
          <span>自分だけのおいしさを記録しましょう</span>
        </button>
      </div>
      <p className="home-note">ひとつずつのステップを、タイマーと音でお手伝いします。</p>
    </>
  )
}

function App() {
  const { recipes, error, save } = useRecipes()
  const [screen, setScreen] = useState<Screen>({ type: 'home' })
  const [audioError, setAudioError] = useState('')
  const add = () => setScreen({ type: 'edit', recipe: newRecipe() })
  const detail = (recipe: Recipe) => setScreen({ type: 'detail', recipe })
  function saveOrder(ordered: Recipe[]) {
    if (save(ordered)) setScreen({ type: 'home' })
  }
  function saveRecipe(recipe: Recipe) {
    const updated = recipes.some((item) => item.id === recipe.id)
      ? recipes.map((item) => (item.id === recipe.id ? recipe : item))
      : [...recipes, recipe]
    if (save(updated)) detail(recipe)
  }
  async function start(recipe: Recipe) {
    setAudioError('')
    let audio: AudioContext | null = null
    try {
      audio = await prepareAudio()
    } catch {
      setAudioError('通知音を有効にできませんでした。画面で残り時間を確認してください。')
    }
    setScreen({ type: 'brew', recipe, audio })
  }
  function exitBrew(next: Screen, audio: AudioContext | null) {
    if (audio) void audio.close()
    setScreen(next)
  }
  function remove(recipe: Recipe) {
    if (
      window.confirm(`「${recipe.name}」を削除しますか？`) &&
      save(recipes.filter((item) => item.id !== recipe.id))
    )
      setScreen({ type: 'home' })
  }
  return (
    <div className="app-shell">
      <header className="site-header">
        <button
          className="brand"
          disabled={screen.type === 'brew'}
          onClick={() => setScreen({ type: 'home' })}
        >
          <span className="brand-icon" aria-hidden="true">
            ☕
          </span>
          <span>
            coffee timer<small>いつもの一杯を、もっとおいしく。</small>
          </span>
        </button>
        {screen.type !== 'brew' && (
          <nav aria-label="メインメニュー">
            <button
              className={screen.type === 'settings' ? 'selected icon-button' : 'icon-button'}
              onClick={() => setScreen({ type: 'settings' })}
              aria-label="設定"
            >
              ⚙
            </button>
          </nav>
        )}
      </header>
      <main>
        {screen.type !== 'home' && screen.type !== 'brew' && (
          <button className="back-button" onClick={() => setScreen({ type: 'home' })}>
            ホームに戻る
          </button>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {audioError && screen.type === 'brew' && (
          <p className="error" role="alert">
            {audioError}
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
            onCancel={() => setScreen({ type: 'home' })}
          />
        )}
        {screen.type === 'detail' && (
          <RecipeView
            recipe={screen.recipe}
            onStart={() => void start(screen.recipe)}
            onEdit={() => setScreen({ type: 'edit', recipe: screen.recipe })}
            onDelete={() => remove(screen.recipe)}
          />
        )}
        {screen.type === 'edit' && (
          <>
            <div className="page-intro">
              <span className="eyebrow">MAKE IT YOURS</span>
              <h1>
                {recipes.some((item) => item.id === screen.recipe.id)
                  ? 'レシピを編集'
                  : '新しいレシピ'}
              </h1>
              <p>おいしかった一杯を、また淹れられるように。</p>
            </div>
            <RecipeEditor
              key={screen.recipe.id}
              initial={screen.recipe}
              onSave={saveRecipe}
              onCancel={() => setScreen({ type: 'home' })}
            />
          </>
        )}
        {screen.type === 'settings' && (
          <>
            <div className="page-intro">
              <span className="eyebrow">SETTINGS</span>
              <h1>設定</h1>
            </div>
            <Settings recipes={recipes} onImport={save} />
          </>
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
        <span>coffee timer</span>
        <span>ゆっくり淹れる、豊かな時間。</span>
      </footer>
    </div>
  )
}

export default App
