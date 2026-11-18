export const STORAGE_KEY = 'giralo:v1'
export const FULL_TURN = 360
export const PALETTE = ['#BBA4FA', '#F3A6C7', '#F7C584', '#9DE0BE', '#98BFF8', '#D5AFF0', '#F5A895', '#A6D9E3']

export type Theme = 'dark' | 'light'
export type Option = { id: string; name: string; weight: number; color: string }
export type Wheel = { id: string; name: string; options: Option[] }
export type Workspace = { theme: Theme; activeWheelId: string; wheels: Wheel[] }

export type Segment = { option: Option; start: number; end: number }
export type Layout = { start: number; segments: Segment[]; chances: Map<string, number> }

export function newId() {
  return Array.from(crypto.getRandomValues(new Uint32Array(4)), (part) =>
    part.toString(16).padStart(8, '0'),
  ).join('')
}

export function newOption(name: string, options: Option[]): Option {
  const lastColor = options.at(-1)?.color ?? ''
  const color = PALETTE[(PALETTE.indexOf(lastColor) + 1) % PALETTE.length]
  return { id: newId(), name, weight: 1, color }
}

export function initialWorkspace(): Workspace {
  const id = 'comida'
  return {
    theme: 'dark',
    activeWheelId: id,
    wheels: [{
      id,
      name: '¿Qué comemos hoy?',
      options: ['Pizza', 'Hamburguesa', 'Sushi', 'Tacos', 'Pasta', 'Ensalada'].map((name, i) => ({
        id: `comida-${i}`,
        name,
        weight: 1,
        color: PALETTE[i],
      })),
    }],
  }
}

function isOption(value: unknown): value is Option {
  if (!value || typeof value !== 'object') return false
  const option = value as Partial<Option>
  return typeof option.id === 'string' && typeof option.name === 'string' && !!option.name.trim()
    && typeof option.weight === 'number' && Number.isFinite(option.weight) && option.weight >= 0
    && typeof option.color === 'string' && /^#[0-9a-f]{6}$/i.test(option.color)
}

function isWheel(value: unknown): value is Wheel {
  if (!value || typeof value !== 'object') return false
  const wheel = value as Partial<Wheel>
  return typeof wheel.id === 'string' && typeof wheel.name === 'string' && !!wheel.name.trim()
    && Array.isArray(wheel.options) && wheel.options.every(isOption)
    && new Set(wheel.options.map(({ id }) => id)).size === wheel.options.length
}

export function restoreWorkspace(serialized: string | null): Workspace {
  if (!serialized) return initialWorkspace()
  try {
    const saved = JSON.parse(serialized) as Partial<Workspace> | null
    if (saved && Array.isArray(saved.wheels) && saved.wheels.length && saved.wheels.every(isWheel)
      && new Set(saved.wheels.map(({ id }) => id)).size === saved.wheels.length) {
      return {
        theme: saved.theme === 'light' ? 'light' : 'dark',
        wheels: saved.wheels,
        activeWheelId: saved.wheels.find(({ id }) => id === saved.activeWheelId)?.id ?? saved.wheels[0].id,
      }
    }
  } catch {
    // A saved session can be missing or malformed. Start with the example instead.
  }
  return initialWorkspace()
}

export function parseWeight(input: string): number | null {
  const normalized = input.trim().replace(',', '.')
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(normalized)) return null
  const value = Number(normalized)
  return Number.isFinite(value) && value >= 0 ? value : null
}

const percent = new Intl.NumberFormat('es', { style: 'percent', maximumFractionDigits: 1 })

export function formatChance(probability: number) {
  return probability > 0 && probability < 0.001 ? '<0,1 %' : percent.format(probability)
}

export function normalizeAngle(angle: number) {
  const remainder = angle % FULL_TURN
  return remainder < 0 ? remainder + FULL_TURN : remainder || 0
}

export function layoutWheel(options: Option[]): Layout {
  const chances = new Map<string, number>()
  let max = 0
  for (const { weight } of options) max = Math.max(max, weight)
  if (max === 0) return { start: 0, segments: [], chances }

  // Scaling prevents overflow when several large weights are added together.
  const eligible = options.filter(({ weight }) => weight > 0)
  const total = eligible.reduce((sum, { weight }) => sum + weight / max, 0)
  const start = -(eligible[0].weight / max / total) * FULL_TURN / 2
  const segments: Segment[] = []
  let accumulated = 0
  let angle = start

  eligible.forEach((option, index) => {
    const scaled = option.weight / max
    const chance = scaled / total
    chances.set(option.id, chance)
    accumulated += scaled
    const end = index === eligible.length - 1 ? start + FULL_TURN : start + FULL_TURN * (accumulated / total)
    if (end > angle) segments.push({ option, start: angle, end })
    angle = end
  })
  return { start, segments, chances }
}

// Angles are clockwise, with zero at the top (the pointer).
export function segmentAtAngle(layout: Layout, angle: number): Segment | undefined {
  const { segments, start } = layout
  if (!segments.length) return undefined
  const position = start + normalizeAngle(angle - start)
  let lo = 0
  let hi = segments.length - 1
  while (lo < hi) {
    const middle = (lo + hi) >>> 1
    if (position < segments[middle].end) hi = middle
    else lo = middle + 1
  }
  return segments[lo]
}

export function randomFraction() {
  const [high, low] = crypto.getRandomValues(new Uint32Array(2))
  // Combine 53 unbiased random bits, exactly the precision of a JS Number.
  return ((high & 0x1fffff) * 0x100000000 + low) / 0x20000000000000
}

export function planSpin(layout: Layout, rotation: number, draw = randomFraction()) {
  if (!layout.segments.length) return null
  const sampledAngle = layout.start + draw * FULL_TURN
  const segment = segmentAtAngle(layout, sampledAngle)!
  const sweep = segment.end - segment.start
  const progressInSegment = (sampledAngle - segment.start) / sweep
  // First pick a segment by its full weighted area. Nudge the landing toward
  // its interior afterwards so the pointer never appears to pick a border.
  const landingAngle = segment.start + sweep * (0.22 + 0.56 * progressInSegment)
  const distance = normalizeAngle(-landingAngle - rotation)
  return { option: segment.option, to: rotation + 5 * FULL_TURN + distance }
}
