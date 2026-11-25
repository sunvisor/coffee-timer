import { useState } from 'react'

export type ImportMode = 'add' | 'replace'

type Props = {
  filename: string
  count: number
  currentCount: number
  onConfirm: (mode: ImportMode) => void
  onCancel: () => void
}

export function RecipeImport({ filename, count, currentCount, onConfirm, onCancel }: Props) {
  const [mode, setMode] = useState<ImportMode>('add')
  return (
    <div className="recipe-import">
      <p className="import-filename">{filename}</p>
      <p>{count} 件のレシピを読み込みます。</p>
      <fieldset className="import-options">
        <legend>読み込み方法</legend>
        <label>
          <input
            type="radio"
            name="import-mode"
            checked={mode === 'add'}
            onChange={() => setMode('add')}
          />
          <span>
            現在のレシピに追加する
            <small>今あるレシピを残し、一覧の末尾に追加します。</small>
          </span>
        </label>
        <label>
          <input
            type="radio"
            name="import-mode"
            checked={mode === 'replace'}
            onChange={() => setMode('replace')}
          />
          <span>
            現在のレシピをすべて置き換える
            <small>今ある {currentCount} 件を削除し、ファイルの {count} 件に置き換えます。</small>
          </span>
        </label>
      </fieldset>
      {mode === 'add' && <p className="muted">同じレシピを再度読み込むと重複して追加されます。</p>}
      <div className="import-actions">
        <button onClick={onCancel}>キャンセル</button>
        <button className="primary" onClick={() => onConfirm(mode)}>
          {count} 件{mode === 'add' ? 'を追加する' : 'に置き換える'}
        </button>
      </div>
    </div>
  )
}
