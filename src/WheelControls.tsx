import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ChevronDown, Ellipsis, Pencil, Plus, Trash2, X } from 'lucide-react'
import { WheelMark } from './marks.tsx'
import type { Wheel } from './roulette.ts'

export type DialogMode = 'create' | 'rename' | 'delete'

export function WheelChooser({
  wheels, wheelId, disabled, onSelect, onManage,
}: {
  wheels: Wheel[]
  wheelId: string
  disabled: boolean
  onSelect: (id: string) => void
  onManage: (mode: DialogMode) => void
}) {
  const [open, setOpen] = useState(false)
  const actions = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const firstAction = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open || disabled) return
    firstAction.current?.focus()
    function clickOutside(event: PointerEvent) {
      if (!actions.current?.contains(event.target as Node)) setOpen(false)
    }
    function onEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
        trigger.current?.focus()
      }
    }
    document.addEventListener('pointerdown', clickOutside)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('pointerdown', clickOutside)
      document.removeEventListener('keydown', onEscape)
    }
  }, [open, disabled])

  function manage(mode: DialogMode) {
    setOpen(false)
    trigger.current?.focus()
    onManage(mode)
  }

  return (
    <div className="wheel-chooser">
      <label className="wheel-chooser__label" htmlFor="wheel-select">Mis ruletas</label>
      <div className="wheel-chooser__row">
        <div className="wheel-chooser__select">
          <span className="wheel-chooser__mark"><WheelMark size={21} /></span>
          <select
            id="wheel-select"
            value={wheelId}
            title={wheels.find(({ id }) => id === wheelId)?.name}
            onChange={(event) => { setOpen(false); onSelect(event.target.value) }}
            disabled={disabled}
          >
            {wheels.map((wheel) => <option key={wheel.id} value={wheel.id}>{wheel.name}</option>)}
          </select>
          <ChevronDown size={17} className="wheel-chooser__arrow" aria-hidden="true" />
        </div>
        <div className="wheel-actions" ref={actions} onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
        }}>
          <button
            ref={trigger}
            type="button"
            className="icon-button wheel-actions__toggle"
            aria-label="Administrar ruleta"
            title="Administrar ruleta"
            aria-expanded={open && !disabled}
            aria-controls={open && !disabled ? 'wheel-actions' : undefined}
            disabled={disabled}
            onClick={() => setOpen((value) => !value)}
          >
            <Ellipsis size={20} aria-hidden="true" />
          </button>
          {open && !disabled && (
            <div className="wheel-actions__menu" id="wheel-actions">
              <button ref={firstAction} type="button" onClick={() => manage('rename')}><Pencil size={16} aria-hidden="true" />Cambiar nombre</button>
              <button type="button" className="wheel-actions__danger" onClick={() => manage('delete')}><Trash2 size={16} aria-hidden="true" />Eliminar ruleta</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const copy = {
  create: { title: 'Nueva ruleta', text: 'Dale un nombre y agrega las opciones que quieras.', submit: 'Crear ruleta', Icon: Plus },
  rename: { title: 'Cambiar nombre', text: 'Elige un nuevo nombre para esta ruleta.', submit: 'Guardar nombre', Icon: Pencil },
  delete: { title: '¿Eliminar ruleta?', text: '', submit: 'Eliminar ruleta', Icon: Trash2 },
}

export function ManageDialog({ mode, wheel, onDismiss, onConfirm }: {
  mode: DialogMode
  wheel: Wheel
  onDismiss: () => void
  onConfirm: (name: string) => void
}) {
  const [name, setName] = useState(mode === 'rename' ? wheel.name : '')
  const dialog = useRef<HTMLDialogElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const cancel = useRef<HTMLButtonElement>(null)
  const { title, text, submit, Icon } = copy[mode]
  const isDelete = mode === 'delete'

  useLayoutEffect(() => {
    const element = dialog.current!
    element.showModal()
    if (mode === 'delete') cancel.current?.focus()
    else {
      input.current?.focus()
      if (mode === 'rename') input.current?.select()
    }
    return () => { if (element.open) element.close() }
  }, [mode])

  function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDelete || name.trim()) onConfirm(name.trim())
  }

  return (
    <dialog
      ref={dialog}
      className="dialog"
      aria-labelledby="dialog-title"
      aria-describedby="dialog-description"
      onCancel={(event) => { event.preventDefault(); onDismiss() }}
      onClick={(event) => { if (event.target === event.currentTarget) onDismiss() }}
    >
      <form className="dialog__inner" onSubmit={confirm}>
        <div className={`dialog__mark${isDelete ? ' dialog__mark--danger' : ''}`}><Icon size={23} aria-hidden="true" /></div>
        <button type="button" className="dialog__close icon-button" aria-label="Cerrar" onClick={onDismiss}><X size={20} aria-hidden="true" /></button>
        <h2 id="dialog-title">{title}</h2>
        <p id="dialog-description">
          {isDelete ? <>Se eliminará «{wheel.name}» y todas sus opciones. Esta acción no se puede deshacer.</> : text}
        </p>
        {!isDelete && (
          <label className="dialog__field">
            Nombre de la ruleta
            <input ref={input} value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej. Plan para el finde" autoComplete="off" />
          </label>
        )}
        <div className="dialog__buttons">
          <button ref={cancel} type="button" className="button button--secondary" onClick={onDismiss}>Cancelar</button>
          <button type="submit" className={`button ${isDelete ? 'button--danger' : 'button--primary'}`} disabled={!isDelete && !name.trim()}>{submit}</button>
        </div>
      </form>
    </dialog>
  )
}
