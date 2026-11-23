import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RecipeEditor } from '../src/RecipeEditor'
import { RecipeView } from '../src/RecipeView'
import { WaterAmountWarning } from '../src/WaterAmountWarning'
import { sampleRecipes } from '../src/recipes'

afterEach(cleanup)

describe('water amount warnings', () => {
  const recipe = sampleRecipes[0]

  it.each([200, 300])('warns when the recipe amount is %s ml but pours total 250 g', (water) => {
    render(<WaterAmountWarning recipe={{ ...recipe, water }} />)
    expect(screen.getByRole('status').textContent).toContain(`レシピは ${water} ml`)
    expect(screen.getByRole('status').textContent).toContain('合計は 250 g')
  })

  it('does not warn when amounts match, including decimal rounding', () => {
    const { rerender } = render(<WaterAmountWarning recipe={recipe} />)
    expect(screen.queryByRole('status')).toBeNull()
    rerender(
      <WaterAmountWarning
        recipe={{
          ...recipe,
          water: 0.3,
          tasks: [
            { ...recipe.tasks[0], amount: 0.1 },
            { ...recipe.tasks[2], amount: 0.2 },
          ],
        }}
      />,
    )
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('does not show a misleading total while an input is empty', () => {
    render(
      <WaterAmountWarning recipe={{ ...recipe, tasks: [{ ...recipe.tasks[0], amount: NaN }] }} />,
    )
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('updates the editor warning and allows saving an unmatched recipe', () => {
    const onSave = vi.fn()
    render(<RecipeEditor initial={recipe} onSave={onSave} onCancel={vi.fn()} />)
    expect(screen.queryByRole('status')).toBeNull()
    fireEvent.change(screen.getByLabelText('お湯（ml）'), { target: { value: '300' } })
    expect(screen.getByRole('status').textContent).toContain('合計は 250 g')
    fireEvent.click(screen.getByRole('button', { name: 'レシピを保存' }))
    expect(onSave).toHaveBeenCalledWith({ ...recipe, water: 300 })
    const group = screen.getAllByRole('group')[0]
    fireEvent.change(within(group).getByLabelText('注ぐ量（g）'), { target: { value: '80' } })
    expect(screen.queryByRole('status')).toBeNull()
    fireEvent.change(within(group).getByLabelText('種別'), { target: { value: 'wait' } })
    expect(screen.getByRole('status').textContent).toContain('合計は 220 g')
  })

  it('warns before brewing a saved or imported recipe but allows starting', () => {
    const onStart = vi.fn()
    render(
      <RecipeView
        recipe={{ ...recipe, water: 300 }}
        onStart={onStart}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    )
    expect(screen.getByRole('status').textContent).toContain('レシピは 300 ml')
    fireEvent.click(screen.getByRole('button', { name: '抽出開始' }))
    expect(onStart).toHaveBeenCalledOnce()
  })
})
