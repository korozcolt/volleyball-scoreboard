import { onMounted, onUnmounted } from 'vue'
import type { ScoringReason, StatErrorType, StatSkillType, TeamSide } from '@/types/game.types'
import { useMatchStore } from '@/stores/match'
import { useOverlayControlStore } from '@/stores/overlayControl'
import { useStatisticsStore } from '@/stores/statistics'
import { KEYBOARD_SHORTCUTS } from '@/utils/constants'

/**
 * Acciones de partido compartidas por el panel de control y el Modo Partido.
 * Toda acción que cambia el partido guarda antes una instantánea para poder deshacerla.
 */
export const useMatchActions = () => {
  const match = useMatchStore()
  const statistics = useStatisticsStore()

  const withUndo = <A extends unknown[]>(label: string, action: (...args: A) => unknown) => {
    return (...args: A) => {
      statistics.pushUndo(label)
      action(...args)
    }
  }

  return {
    // Punto sin clasificar: se anota ya y se puede clasificar después.
    scorePoint: (team: TeamSide) => statistics.scorePointWithReason(team, 'manual'),
    scorePointWithReason: (team: TeamSide, reason: ScoringReason, playerNumber?: string | number) =>
      statistics.scorePointWithReason(team, reason, playerNumber),
    recordError: (team: TeamSide, errorType: StatErrorType, playerNumber?: string | number) =>
      statistics.recordErrorAndPoint(team, errorType, playerNumber),
    recordSkill: (team: TeamSide, skill: StatSkillType, playerNumber?: string | number) =>
      statistics.recordSkill(team, skill, playerNumber),
    setManualScore: withUndo('Marcador manual', (team: TeamSide, score: number) =>
      match.setManualScore(team, score),
    ),
    setManualSets: withUndo('Sets manual', (team: TeamSide, sets: number) => match.setManualSets(team, sets)),
    requestTimeout: withUndo('Tiempo', (team: TeamSide) => match.startTimeout(team)),
    rotateManually: withUndo('Rotación manual', (team: TeamSide) => match.rotateTeam(team)),
    substitute: withUndo(
      'Sustitución',
      (team: TeamSide, playerOut: string | number, playerIn: string | number) =>
        match.substitutePlayer(team, playerOut, playerIn),
    ),
    toggleServe: withUndo('Cambio de saque', () => match.toggleServe()),
    nextSet: withUndo('Siguiente set', () => match.nextSet()),
  }
}

const isTypingTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable)

/**
 * Atajos de teclado del operador. Ignora teclas repetidas, Alt y campos de texto; con Cmd/Ctrl solo actúa
 * en Deshacer (Z) y, opcionalmente, reiniciar partido — cualquier otra combinación es del navegador.
 */
export const useMatchShortcuts = (
  options: {
    onResetGame?: () => void
    // Intercepta la tecla antes que los atajos de una letra; devuelve true si la consumió.
    intercept?: (event: KeyboardEvent) => boolean
  } = {},
) => {
  const statistics = useStatisticsStore()
  const overlay = useOverlayControlStore()
  const { scorePoint, toggleServe, nextSet } = useMatchActions()

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.repeat || isTypingTarget(event.target) || event.altKey) return

    if (event.ctrlKey || event.metaKey) {
      if (event.code === 'KeyZ' && !event.shiftKey) {
        event.preventDefault()
        statistics.undoLast()
      } else if (event.ctrlKey && event.code === KEYBOARD_SHORTCUTS.RESET_GAME && options.onResetGame) {
        event.preventDefault()
        options.onResetGame()
      }
      return
    }

    if (options.intercept?.(event)) {
      event.preventDefault()
      return
    }

    const handlers: Partial<Record<string, () => void>> = {
      [KEYBOARD_SHORTCUTS.SCORE_LOCAL]: () => scorePoint('local'),
      [KEYBOARD_SHORTCUTS.SCORE_VISITOR]: () => scorePoint('visitor'),
      [KEYBOARD_SHORTCUTS.REMOVE_LOCAL]: () => statistics.removePointWithRevert('local'),
      [KEYBOARD_SHORTCUTS.REMOVE_VISITOR]: () => statistics.removePointWithRevert('visitor'),
      [KEYBOARD_SHORTCUTS.TOGGLE_SERVE]: () => toggleServe(),
      [KEYBOARD_SHORTCUTS.NEXT_SET]: () => nextSet(),
      [KEYBOARD_SHORTCUTS.SHOW_HISTORY]: () =>
        overlay.setActiveOverlay(overlay.state.activeOverlay === 'history' ? 'scoreboard' : 'history'),
    }

    const handler = handlers[event.code]
    if (handler) {
      event.preventDefault()
      handler()
    }
  }

  onMounted(() => document.addEventListener('keydown', handleKeydown))
  onUnmounted(() => document.removeEventListener('keydown', handleKeydown))
}

