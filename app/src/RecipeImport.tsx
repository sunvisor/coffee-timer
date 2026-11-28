import { useState } from 'react'
import { useI18n } from './useI18n'

export type ImportMode = 'add' | 'replace'

type Props = {
  filename: string
  count: number
  currentCount: number
  onConfirm: (mode: ImportMode) => void
  onCancel: () => void
}

export function RecipeImport({ filename, count, currentCount, onConfirm, onCancel }: Props) {
  const { t } = useI18n()
  const [mode, setMode] = useState<ImportMode>('add')
  return (
    <div className="recipe-import">
      <p className="import-filename">{filename}</p>
      <p>{t('import.count', { count })}</p>
      <fieldset className="import-options">
        <legend>{t('import.mode')}</legend>
        <label>
          <input
            type="radio"
            name="import-mode"
            checked={mode === 'add'}
            onChange={() => setMode('add')}
          />
          <span>
            {t('import.add')}
            <small>{t('import.addHint')}</small>
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
            {t('import.replace')}
            <small>{t('import.replaceHint', { current: currentCount, count })}</small>
          </span>
        </label>
      </fieldset>
      {mode === 'add' && <p className="muted">{t('import.duplicateHint')}</p>}
      <div className="import-actions">
        <button onClick={onCancel}>{t('common.cancel')}</button>
        <button className="primary" onClick={() => onConfirm(mode)}>
          {t(mode === 'add' ? 'import.addButton' : 'import.replaceButton', { count })}
        </button>
      </div>
    </div>
  )
}
