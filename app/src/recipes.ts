export type BrewTask = {
  id: string
  type: 'pour' | 'wait'
  description: string
  seconds: number
  amount: number
}

export type Recipe = {
  id: string
  name: string
  description: string
  coffee: number
  water: number
  temperature: number
  preparation: string
  tasks: BrewTask[]
}

export const STORAGE_KEY = 'coffee-timer.recipes.v1'
export function formatTime(seconds: number) {
  const rounded = Math.max(0, Math.ceil(seconds))
  return `${Math.floor(rounded / 60).toString().padStart(2, '0')}:${(rounded % 60).toString().padStart(2, '0')}`
}
export const totalSeconds = (recipe: Recipe) => recipe.tasks.reduce((sum, task) => sum + task.seconds, 0)
export const newTask = (): BrewTask => ({ id: crypto.randomUUID(), type: 'pour', description: '', seconds: 30, amount: 50 })
export const newRecipe = (): Recipe => ({
  id: crypto.randomUUID(), name: '', description: '', coffee: 15, water: 250,
  temperature: 92, preparation: '', tasks: [newTask()],
})

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null
const isText = (value: unknown): value is string => typeof value === 'string'
const positive = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0
const validSeconds = (value: unknown) => positive(value) && Number.isSafeInteger(value) && value <= 86400

function isTask(value: unknown): value is BrewTask {
  if (!isRecord(value)) return false
  return isText(value.id) && value.id.length > 0 && isText(value.description)
    && (value.type === 'pour' || value.type === 'wait') && validSeconds(value.seconds)
    && (value.type === 'pour' ? positive(value.amount) : value.amount === 0)
}

function isRecipe(value: unknown): value is Recipe {
  if (!isRecord(value)) return false
  return isText(value.id) && value.id.length > 0 && isText(value.name) && value.name.trim().length > 0
    && isText(value.description) && isText(value.preparation) && positive(value.coffee)
    && positive(value.water) && positive(value.temperature) && value.temperature <= 100
    && Array.isArray(value.tasks) && value.tasks.length > 0 && value.tasks.every(isTask)
    && new Set(value.tasks.map(task => task.id)).size === value.tasks.length
}

export function parseRecipes(value: unknown): Recipe[] {
  if (!Array.isArray(value) || !value.every(isRecipe)
    || new Set(value.map(recipe => recipe.id)).size !== value.length) {
    throw new Error('レシピの形式が正しくありません。名前、数値、タスク、ID の重複を確認してください。')
  }
  return value
}

export function getBrewProgress(tasks: BrewTask[], elapsed: number) {
  let start = 0
  let poured = 0
  for (let index = 0; index < tasks.length; index++) {
    const task = tasks[index]
    if (elapsed < start + task.seconds) {
      const progress = Math.max(0, (elapsed - start) / task.seconds)
      return { index, remaining: Math.ceil(start + task.seconds - elapsed), progress,
        amount: task.type === 'pour' ? task.amount * progress : 0, poured }
    }
    start += task.seconds
    if (task.type === 'pour') poured += task.amount
  }
  return { index: tasks.length, remaining: 0, progress: 1, amount: 0, poured }
}

export const sampleRecipes: Recipe[] = [{
  id: 'house-blend', name: 'いつものハンドドリップ',
  description: 'すっきりとした甘さと、やさしい余韻。\n毎日の一杯にちょうどいい、基本のレシピです。',
  coffee: 15, water: 250, temperature: 92,
  preparation: '1. フィルターをセットし、お湯でリンスします。\n2. **中細挽きのコーヒー 15g** を入れ、表面を平らにします。\n3. サーバーをスケールにのせ、表示を 0 にします。',
  tasks: [
    { id: 'bloom', type: 'pour', description: '粉全体にお湯を行き渡らせます。中心から小さく円を描くように。', seconds: 10, amount: 30 },
    { id: 'bloom-wait', type: 'wait', description: 'コーヒーがふくらむのを、ゆっくり待ちましょう。', seconds: 30, amount: 0 },
    { id: 'first-pour', type: 'pour', description: '中心から外側へ、細くゆっくり注ぎます。', seconds: 40, amount: 120 },
    { id: 'last-pour', type: 'pour', description: 'やさしく注いで、合計 250g に仕上げます。', seconds: 30, amount: 100 },
    { id: 'drawdown', type: 'wait', description: 'お湯が落ちきったら、ドリッパーを外しましょう。', seconds: 40, amount: 0 },
  ],
}]
