import { useRef, useState, type ChangeEvent } from 'react'
import { parseRecipes, type Recipe } from './recipes'
import { createId } from './createId'
import { RecipeImport, type ImportMode } from './RecipeImport'

export function Settings({
  recipes,
  onImport,
}: {
  recipes: Recipe[]
  onImport: (recipes: Recipe[]) => boolean
}) {
  const input = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState<{ filename: string; recipes: Recipe[] } | null>(null)
  function download() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(recipes, null, 2)], { type: 'application/json' }),
    )
    const link = document.createElement('a')
    link.href = url
    link.download = 'coffee-recipes.json'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const target = event.target
    const file = target.files?.[0]
    if (!file) return
    setError('')
    setMessage('')
    setPending(null)
    try {
      if (file.size > 5_000_000) throw new Error('5 MB 以下のファイルを選択してください。')
      const imported = parseRecipes(JSON.parse(await file.text()))
      setPending({ filename: file.name, recipes: imported })
    } catch (reason) {
      setError(
        reason instanceof SyntaxError
          ? 'JSON を読み取れません。ファイルの内容を確認してください。'
          : reason instanceof Error
            ? reason.message
            : 'ファイルを読み込めませんでした。',
      )
    }
    target.value = ''
  }
  function confirmImport(mode: ImportMode) {
    if (!pending) return
    const count = pending.recipes.length
    if (mode === 'replace' && !window.confirm(
      `現在の ${recipes.length} 件のレシピを削除し、${count} 件のレシピに置き換えます。よろしいですか？`,
    )) return
    const next = mode === 'add'
      ? [...recipes, ...pending.recipes.map((recipe) => ({ ...recipe, id: createId() }))]
      : pending.recipes
    if (!onImport(next)) return
    setMessage(mode === 'add'
      ? `${count} 件を追加しました。合計 ${next.length} 件になりました。`
      : `${count} 件のレシピに置き換えました。`)
    setPending(null)
  }
  return (
    <div className="settings">
      <section className="panel">
        <span className="eyebrow">BACKUP & RESTORE</span>
        <h2>レシピを、大切に。</h2>
        <p>
          レシピはこのブラウザーに保存されます。
          <br />
          機種変更やブラウザーのデータ削除に備えて、バックアップしておきましょう。
        </p>
        <div className="setting-row">
          <div>
            <h3>レシピの保存</h3>
            <p>すべてのレシピをファイルに書き出します。</p>
          </div>
          <button onClick={download}>ダウンロード</button>
        </div>
        <div className="setting-row">
          <div>
            <h3>レシピの読み込み</h3>
            <p>保存したレシピファイルを選び、追加または置き換えを選択します。</p>
          </div>
          <button onClick={() => input.current?.click()}>ファイルを選択</button>
        </div>
        <input
          ref={input}
          type="file"
          accept=".json,application/json"
          aria-label="レシピファイル"
          hidden
          onChange={upload}
        />
        {pending && (
          <RecipeImport
            filename={pending.filename}
            count={pending.recipes.length}
            currentCount={recipes.length}
            onConfirm={confirmImport}
            onCancel={() => setPending(null)}
          />
        )}
        {message && (
          <p role="status" className="success">
            {message}
          </p>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </section>
      <p className="muted">アカウント登録不要。レシピがサーバーへ送信されることはありません。</p>
    </div>
  )
}
