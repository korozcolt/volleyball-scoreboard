import { onUnmounted, reactive, ref } from 'vue'
import type { ScoringReason, StatErrorType, StatSkillType, TeamSide } from '@/types/game.types'

/** Lo que el teclado necesita de cada columna de equipo (expuesto por ScoutTeamColumn). */
export interface ScoutColumnApi {
  courtNumbers: () => string[]
  serverNumber: () => string | null
  selectedNumber: () => string | null
  select: (number: string | null) => boolean
  clearSelection: () => void
  runPoint: (reason: ScoringReason) => string | null
  runError: (error: StatErrorType) => string | null
  runSkill: (skill: StatSkillType) => string | null
  runPending: () => string | null
  runRotationFault: () => string | null
  runTimeout: () => string | null
}

/**
 * Código de teclado al estilo DataVolley, pensado para una sola persona con dos equipos:
 *
 *   [equipo] [dorsal] [acción]        L = local · V = visitante
 *
 *   L12 A   ataque del #12 local         E + A/S/R   error de ataque / saque / recepción
 *   V3 B    bloqueo del #3 visitante     D  defensa   T  bloqueo tocado   +  recep. positiva   −  recep. negativa
 *   L S     ace (sacadora esperada)      X  rival erró (sin jugadora)
 *   V P     +1 sin clasificar            F  falta de rotación   O  tiempo
 *
 * Con un solo dígito que identifica sin ambigüedad a una jugadora en cancha se selecciona al instante; si
 * hay dos posibles (p. ej. 1 y 12 en cancha) espera a la siguiente tecla. Esc cancela. Sin actividad por
 * unos segundos el código se descarta.
 */
export const useScoutKeyboard = (getColumn: (side: TeamSide) => ScoutColumnApi | undefined) => {
  const hud = reactive({
    team: null as TeamSide | null,
    digits: '',
    player: null as string | null,
    awaitingError: false,
    message: '',
    messageKind: 'info' as 'info' | 'error',
  })
  const showHelp = ref(false)

  let idleTimer: number | undefined
  let messageTimer: number | undefined

  const say = (text: string, kind: 'info' | 'error' = 'info') => {
    hud.message = text
    hud.messageKind = kind
    window.clearTimeout(messageTimer)
    messageTimer = window.setTimeout(() => (hud.message = ''), 3200)
  }

  const reset = (clearSelection = true) => {
    window.clearTimeout(idleTimer)
    if (clearSelection && hud.team) getColumn(hud.team)?.clearSelection()
    hud.team = null
    hud.digits = ''
    hud.player = null
    hud.awaitingError = false
  }

  const touch = () => {
    window.clearTimeout(idleTimer)
    idleTimer = window.setTimeout(() => reset(), 6000)
  }

  const arm = (team: TeamSide) => {
    if (hud.team && hud.team !== team) getColumn(hud.team)?.clearSelection()
    hud.team = team
    hud.digits = ''
    hud.player = getColumn(team)?.selectedNumber() ?? null
    hud.awaitingError = false
    touch()
  }

  // Convierte los dígitos pendientes en la jugadora seleccionada.
  const commitDigits = (): boolean => {
    if (!hud.team || hud.digits === '') return true
    const column = getColumn(hud.team)
    if (!column) return false
    const digits = hud.digits
    hud.digits = ''
    if (!column.select(digits)) {
      // Una selección anterior no debe sobrevivir a un dorsal erróneo: la acción siguiente se aplicaría a otra jugadora.
      column.clearSelection()
      hud.player = null
      say(`#${digits} no está en cancha.`, 'error')
      return false
    }
    hud.player = digits
    return true
  }

  const onDigit = (digit: string) => {
    if (!hud.team) return
    const column = getColumn(hud.team)
    if (!column) return
    const next = hud.digits + digit
    if (next.length > 2) return
    const court = column.courtNumbers()
    const exact = court.includes(next)
    const longer = court.some((n) => n.startsWith(next) && n.length > next.length)
    hud.digits = next
    if (exact && !longer) {
      commitDigits()
    } else if (!exact && !longer) {
      hud.digits = ''
      column.clearSelection()
      hud.player = null
      say(`#${next} no está en cancha.`, 'error')
    }
  }

  const finish = (blocked: string | null, okMessage: string) => {
    if (blocked) {
      say(blocked, 'error')
      return
    }
    say(okMessage)
    reset(false)
  }

  const run = (letter: string) => {
    if (!hud.team) return
    const column = getColumn(hud.team)
    if (!column) return
    const label = hud.team === 'local' ? 'Local' : 'Visitante'

    // Ace, error de saque y las acciones sin jugadora no necesitan dorsal.
    if (!commitDigits()) return

    if (hud.awaitingError) {
      hud.awaitingError = false
      const errors: Record<string, StatErrorType> = { a: 'attack_error', s: 'serve_error', r: 'reception_error' }
      const error = errors[letter]
      if (!error) {
        say('Después de E: A (ataque), S (saque) o R (recepción).', 'error')
        return
      }
      finish(column.runError(error), `${label}: error registrado.`)
      return
    }

    switch (letter) {
      case 'a':
        return finish(column.runPoint('attack'), `${label}: ataque.`)
      case 'b':
        return finish(column.runPoint('block'), `${label}: bloqueo.`)
      case 's':
        return finish(column.runPoint('ace'), `${label}: ace.`)
      case 'x':
        return finish(column.runPoint('opponent_error'), `${label}: el rival erró.`)
      case 'p':
        return finish(column.runPending(), `${label}: +1 sin clasificar.`)
      case 'f':
        return finish(column.runRotationFault(), `${label}: falta de rotación.`)
      case 'o':
        return finish(column.runTimeout(), `${label}: tiempo.`)
      case 'd':
        return finish(column.runSkill('dig'), `${label}: defensa.`)
      case 't':
        return finish(column.runSkill('block_touch'), `${label}: bloqueo tocado.`)
      case '+':
      case '=':
        return finish(column.runSkill('positive_reception'), `${label}: recepción +.`)
      case '-':
      case '_':
        return finish(column.runSkill('negative_reception'), `${label}: recepción −.`)
      case 'e':
        hud.awaitingError = true
        return
      default:
        say(`Tecla "${letter.toUpperCase()}" no es una acción. Pulsa ? para ver el código.`, 'error')
    }
  }

  /** Devuelve true si la tecla fue consumida por el código de teclado. */
  const handleKey = (event: KeyboardEvent): boolean => {
    const key = event.key
    const lower = key.length === 1 ? key.toLowerCase() : key

    if (key === '?') {
      showHelp.value = !showHelp.value
      return true
    }
    if (showHelp.value) {
      if (key === 'Escape') showHelp.value = false
      return true
    }

    if (!hud.team) {
      if (lower === 'l') arm('local')
      else if (lower === 'v') arm('visitor')
      else return false
      return true
    }

    // Con un equipo armado, el teclado es del código: se consume toda tecla para no disparar atajos.
    touch()
    if (key === 'Escape') {
      reset()
      return true
    }
    if (key === 'Backspace') {
      hud.digits = hud.digits.slice(0, -1)
      return true
    }
    if (key === 'Enter') {
      if (commitDigits()) reset(false)
      return true
    }
    if (/^[0-9]$/.test(key)) {
      onDigit(key)
      return true
    }
    if (!hud.awaitingError && (lower === 'l' || lower === 'v')) {
      arm(lower === 'l' ? 'local' : 'visitor')
      return true
    }
    run(lower)
    return true
  }

  onUnmounted(() => {
    window.clearTimeout(idleTimer)
    window.clearTimeout(messageTimer)
  })

  return { hud, showHelp, handleKey, reset }
}
