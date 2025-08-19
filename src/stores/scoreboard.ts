import {
  DEFAULT_GAME_SETTINGS,
  DEFAULT_MESSAGES,
  VOLLEYBALL_CONSTANTS,
} from '@utils/constants'
import type {
  GameHistory,
  GameState,
  GameStatus,
  HistoryType,
  ScoreboardEvent,
  Team,
} from '@types/game.types'
import { checkSetWin, generateId, validateScore } from '@utils/validators'
import { computed, ref } from 'vue'

import { defineStore } from 'pinia'

export const useScoreboardStore = defineStore('scoreboard', () => {
  // Estado principal del juego
  const gameState = ref<GameState>({
    local: {
      id: 'local',
      name: 'EQUIPO LOCAL',
      logo: '🔵',
      score: 0,
      sets: 0,
      serving: true,
      currentPlayer: 1,
      rotation: [1, 2, 3, 4, 5, 6],
      color: '#2563eb',
    },
    visitor: {
      id: 'visitor',
      name: 'EQUIPO VISITANTE',
      logo: '🔴',
      score: 0,
      sets: 0,
      serving: false,
      currentPlayer: 1,
      rotation: [1, 2, 3, 4, 5, 6],
      color: '#dc2626',
    },
    currentSet: 1,
    history: [],
    gameFinished: false,
    startTime: new Date(),
    settings: { ...DEFAULT_GAME_SETTINGS },
  })

  // Estado de eventos para comunicación
  const events = ref<ScoreboardEvent[]>([])
  const lastEventId = ref<string>('')

  // Getters computados
  const currentTeamServing = computed(() => {
    return gameState.value.local.serving ? 'local' : 'visitor'
  })

  const gameStatus = computed((): GameStatus => {
    if (gameState.value.gameFinished) return 'finished'
    if (gameState.value.history.length === 0) return 'waiting'
    return 'playing'
  })

  const isGameFinished = computed(() => gameState.value.gameFinished)

  const currentSet = computed(() => gameState.value.currentSet)

  const winnerTeam = computed(() => {
    if (!gameState.value.gameFinished) return null
    return gameState.value.local.sets > gameState.value.visitor.sets
      ? gameState.value.local
      : gameState.value.visitor
  })

  const gameProgress = computed(() => {
    const maxSets = gameState.value.settings.maxSets
    const setsToWin = Math.ceil(maxSets / 2)
    const localProgress = (gameState.value.local.sets / setsToWin) * 100
    const visitorProgress = (gameState.value.visitor.sets / setsToWin) * 100

    return {
      local: Math.min(localProgress, 100),
      visitor: Math.min(visitorProgress, 100),
      setsToWin,
    }
  })

  // Funciones de utilidad
  const addToHistory = (message: string, type: HistoryType = 'info') => {
    const historyItem: GameHistory = {
      id: generateId(),
      message,
      type,
      timestamp: new Date(),
      set: gameState.value.currentSet,
      score: {
        local: gameState.value.local.score,
        visitor: gameState.value.visitor.score,
      },
    }

    gameState.value.history.unshift(historyItem)

    // Mantener solo los últimos 50 elementos
    if (gameState.value.history.length > 50) {
      gameState.value.history = gameState.value.history.slice(0, 50)
    }
  }

  const emitEvent = (type: ScoreboardEvent['type'], team?: 'local' | 'visitor', data?: any) => {
    const event: ScoreboardEvent = {
      type,
      team,
      data,
      timestamp: new Date(),
    }

    events.value.push(event)
    lastEventId.value = generateId()
  }

  const getOppositeTeam = (team: 'local' | 'visitor'): 'local' | 'visitor' => {
    return team === 'local' ? 'visitor' : 'local'
  }

  // Acciones principales
  const scorePoint = (team: 'local' | 'visitor') => {
    if (gameState.value.gameFinished) return

    const teamData = gameState.value[team]
    const oppositeTeam = getOppositeTeam(team)
    const oppositeData = gameState.value[oppositeTeam]

    // Validar puntuación
    if (!validateScore(teamData.score + 1)) return

    // Incrementar puntuación
    teamData.score++

    // Cambiar saque al equipo que anotó
    teamData.serving = true
    oppositeData.serving = false

    // Crear mensaje del historial
    const scoreMessage = `${teamData.score}-${oppositeData.score}`
    const message = DEFAULT_MESSAGES.POINT_SCORED(teamData.name, scoreMessage)
    addToHistory(message, team)

    // Emitir evento
    emitEvent('score_point', team, { score: teamData.score })

    // Verificar fin de set
    const currentSetPoints = gameState.value.currentSet === 5
      ? gameState.value.settings.decidingSetPoints
      : gameState.value.settings.pointsToWin

    if (checkSetWin(teamData.score, oppositeData.score, currentSetPoints, gameState.value.settings.minAdvantage)) {
      teamData.sets++

      const setMessage = DEFAULT_MESSAGES.SET_WIN(teamData.name, gameState.value.currentSet)
      addToHistory(setMessage, 'success')
      emitEvent('set_finished', team, { sets: teamData.sets })

      // Verificar fin de partido
      const setsToWin = Math.ceil(gameState.value.settings.maxSets / 2)
      if (teamData.sets >= setsToWin) {
        gameState.value.gameFinished = true
        const gameMessage = DEFAULT_MESSAGES.GAME_WIN(teamData.name)
        addToHistory(gameMessage, 'winner')
        emitEvent('game_finished', team, { winner: teamData.name })
      } else {
        // Próximo set automáticamente
        setTimeout(() => nextSet(), 2000)
      }
    }
  }

  const removePoint = (team: 'local' | 'visitor') => {
    const teamData = gameState.value[team]

    if (teamData.score > 0) {
      teamData.score--
      const message = DEFAULT_MESSAGES.POINT_REMOVED(teamData.name)
      addToHistory(message, 'warning')
      emitEvent('remove_point', team, { score: teamData.score })
    }
  }

  const rotateTeam = (team: 'local' | 'visitor') => {
    const teamData = gameState.value[team]

    // Rotación en sentido horario
    const firstPlayer = teamData.rotation.shift()
    if (firstPlayer) {
      teamData.rotation.push(firstPlayer)
      teamData.currentPlayer = teamData.rotation[0]
    }

    const message = DEFAULT_MESSAGES.ROTATION(teamData.name, teamData.currentPlayer)
    addToHistory(message, team)
    emitEvent('rotate_team', team, { currentPlayer: teamData.currentPlayer })
  }

  const nextSet = () => {
    if (gameState.value.currentSet < gameState.value.settings.maxSets && !gameState.value.gameFinished) {
      gameState.value.currentSet++
      gameState.value.local.score = 0
      gameState.value.visitor.score = 0

      // Alternar saque inicial del set
      gameState.value.local.serving = gameState.value.currentSet % 2 === 1
      gameState.value.visitor.serving = gameState.value.currentSet % 2 === 0

      const message = DEFAULT_MESSAGES.SET_START(gameState.value.currentSet)
      addToHistory(message, 'info')
      emitEvent('next_set', undefined, { set: gameState.value.currentSet })
    }
  }

  const resetGame = () => {
    const localName = gameState.value.local.name
    const visitorName = gameState.value.visitor.name
    const localLogo = gameState.value.local.logo
    const visitorLogo = gameState.value.visitor.logo
    const localColor = gameState.value.local.color
    const visitorColor = gameState.value.visitor.color

    gameState.value = {
      local: {
        id: 'local',
        name: localName,
        logo: localLogo,
        score: 0,
        sets: 0,
        serving: true,
        currentPlayer: 1,
        rotation: [1, 2, 3, 4, 5, 6],
        color: localColor,
      },
      visitor: {
        id: 'visitor',
        name: visitorName,
        logo: visitorLogo,
        score: 0,
        sets: 0,
        serving: false,
        currentPlayer: 1,
        rotation: [1, 2, 3, 4, 5, 6],
        color: visitorColor,
      },
      currentSet: 1,
      history: [],
      gameFinished: false,
      startTime: new Date(),
      settings: { ...gameState.value.settings },
    }

    addToHistory(DEFAULT_MESSAGES.GAME_RESET, 'info')
    emitEvent('reset_game')
  }

  const updateTeamName = (team: 'local' | 'visitor', name: string) => {
    if (name.trim()) {
      gameState.value[team].name = name.trim()
      addToHistory(DEFAULT_MESSAGES.TEAM_NAME_UPDATED, 'info')
      emitEvent('update_team_name', team, { name: name.trim() })
    }
  }

  const updateTeamLogo = (team: 'local' | 'visitor', logo: string) => {
    gameState.value[team].logo = logo
    addToHistory(DEFAULT_MESSAGES.LOGO_UPDATED, 'info')
    emitEvent('update_team_logo', team, { logo })
  }

  const updateTeamColor = (team: 'local' | 'visitor', color: string) => {
    gameState.value[team].color = color
    emitEvent('update_team_color', team, { color })
  }

  const toggleServe = () => {
    gameState.value.local.serving = !gameState.value.local.serving
    gameState.value.visitor.serving = !gameState.value.visitor.serving

    const servingTeam = gameState.value.local.serving ? gameState.value.local.name : gameState.value.visitor.name
    addToHistory(`🔄 Cambio de saque: ${servingTeam}`, 'info')
    emitEvent('toggle_serve')
  }

  const updateGameSettings = (newSettings: Partial<typeof gameState.value.settings>) => {
    gameState.value.settings = { ...gameState.value.settings, ...newSettings }
    addToHistory('⚙️ Configuración actualizada', 'info')
  }

  // Función para obtener el estado actual (para comunicación)
  const getGameState = () => {
    return JSON.parse(JSON.stringify(gameState.value)) as GameState
  }

  // Función para restaurar estado (para comunicación)
  const restoreGameState = (state: GameState) => {
    gameState.value = state
  }

  // Inicialización
  const initializeGame = () => {
    addToHistory(DEFAULT_MESSAGES.GAME_START, 'info')
    emitEvent('game_start')
  }

  return {
    // Estado
    gameState: readonly(gameState),
    events: readonly(events),
    lastEventId: readonly(lastEventId),

    // Getters
    currentTeamServing,
    gameStatus,
    isGameFinished,
    currentSet,
    winnerTeam,
    gameProgress,

    // Acciones principales
    scorePoint,
    removePoint,
    rotateTeam,
    nextSet,
    resetGame,
    toggleServe,

    // Configuración
    updateTeamName,
    updateTeamLogo,
    updateTeamColor,
    updateGameSettings,

    // Utilidades
    addToHistory,
    getGameState,
    restoreGameState,
    initializeGame,
  }
})

// Tipo para exportar el store
export type ScoreboardStore = ReturnType<typeof useScoreboardStore>
