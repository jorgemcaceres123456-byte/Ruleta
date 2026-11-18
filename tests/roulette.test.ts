import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  formatChance, initialWorkspace, layoutWheel, normalizeAngle, parseWeight,
  planSpin, randomFraction, restoreWorkspace, segmentAtAngle,
} from '../src/roulette.ts'
import type { Option } from '../src/roulette.ts'

function options(...weights: number[]): Option[] {
  return weights.map((weight, i) => ({ id: String(i), name: `Opción ${i}`, weight, color: '#BBA4FA' }))
}

test('el peso determina tanto el porcentaje como el arco dibujado', () => {
  const layout = layoutWheel(options(1, 3, 0))
  assert.equal(layout.chances.get('0'), 0.25)
  assert.equal(layout.chances.get('1'), 0.75)
  assert.deepEqual(layout.segments.map(({ start, end }) => end - start), [90, 270])
  assert.equal(layout.segments.some(({ option }) => option.id === '2'), false)
  assert.equal(segmentAtAngle(layout, 45)?.option.id, '1')
  assert.equal(segmentAtAngle(layout, -360)?.option.id, '0')
  assert.equal(segmentAtAngle(layout, -45)?.option.id, '0')
})

test('un sorteo uniforme en ángulo elige resultados según el peso', () => {
  const layout = layoutWheel(options(1, 2, 7, 0))
  const counts = [0, 0, 0, 0]
  for (let i = 0; i < 1000; i++) {
    const plan = planSpin(layout, 253.5, (i + 0.5) / 1000)!
    counts[Number(plan.option.id)]++
    assert.ok(plan.to >= 253.5 + 360 * 5)
    assert.equal(segmentAtAngle(layout, -normalizeAngle(plan.to))?.option.id, plan.option.id)
  }
  assert.deepEqual(counts, [100, 200, 700, 0])
})

test('funciona con una sola opción activa, y no gira si no hay ninguna', () => {
  const single = layoutWheel(options(0, 2, 0))
  assert.equal(single.segments[0].end - single.segments[0].start, 360)
  assert.equal(planSpin(single, 0, 0.83)?.option.id, '1')
  for (const weights of [[], [0, 0]]) {
    const none = layoutWheel(options(...weights))
    assert.equal(planSpin(none, 0, 0.2), null)
    assert.equal(segmentAtAngle(none, 22), undefined)
  }
})

test('no introduce un máximo de opciones ni desborda al sumar pesos grandes', () => {
  const layout = layoutWheel(options(...Array<number>(2500).fill(Number.MAX_VALUE)))
  assert.equal(layout.segments.length, 2500)
  assert.equal(layout.chances.get('0'), 1 / 2500)
  assert.equal(layout.segments.at(-1)!.end - layout.start, 360)
})

test('acepta pesos decimales y rechaza entradas negativas o inválidas', () => {
  assert.equal(parseWeight('2,5'), 2.5)
  assert.equal(parseWeight(' .4 '), 0.4)
  assert.equal(parseWeight('0'), 0)
  assert.equal(parseWeight('1e-5'), 0.00001)
  for (const input of ['', '-1', '1,2,3', 'Infinity', '5px', '1e500']) assert.equal(parseWeight(input), null)
  assert.match(formatChance(0), /^0\s?%$/)
  assert.equal(formatChance(0.0004), '<0,1 %')
})

test('la fuente aleatoria siempre produce fracciones en [0, 1)', () => {
  for (let i = 0; i < 100; i++) {
    const draw = randomFraction()
    assert.ok(draw >= 0 && draw < 1)
  }
})

test('restaura las ruletas, el tema y la selección guardados', () => {
  const original = initialWorkspace()
  original.theme = 'light'
  original.wheels.push({ id: 'planes', name: 'Planes', options: options(3, 0, 1.5) })
  original.activeWheelId = 'planes'
  const stored = JSON.stringify(original)
  assert.deepEqual(restoreWorkspace(stored), original)
  assert.equal(restoreWorkspace(JSON.stringify({ ...original, activeWheelId: 'faltante' })).activeWheelId, original.wheels[0].id)
  assert.deepEqual(restoreWorkspace('{datos inválidos'), initialWorkspace())
})
