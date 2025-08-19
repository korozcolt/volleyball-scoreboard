import { computed, type ComputedRef } from 'vue'
import { useScoreboardStore } from '@stores/scoreboard'
import type { GameState, GameStatus, Team, UseGameStateReturn } from '@types/game.types'

/**
 * Composable principal para manejar el estado del juego
 * Proporciona una interfaz limpia para interactuar con el store
 */
export function useGameState(): UseGameStateReturn {
  const store = useScoreboardStore()

  // Acciones del juego
  const scorePoint = (team: 'local' | 'visitor') => {
    store.scorePoint(team)
  }

  const removePoint = (team: 'local' | 'visitor') => {
    store.removePoint(team)
  }

  const rotateTeam = (team: 'local' | 'visitor') => {
    store.rotateTeam(team)
  }

  const nextSet = () => {
    store.nextSet()
  }

  const resetGame = () => {
    store.resetGame()
  }

  const updateTeamName = (team: 'local' | 'visitor', name: string) => {
    store.updateTeamName(team, name)
  }

  const updateTeamLogo = (team: 'local' | 'visitor', logo: string) => {
    store.updateTeamLogo(team, logo)
  }

  const updateTeamColor = (team: 'local' | 'visitor', color: string) => {
    store.updateTeamColor(team, color)
  }

  const toggleServe = () => {
    store.toggleServe()
  }

  // Getters computados para facilitar el acceso
  const gameState = computed(() => store.gameState)
  const isGameFinished = computed(() => store.isGameFinished)
  const currentSet = computed(() => store.currentSet)
  const gameStatus = computed(() => store.gameStatus)
  const winnerTeam = computed(() => store.winnerTeam)
  const gameProgress = computed(() => store.gameProgress)
  const currentTeamServing = computed(() => store.currentTeamServing)

  // Getters específicos para equipos
  const localTeam = computed(() => store.gameState.local)
  const visitorTeam = computed(() => store.gameState.visitor)

  // Estadísticas del juego
  const gameStats = computed(() => {
    const state = store.gameState
    const totalPoints = state.local.score + state.visitor.score
    const duration = new Date().getTime() - state.startTime.getTime()

    return {
      totalPoints,
      duration,
      setsPlayed: state.currentSet,
      averagePointsPerSet: totalPoints / state.currentSet,
      gameTimeFormatted: formatGameDuration(duration),
      longestSet: Math.max(state.local.score, state.visitor.score),
    }
  })

  // Estado del set actual
  const currentSetInfo = computed(() => {
    const state = store.gameState
    const targetPoints = state.currentSet === 5 ? state.settings.decidingSetPoints : state.settings.pointsToWin

    return {
      number: state.currentSet,
      targetPoints,
      isDecidingSet: state.currentSet === 5,
      localProgress: (state.local.score / targetPoints) * 100,
      visitorProgress: (state.visitor.score / targetPoints) * 100,
      isSetPoint: checkIfSetPoint(state.local.score, state.visitor.score, targetPoints),
      isMatchPoint: checkIfMatchPoint(state),
    }
  })

  // Información de saque
  const serveInfo = computed(() => {
    const state = store.gameState
    const servingTeam = state.local.serving ? state.local : state.visitor

    return {
      team: state.local.serving ? 'local' : 'visitor',
      teamName: servingTeam.name,
      player: servingTeam.currentPlayer,
      playerName: servingTeam.players?.[servingTeam.currentPlayer - 1]?.name || `#${servingTeam.currentPlayer}`,
    }
  })

  // Historial filtrado
  const recentHistory = computed(() => {
    return store.gameState.history.slice(0, 10)
  })

  const currentSetHistory = computed(() => {
    return store.gameState.history.filter(event => event.set === store.gameState.currentSet)
  })

  // Funciones de utilidad
  const formatGameDuration = (duration: number): string => {
    const hours = Math.floor(duration / 3600000)
    const minutes = Math.floor((duration % 3600000) / 60000)
    const seconds = Math.floor((duration % 60000) / 1000)

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const checkIfSetPoint = (score1: number, score2: number, targetPoints: number): boolean => {
    const maxScore = Math.max(score1, score2)
    const minScore = Math.min(score1, score2)
    return maxScore >= targetPoints - 1 && maxScore - minScore >= 1
  }

  const checkIfMatchPoint = (state: GameState): boolean => {
    const setsToWin = Math.ceil(state.settings.maxSets / 2)
    const targetPoints = state.currentSet === 5 ? state.settings.decidingSetPoints : state.settings.pointsToWin

    return (
      (state.local.sets === setsToWin - 1 && checkIfSetPoint(state.local.score, state.visitor.score, targetPoints)) ||
      (state.visitor.sets === setsToWin - 1 && checkIfSetPoint(state.visitor.score, state.local.score, targetPoints))
    )
  }

  // Funciones de validación
  const canScorePoint = (team: 'local' | 'visitor'): boolean => {
    return !store.isGameFinished && store.gameState[team].score < 99
  }

  const canRemovePoint = (team: 'local' | 'visitor'): boolean => {
    return store.gameState[team].score > 0
  }

  const canRotate = (team: 'local' | 'visitor'): boolean => {
    return store.gameState.settings.enableRotation && !store.isGameFinished
  }

  const canStartNextSet = (): boolean => {
    return store.currentSet < store.gameState.settings.maxSets && !store.isGameFinished
  }

  // Funciones de análisis
  const getTeamMomentum = (team: 'local' | 'visitor'): 'positive' | 'negative' | 'neutral' => {
    const recentEvents = store.gameState.history
      .slice(0, 5)
      .filter(event => event.type === team || event.type === 'local' || event.type === 'visitor')

    if (recentEvents.length < 3) return 'neutral'

    const teamEvents = recentEvents.filter(event => event.type === team).length
    const totalEvents = recentEvents.length

    if (teamEvents / totalEvents > 0.6) return 'positive'
    if (teamEvents / totalEvents < 0.4) return 'negative'
    return 'neutral'
  }

  const getSetMVP = (): { team: 'local' | 'visitor'; points: number } | null => {
    const currentSetEvents = currentSetHistory.value
    const localPoints = currentSetEvents.filter(event => event.type === 'local').length
    const visitorPoints = currentSetEvents.filter(event => event.type === 'visitor').length

    if (localPoints === visitorPoints) return null

    return localPoints > visitorPoints
      ? { team: 'local', points: localPoints }
      : { team: 'visitor', points: visitorPoints }
  }

  return {
    // Estado principal
    gameState,

    // Estados computados
    isGameFinished,
    currentSet,
    gameStatus,
    winnerTeam,
    gameProgress,
    currentTeamServing,

    // Equipos
    localTeam,
    visitorTeam,

    // Información detallada
    gameStats,
    currentSetInfo,
    serveInfo,
    recentHistory,
    currentSetHistory,

    // Acciones principales
    scorePoint,
    removePoint,
    rotateTeam,
    nextSet,
    resetGame,
    updateTeamName,
    updateTeamLogo,
    updateTeamColor,
    toggleServe,

    // Validaciones
    canScorePoint,
    canRemovePoint,
    canRotate,
    canStartNextSet,

    // Análisis
    getTeamMomentum,
    getSetMVP,

    // Acceso directo al store
    store,
  }
}

// Hook especializado para el controlador
export function useControllerState() {
  const gameState = useGameState()

  // Funciones específicas del controlador
  const quickScoreLocal = () => gameState.scorePoint('local')
  const quickScoreVisitor = () => gameState.scorePoint('visitor')
  const quickRemoveLocal = () => gameState.removePoint('local')
  const quickRemoveVisitor = () => gameState.removePoint('visitor')
  const quickRotateLocal = () => gameState.rotateTeam('local')
  const quickRotateVisitor = () => gameState.rotateTeam('visitor')

  return {
    ...gameState,
    // Atajos rápidos
    quickScoreLocal,
    quickScoreVisitor,
    quickRemoveLocal,
    quickRemoveVisitor,
    quickRotateLocal,
    quickRotateVisitor,
  }
}

// Hook especializado para el overlay
export function useOverlayState() {
  const gameState = useGameState()

  // Solo las propiedades de lectura para el overlay
  return {
    gameState: gameState.gameState,
    localTeam: gameState.localTeam,
    visitorTeam: gameState.visitorTeam,
    currentSet: gameState.currentSet,
    isGameFinished: gameState.isGameFinished,
    gameStatus: gameState.gameStatus,
    winnerTeam: gameState.winnerTeam,
    currentSetInfo: gameState.currentSetInfo,
    serveInfo: gameState.serveInfo,
    gameStats: gameState.gameStats,
    gameProgress: gameState.gameProgress,
  }
}
