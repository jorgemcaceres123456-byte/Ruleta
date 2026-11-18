import { memo, useId } from 'react'
import type { CSSProperties, Ref } from 'react'
import { RotateCw } from 'lucide-react'
import { Twinkle } from './marks.tsx'
import { FULL_TURN, PALETTE } from './roulette.ts'
import type { Layout, Segment } from './roulette.ts'
import type { SpinState } from './useSpin.ts'

const CENTER = 200
const FACE_RADIUS = 178
const TICKS = Array.from({ length: 60 }, (_, i) => i)
const EMPTY_RAYS = [30, 90, 150, 210, 270, 330]

function point(angle: number, radius: number) {
  const radians = angle * Math.PI / 180
  return [CENTER + radius * Math.sin(radians), CENTER - radius * Math.cos(radians)] as const
}

function segmentPath(start: number, end: number) {
  const [x1, y1] = point(start, FACE_RADIUS)
  const [x2, y2] = point(end, FACE_RADIUS)
  return `M${CENTER} ${CENTER} L${x1} ${y1} A${FACE_RADIUS} ${FACE_RADIUS} 0 ${end - start > 180 ? 1 : 0} 1 ${x2} ${y2} Z`
}

function SegmentLabel({ segment }: { segment: Segment }) {
  const sweep = segment.end - segment.start
  if (sweep < 7.5) return null
  const mid = (segment.start + segment.end) / 2
  const rightHalf = Math.sin(mid * Math.PI / 180) >= -1e-10
  const size = Math.min(17, sweep * 1.2)
  const narrow = sweep < 20
  const [x, y] = point(mid, narrow ? 127 : 115)
  const limit = Math.floor((narrow ? 91 : 114) / (size * 0.58))
  const chars = Array.from(segment.option.name)
  const text = chars.length > limit ? `${chars.slice(0, limit - 1).join('')}…` : segment.option.name
  return (
    <text
      x={x} y={y} textAnchor="middle" dominantBaseline="central"
      transform={`rotate(${mid + (rightHalf ? -90 : 90)} ${x} ${y})`}
      fontSize={size} className="wheel__label"
    >
      {text}
    </text>
  )
}

const WheelGraphic = memo(function WheelGraphic({ layout, rotor }: { layout: Layout; rotor: Ref<SVGGElement> }) {
  const id = useId()
  const rim = `${id}-rim`
  const sheen = `${id}-sheen`
  const empty = `${id}-empty`
  return (
    <svg className="wheel__svg" viewBox="0 0 400 400" aria-hidden="true">
      <defs>
        <linearGradient id={rim} x1="0" x2="0" y1="0" y2="1">
          <stop stopColor="var(--wheel-rim-top)" />
          <stop offset="1" stopColor="var(--wheel-rim-bottom)" />
        </linearGradient>
        <radialGradient id={sheen}>
          <stop stopColor="#241334" stopOpacity=".16" />
          <stop offset=".67" stopColor="#ffffff" stopOpacity=".035" />
          <stop offset="1" stopColor="#ffffff" stopOpacity=".15" />
        </radialGradient>
        <radialGradient id={empty}>
          <stop stopColor="var(--empty-core)" />
          <stop offset="1" stopColor="var(--empty-edge)" />
        </radialGradient>
      </defs>
      <circle cx="200" cy="200" r="197.5" fill="none" stroke="var(--wheel-outline)" />
      <circle cx="200" cy="200" r="193.5" fill={`url(#${rim})`} stroke="var(--wheel-edge)" strokeWidth="1.5" />
      <circle cx="200" cy="200" r="184" fill="none" stroke="var(--wheel-outline)" />
      {TICKS.map((tick) => {
        const major = tick % 5 === 0
        const [x1, y1] = point(tick * 6, major ? 186.5 : 188)
        const [x2, y2] = point(tick * 6, 191)
        return <line key={tick} x1={x1} y1={y1} x2={x2} y2={y2} className={major ? 'wheel__tick wheel__tick--major' : 'wheel__tick'} />
      })}
      <g ref={rotor}>
        {layout.segments.map(({ option, start, end }) => (
          end - start >= FULL_TURN - 1e-10
            ? <circle key={option.id} cx="200" cy="200" r={FACE_RADIUS} fill={option.color} />
            : <path key={option.id} d={segmentPath(start, end)} fill={option.color} stroke="var(--wheel-seam)" strokeWidth={Math.min(1.5, (end - start) * 0.65)} strokeLinejoin="round" />
        ))}
        {layout.segments.length > 0 ? (
          <>
            <circle cx="200" cy="200" r={FACE_RADIUS} fill={`url(#${sheen})`} />
            {layout.segments.map((segment) => <SegmentLabel key={segment.option.id} segment={segment} />)}
          </>
        ) : (
          <>
            <circle cx="200" cy="200" r={FACE_RADIUS} fill={`url(#${empty})`} />
            {EMPTY_RAYS.map((angle) => {
              const [x, y] = point(angle, FACE_RADIUS)
              return <line key={angle} x1="200" y1="200" x2={x} y2={y} stroke="var(--wheel-edge)" strokeDasharray="4 6" />
            })}
            <circle cx="200" cy="200" r="115" fill="none" stroke="var(--wheel-outline)" strokeDasharray="2 6" />
          </>
        )}
      </g>
      <circle cx="200" cy="200" r={FACE_RADIUS + 0.5} fill="none" stroke="var(--wheel-seam)" strokeWidth="1.5" />
      <circle cx="200" cy="200" r={FACE_RADIUS - 1.5} fill="none" stroke="#ffffff" strokeOpacity=".18" />
    </svg>
  )
})

function Celebration() {
  return (
    <div className="celebration" aria-hidden="true">
      {Array.from({ length: 16 }, (_, i) => {
        const angle = Math.PI * 2 * i / 16
        const distance = 80 + 32 * (i % 5)
        return <i key={i} style={{
          '--x': `${Math.cos(angle) * distance}px`,
          '--y': `${Math.sin(angle) * distance * 0.63}px`,
          '--turn': `${32 * i}deg`,
          '--confetti-color': PALETTE[i % PALETTE.length],
        } as CSSProperties} />
      })}
    </div>
  )
}

export function WheelStage({
  name, optionCount, layout, rotor, spinState, onSpin,
}: {
  name: string
  optionCount: number
  layout: Layout
  rotor: Ref<SVGGElement>
  spinState: SpinState
  onSpin: () => void
}) {
  const spinning = spinState.phase === 'spinning'
  const finished = spinState.phase === 'finished'
  const canSpin = layout.segments.length > 0
  const title = spinState.phase === 'idle' ? name : spinState.option.name
  const status = spinning ? 'Girando' : finished ? 'Resultado' : canSpin ? 'Lista para girar' : optionCount ? 'Sin pesos activos' : 'Sin opciones'

  return (
    <section className="stage panel" aria-labelledby="stage-title" data-phase={spinState.phase}>
      <div className="stage__decor" aria-hidden="true">
        <span className="stage__cross stage__cross--one">+</span>
        <span className="stage__cross stage__cross--two">+</span>
        <span className="stage__star stage__star--one"><Twinkle size={25} /></span>
        <span className="stage__star stage__star--two"><Twinkle size={16} /></span>
        <span className="stage__star stage__star--three"><Twinkle size={9} /></span>
        <span className="stage__asterism stage__asterism--one" />
        <span className="stage__asterism stage__asterism--two" />
      </div>
      <div className="stage__readout">
        <span className="stage__status"><i />{status}</span>
        <h2 id="stage-title" title={title}>{title}</h2>
        {finished && <Celebration key={spinState.sequence} />}
      </div>
      <div className="sr-only" role="status">
        {finished ? `Resultado del giro ${spinState.sequence}: ${title}` : ''}
      </div>
      <div className="wheel" data-empty={!canSpin || undefined}>
        <div className="wheel__orbit" aria-hidden="true" />
        <WheelGraphic layout={layout} rotor={rotor} />
        <svg className="wheel__pointer" viewBox="0 0 36 34" aria-hidden="true">
          <path d="M7 2h22c4 0 5.8 3.9 3.7 7.4L21.6 29c-1.6 2.8-5.6 2.8-7.2 0L3.3 9.4C1.2 5.9 3 2 7 2Z" />
          <path d="M9 6h18" className="wheel__pointer-shine" />
        </svg>
        <button type="button" className="wheel__hub" aria-label="Girar desde el centro" onClick={onSpin} disabled={!canSpin || spinning} tabIndex={-1}>
          <Twinkle size={25} />
        </button>
      </div>
      <button type="button" className="button button--primary spin-button" onClick={onSpin} disabled={!canSpin || spinning}>
        <RotateCw size={20} strokeWidth={2.35} aria-hidden="true" />
        {spinning ? 'Girando…' : 'Girar ruleta'}
      </button>
      <p className="stage__hint">
        {!canSpin
          ? optionCount ? 'Asigna un peso mayor que 0 para girar.' : 'Añade una opción para empezar.'
          : spinning ? 'El azar está eligiendo…' : <><span className="stage__keyboard">Pulsa <kbd>Espacio</kbd> para girar</span><span className="stage__touch">Toca el centro para girar</span></>}
      </p>
    </section>
  )
}
