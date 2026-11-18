import { useCallback, useEffect, useRef, useState } from 'react'
import { normalizeAngle, planSpin, segmentAtAngle } from './roulette.ts'
import type { Layout, Option } from './roulette.ts'

export type SpinState =
  | { phase: 'idle' }
  | { phase: 'spinning' | 'finished'; option: Option; sequence: number }

const SPIN_TIME = 4450

export function useSpin(layout: Layout) {
  const [state, setState] = useState<SpinState>({ phase: 'idle' })
  const rotor = useRef<SVGGElement>(null)
  const rotation = useRef(0)
  const frameId = useRef<number | null>(null)
  const sequence = useRef(0)

  const turn = useCallback((angle: number) => {
    rotation.current = angle
    rotor.current?.setAttribute('transform', `rotate(${angle} 200 200)`)
  }, [])

  const stop = useCallback(() => {
    if (frameId.current !== null) cancelAnimationFrame(frameId.current)
    frameId.current = null
  }, [])

  const reset = useCallback(() => {
    stop()
    turn(0)
    setState((current) => current.phase === 'idle' ? current : { phase: 'idle' })
  }, [stop, turn])

  useEffect(() => stop, [stop])

  const spin = useCallback(() => {
    if (frameId.current !== null || layout.segments.length === 0) return
    const from = rotation.current
    const plan = planSpin(layout, from)
    if (!plan) return
    const run = ++sequence.current

    function finish() {
      frameId.current = null
      turn(normalizeAngle(plan!.to))
      setState({ phase: 'finished', option: plan!.option, sequence: run })
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finish()
      return
    }

    let active = segmentAtAngle(layout, -from)?.option ?? plan.option
    setState({ phase: 'spinning', option: active, sequence: run })
    const started = performance.now()
    const to = plan.to

    function frame(now: number) {
      const t = Math.min(1, Math.max(0, (now - started) / SPIN_TIME))
      if (t === 1) {
        finish()
        return
      }
      const eased = 1 - (1 - t) ** 3.35
      const angle = from + (to - from) * eased
      turn(angle)
      const next = segmentAtAngle(layout, -angle)?.option
      if (next && next.id !== active.id) {
        active = next
        setState({ phase: 'spinning', option: next, sequence: run })
      }
      frameId.current = requestAnimationFrame(frame)
    }

    frameId.current = requestAnimationFrame(frame)
  }, [layout, turn])

  return { state, rotor, spin, reset }
}
