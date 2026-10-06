import { describe, expect, it } from 'vitest'
import { useScoutKeyboard, type ScoutColumnApi } from '@/composables/useScoutKeyboard'

// El composable usa window.setTimeout y onUnmounted; en Node se simula lo mínimo.
Object.assign(globalThis, { window: globalThis })

const setup = (court = ['1', '12', '5', '7', '9', '10']) => {
  const log: string[] = []
  let selected: string | null = null
  const finish = () => {
    selected = null
  }
  const column: ScoutColumnApi = {
    courtNumbers: () => court,
    serverNumber: () => court[0],
    selectedNumber: () => selected,
    select: (number) => {
      if (number !== null && !court.includes(number)) return false
      selected = number
      return true
    },
    clearSelection: () => {
      selected = null
    },
    runPoint: (reason) => {
      if (reason !== 'opponent_error' && reason !== 'ace' && selected === null) return 'Falta la jugadora'
      log.push(`point:${reason}:${selected}`)
      finish()
      return null
    },
    runError: (error) => {
      log.push(`error:${error}:${selected}`)
      finish()
      return null
    },
    runSkill: (skill) => {
      if (selected === null) return 'Falta la jugadora'
      log.push(`skill:${skill}:${selected}`)
      finish()
      return null
    },
    runPending: () => (log.push('pending'), null),
    runRotationFault: () => (log.push('fault'), null),
    runTimeout: () => (log.push('timeout'), null),
  }
  const keyboard = useScoutKeyboard(() => column)
  const type = (keys: string) => keys.split('').forEach((key) => keyboard.handleKey({ key } as KeyboardEvent))
  return { keyboard, type, log, selected: () => selected, setSelected: (n: string | null) => (selected = n) }
}

describe('código de teclado [equipo][dorsal][acción]', () => {
  it('L12A = ataque del 12; L1A espera por ser prefijo de 12 y se resuelve con la acción', () => {
    const { type, log } = setup()
    type('l12a')
    type('l1a')
    expect(log).toEqual(['point:attack:12', 'point:attack:1'])
  })

  it('un dígito sin ambigüedad se selecciona al instante', () => {
    const { type, keyboard } = setup()
    type('l5')
    expect(keyboard.hud.player).toBe('5')
    expect(keyboard.hud.digits).toBe('')
  })

  it('acciones: bloqueo, error (E + letra), defensa, recepción, pendiente, sin dorsal', () => {
    const { type, log } = setup()
    type('l5b')
    type('l7es')
    type('l10d')
    type('l9+')
    type('lx')
    type('lp')
    type('lf')
    type('lo')
    expect(log).toEqual([
      'point:block:5',
      'error:serve_error:7',
      'skill:dig:10',
      'skill:positive_reception:9',
      'point:opponent_error:null',
      'pending',
      'fault',
      'timeout',
    ])
  })

  it('un dorsal fuera de cancha no ejecuta nada ni reutiliza una selección anterior', () => {
    const { type, log, setSelected } = setup()
    setSelected('5')
    type('l3a')
    expect(log).toEqual([])
  })

  it('Esc cancela y limpia la selección', () => {
    const { type, keyboard, selected } = setup()
    type('l5')
    keyboard.handleKey({ key: 'Escape' } as KeyboardEvent)
    expect(keyboard.hud.team).toBeNull()
    expect(selected()).toBeNull()
  })

  it('sin equipo armado no consume teclas (los atajos clásicos siguen); armado las consume todas', () => {
    const { keyboard, type } = setup()
    expect(keyboard.handleKey({ key: 'q' } as KeyboardEvent)).toBe(false)
    type('l')
    expect(keyboard.handleKey({ key: 'q' } as KeyboardEvent)).toBe(true)
  })

  it('una acción inválida muestra el motivo y deja el equipo armado', () => {
    const { type, keyboard, log } = setup()
    type('la') // ataque sin dorsal
    expect(log).toEqual([])
    expect(keyboard.hud.message).toContain('Falta la jugadora')
    expect(keyboard.hud.team).toBe('local')
  })
})
