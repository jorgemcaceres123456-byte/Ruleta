import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { CircleAlert, CircleCheck, Moon, Plus, Sun } from 'lucide-react'
import { Twinkle, WheelMark } from './marks.tsx'
import { ManageDialog, WheelChooser } from './WheelControls.tsx'
import type { DialogMode } from './WheelControls.tsx'
import { OptionsPanel } from './OptionsPanel.tsx'
import { WheelStage } from './WheelStage.tsx'
import { initialWorkspace, layoutWheel, newId, newOption, restoreWorkspace, STORAGE_KEY } from './roulette.ts'
import type { Option, Theme, Wheel } from './roulette.ts'
import { useSpin } from './useSpin.ts'

function loadWorkspace() {
  try {
    return restoreWorkspace(localStorage.getItem(STORAGE_KEY))
  } catch {
    return initialWorkspace()
  }
}

function Header({ theme, onTheme, onCreate, spinning }: {
  theme: Theme; onTheme: (theme: Theme) => void; onCreate: () => void; spinning: boolean
}) {
  return (
    <header className="topbar">
      <div className="shell topbar__inner">
        <div className="topbar__identity">
          <div className="brand">
            <span className="brand__mark"><WheelMark size={24} /></span>
            <span className="brand__name">gíralo<span>.</span></span>
          </div>
          <span className="topbar__descriptor">Estudio de ruletas</span>
        </div>
        <div className="topbar__controls">
          <div className="theme-toggle" role="group" aria-label="Tema de la aplicación">
            <button type="button" aria-label="Modo claro" title="Modo claro" aria-pressed={theme === 'light'} onClick={() => onTheme('light')}>
              <Sun size={17} strokeWidth={1.9} aria-hidden="true" />
            </button>
            <button type="button" aria-label="Modo oscuro" title="Modo oscuro" aria-pressed={theme === 'dark'} onClick={() => onTheme('dark')}>
              <Moon size={16} strokeWidth={1.9} aria-hidden="true" />
            </button>
          </div>
          <button type="button" className="button button--primary new-wheel" onClick={onCreate} aria-label="Nueva ruleta" disabled={spinning}>
            <Plus size={18} strokeWidth={2.2} aria-hidden="true" />
            <span className="new-wheel__wide">Nueva ruleta</span>
            <span className="new-wheel__compact" aria-hidden="true">Nueva</span>
          </button>
        </div>
      </div>
    </header>
  )
}

export default function App() {
  const [workspace, setWorkspace] = useState(loadWorkspace)
  const [saved, setSaved] = useState(true)
  const [dialog, setDialog] = useState<DialogMode | null>(null)
  const wheel = workspace.wheels.find(({ id }) => id === workspace.activeWheelId) ?? workspace.wheels[0]
  const layout = useMemo(() => layoutWheel(wheel.options), [wheel.options])
  const { rotor, spin, reset, state } = useSpin(layout)
  const spinning = state.phase === 'spinning'
  const canSpin = layout.segments.length > 0

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = workspace.theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', workspace.theme === 'light' ? '#fcfbff' : '#13111b')
  }, [workspace.theme])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace))
      setSaved(true)
    } catch {
      setSaved(false)
    }
  }, [workspace])

  useEffect(() => {
    if (!canSpin || spinning || dialog) return
    function onSpace(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat || event.altKey || event.ctrlKey || event.metaKey
        || (event.code !== 'Space' && event.key !== ' ')) return
      if (event.target instanceof Element && event.target.closest('input, textarea, select, button, a[href], [contenteditable]')) return
      event.preventDefault()
      spin()
    }
    window.addEventListener('keydown', onSpace)
    return () => window.removeEventListener('keydown', onSpace)
  }, [canSpin, spinning, dialog, spin])

  const setTheme = useCallback((theme: Theme) => {
    setWorkspace((previous) => previous.theme === theme ? previous : { ...previous, theme })
  }, [])

  function selectWheel(id: string) {
    reset()
    setWorkspace((previous) => ({ ...previous, activeWheelId: id }))
  }

  const updateOptions = useCallback((update: (options: Option[]) => Option[]) => {
    reset()
    setWorkspace((previous) => ({
      ...previous,
      wheels: previous.wheels.map((item) => item.id === previous.activeWheelId ? { ...item, options: update(item.options) } : item),
    }))
  }, [reset])

  const addOption = useCallback((name: string) => {
    const option = newOption(name, wheel.options)
    updateOptions((options) => [...options, option])
  }, [updateOptions, wheel.options])

  const editOption = useCallback((id: string, patch: Partial<Pick<Option, 'name' | 'weight'>>) => {
    updateOptions((options) => options.map((option) => option.id === id ? { ...option, ...patch } : option))
  }, [updateOptions])

  const removeOption = useCallback((id: string) => {
    updateOptions((options) => options.filter((option) => option.id !== id))
  }, [updateOptions])

  function confirm(name: string) {
    reset()
    if (dialog === 'create') {
      const created: Wheel = { id: newId(), name, options: [] }
      setWorkspace((previous) => ({ ...previous, activeWheelId: created.id, wheels: [...previous.wheels, created] }))
    } else if (dialog === 'rename') {
      setWorkspace((previous) => ({ ...previous, wheels: previous.wheels.map((item) => item.id === wheel.id ? { ...item, name } : item) }))
    } else if (dialog === 'delete') {
      const wheels = workspace.wheels.filter(({ id }) => id !== wheel.id)
      if (!wheels.length) wheels.push({ id: newId(), name: 'Mi ruleta', options: [] })
      setWorkspace({ ...workspace, wheels, activeWheelId: wheels[0].id })
    }
    setDialog(null)
  }

  return (
    <>
      <Header theme={workspace.theme} onTheme={setTheme} onCreate={() => setDialog('create')} spinning={spinning} />
      <main className="shell main">
        <div className="intro">
          <div className="intro__copy">
            <span className="eyebrow"><Twinkle size={15} /> El azar decide</span>
            <h1>Tu ruleta<span>.</span></h1>
            <p>Crea, gira y deja que el azar tome la decisión.</p>
          </div>
          <WheelChooser wheels={workspace.wheels} wheelId={wheel.id} disabled={spinning} onSelect={selectWheel} onManage={setDialog} />
        </div>

        <div className="workspace">
          <WheelStage name={wheel.name} optionCount={wheel.options.length} layout={layout} rotor={rotor} spinState={state} onSpin={spin} />
          <OptionsPanel key={wheel.id} options={wheel.options} chances={layout.chances} disabled={spinning} onAdd={addOption} onEdit={editOption} onRemove={removeOption} />
        </div>
      </main>
      <footer className="shell footer">
        <span className={saved ? 'footer__save' : 'footer__save footer__save--error'}>
          {saved ? <CircleCheck size={15} strokeWidth={1.7} aria-hidden="true" /> : <CircleAlert size={15} aria-hidden="true" />}
          {saved ? 'Guardado en este dispositivo' : 'No se pudo guardar en este dispositivo'}
        </span>
        <span className="footer__tag"><Twinkle size={12} /> Un giro lo decide todo</span>
      </footer>
      {dialog && <ManageDialog mode={dialog} wheel={wheel} onDismiss={() => setDialog(null)} onConfirm={confirm} />}
    </>
  )
}
