import { useRef, useState, type ChangeEvent } from 'react'
import { parseRecipes, type Recipe } from './recipes'

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
    try {
      if (file.size > 5_000_000) throw new Error('5 MB 以下のファイルを選択してください。')
      const imported = parseRecipes(JSON.parse(await file.text()))
      if (
        window.confirm(
          `${imported.length} 件のレシピで現在の一覧を置き換えます。よろしいですか？`,
        ) &&
        onImport(imported)
      )
        setMessage(`${imported.length} 件のレシピを読み込みました。`)
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
            <p>保存したレシピファイルを読み込みます。現在のレシピは置き換えられます。</p>
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
