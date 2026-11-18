import { memo, useLayoutEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Info, ListPlus, Plus, X } from 'lucide-react'
import { formatChance, parseWeight } from './roulette.ts'
import type { Option } from './roulette.ts'

type Patch = Partial<Pick<Option, 'name' | 'weight'>>

const OptionRow = memo(function OptionRow({
  option, index, chance, disabled, onEdit, onRemove,
}: {
  option: Option
  index: number
  chance: number
  disabled: boolean
  onEdit: (id: string, patch: Patch) => void
  onRemove: (id: string) => void
}) {
  const [nameDraft, setNameDraft] = useState<string | null>(null)
  const [weightDraft, setWeightDraft] = useState<string | null>(null)
  const invalid = weightDraft !== null && weightDraft !== '' && parseWeight(weightDraft) === null

  return (
    <li className="option-row">
      <div className="option-row__name">
        <span className="option-row__color" style={{ backgroundColor: option.color }} aria-hidden="true" />
        <input
          aria-label={`Nombre de la opción ${index + 1}`}
          title={option.name}
          value={nameDraft ?? option.name}
          disabled={disabled}
          onChange={(event) => {
            const next = event.target.value
            setNameDraft(next)
            if (next.trim() && next.trim() !== option.name) onEdit(option.id, { name: next.trim() })
          }}
          onBlur={() => setNameDraft(null)}
          onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }}
        />
      </div>
      <input
        className="option-row__weight"
        aria-label={`Peso de ${option.name}`}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `weight-error-${option.id}` : 'weights-note'}
        title={invalid ? 'Ingresa un número mayor o igual a 0.' : `Peso de ${option.name}`}
        inputMode="decimal"
        value={weightDraft ?? option.weight.toString()}
        disabled={disabled}
        spellCheck={false}
        onChange={(event) => {
          const next = event.target.value
          setWeightDraft(next)
          const parsed = parseWeight(next)
          if (parsed !== null && parsed !== option.weight) onEdit(option.id, { weight: parsed })
        }}
        onBlur={() => setWeightDraft(null)}
        onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }}
      />
      {invalid && <span id={`weight-error-${option.id}`} className="sr-only">Ingresa un número mayor o igual a 0.</span>}
      <span className="option-row__chance"><span className="sr-only">Probabilidad: </span>{formatChance(chance)}</span>
      <button
        type="button"
        className="option-row__remove icon-button"
        aria-label={`Quitar ${option.name}`}
        title={`Quitar ${option.name}`}
        onClick={() => onRemove(option.id)}
        disabled={disabled}
      >
        <X size={16} aria-hidden="true" />
      </button>
    </li>
  )
})

export const OptionsPanel = memo(function OptionsPanel({
  options, chances, disabled, onAdd, onEdit, onRemove,
}: {
  options: Option[]
  chances: Map<string, number>
  disabled: boolean
  onAdd: (name: string) => void
  onEdit: (id: string, patch: Patch) => void
  onRemove: (id: string) => void
}) {
  const [draft, setDraft] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const scrollOnAdd = useRef(false)

  useLayoutEffect(() => {
    if (scrollOnAdd.current && list.current) list.current.scrollTop = list.current.scrollHeight
    scrollOnAdd.current = false
  }, [options.length])

  function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (disabled) return
    const name = draft.trim()
    if (name) {
      scrollOnAdd.current = true
      onAdd(name)
      setDraft('')
    }
    input.current?.focus({ preventScroll: true })
  }

  return (
    <section className="options panel" aria-labelledby="options-title">
      <div className="options__header">
        <div className="options__mark"><ListPlus size={22} strokeWidth={1.85} aria-hidden="true" /></div>
        <div className="options__heading">
          <h2 id="options-title">Opciones</h2>
          <p>Personaliza las opciones de tu ruleta.</p>
        </div>
        <span className="options__count" title={`${options.length} ${options.length === 1 ? 'opción' : 'opciones'}`}>{options.length}</span>
      </div>

      <form className="add-option" onSubmit={add}>
        <input
          ref={input}
          aria-label="Nueva opción"
          placeholder="Escribe una nueva opción…"
          autoComplete="off"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          disabled={disabled}
        />
        <button type="submit" className="button button--primary add-option__button" aria-label="Agregar opción" title="Agregar opción" disabled={disabled}>
          <Plus size={22} strokeWidth={2.25} aria-hidden="true" />
        </button>
      </form>

      {options.length ? (
        <>
          <div className="options__columns" aria-hidden="true">
            <span>Opción</span><span>Peso</span><span>Prob.</span><span />
          </div>
          <ul ref={list} className="options__list" aria-label="Opciones de la ruleta">
            {options.map((option, index) => (
              <OptionRow key={option.id} option={option} index={index} chance={chances.get(option.id) ?? 0} disabled={disabled} onEdit={onEdit} onRemove={onRemove} />
            ))}
          </ul>
        </>
      ) : (
        <div className="options__empty">
          <div className="options__mark"><ListPlus size={22} strokeWidth={1.75} aria-hidden="true" /></div>
          <strong>Todavía no hay opciones</strong>
          <p>Escribe una arriba y pulsa el botón <b>+</b> para agregarla.</p>
        </div>
      )}

      <div className="weights-note" id="weights-note">
        <Info size={17} strokeWidth={1.9} aria-hidden="true" />
        <div>
          <strong>¿Cómo funciona el peso?</strong>
          <p>Más peso, más espacio en la ruleta y más probabilidad de salir. Con peso 0, la opción no participa.</p>
        </div>
      </div>
    </section>
  )
})
