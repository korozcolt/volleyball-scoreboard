import { COMMUNICATION_CONFIG, DEFAULT_BROADCAST_CONFIG, DEFAULT_GAME_SETTINGS, DEFAULT_MESSAGES, STORAGE_KEYS, SYNC_CHANNELS } from '@/utils/constants'
import type { BroadcastConfig, CompletedSet, GameHistory, GameState, HistoryType, Team, TeamSide } from '@/types/game.types'
import { computed, ref, watch } from 'vue'
import { createLocalSyncAdapter } from '@/services/syncService'
import { defineStore } from 'pinia'
import {
  canManuallyAdvanceSet,
  getCurrentSetWinner,
  getOpponent,
  getSetTargetPoints,
  getSetsToWinMatch,
  hasWonCurrentSet,
  isMatchPoint,
  isSetPoint as isSetPointForTeam,
} from '@/utils/volleyballRules'
import { useBroadcastConfigStore } from './broadcastConfig'
import { useOverlayControlStore } from './overlayControl'

const matchSync = createLocalSyncAdapter<GameState>(SYNC_CHANNELS.MATCH, STORAGE_KEYS.MATCH_STATE)

const cloneState = (state: GameState): GameState => JSON.parse(JSON.stringify(state))
const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`

const createTeam = (id: TeamSide, config: BroadcastConfig): Team => ({
  id,
  name: config.teams[id].name,
  shortCode: config.teams[id].shortCode,
  logoUrl: config.teams[id].logoUrl,
  logo: config.teams[id].logoUrl,
  score: 0,
  sets: 0,
  serving: id === 'local',
  currentPlayer: 1,
  rotation: [1, 2, 3, 4, 5, 6],
  primaryColor: config.teams[id].primaryColor,
  color: config.teams[id].primaryColor,
  timeoutsUsed: 0,
})

const createInitialState = (config = DEFAULT_BROADCAST_CONFIG): GameState => {
  const now = Date.now()

  return {
    local: createTeam('local', config),
    visitor: createTeam('visitor', config),
    currentSet: 1,
    completedSets: [],
    history: [],
    gameFinished: false,
    status: 'idle',
    startTime: now,
    currentSetStartedAt: now,
    settings: { ...DEFAULT_GAME_SETTINGS },
    metadata: {
      court: config.court,
      tournament: config.tournament,
      phase: config.phase,
    },
    leagueLogo: config.leagueLogoUrl,
  }
}

export const useMatchStore = defineStore('match', () => {
  const broadcastConfig = useBroadcastConfigStore()
  const overlayControl = useOverlayControlStore()

  const gameState = ref<GameState>(createInitialState(broadcastConfig.config))
  const isLoaded = ref(false)
  let isApplyingRemoteState = false

  const hydrate = () => {
    const stored = matchSync.read()
    gameState.value = stored ? cloneState(stored) : createInitialState(broadcastConfig.config)
    syncTeamsFromConfig()
    isLoaded.value = true
  }

  const publish = () => {
    if (isLoaded.value && !isApplyingRemoteState) matchSync.publish(cloneState(gameState.value))
  }

  const addToHistory = (message: string, type: HistoryType = 'info') => {
    const item: GameHistory = {
      id: createId(),
      message,
      type,
      timestamp: Date.now(),
      set: gameState.value.currentSet,
      score: {
        local: gameState.value.local.score,
        visitor: gameState.value.visitor.score,
      },
    }

    gameState.value.history.unshift(item)
    gameState.value.history = gameState.value.history.slice(0, COMMUNICATION_CONFIG.MAX_HISTORY_ITEMS)
  }

  const syncTeamsFromConfig = () => {
    ;(['local', 'visitor'] as TeamSide[]).forEach((team) => {
      const configTeam = broadcastConfig.config.teams[team]
      gameState.value[team].name = configTeam.name
      gameState.value[team].shortCode = configTeam.shortCode
      gameState.value[team].primaryColor = configTeam.primaryColor
      gameState.value[team].color = configTeam.primaryColor
      gameState.value[team].logoUrl = configTeam.logoUrl
      gameState.value[team].logo = configTeam.logoUrl
    })

    gameState.value.metadata.court = broadcastConfig.config.court
    gameState.value.metadata.tournament = broadcastConfig.config.tournament
    gameState.value.metadata.phase = broadcastConfig.config.phase
    gameState.value.leagueLogo = broadcastConfig.config.leagueLogoUrl
  }

  const startMatch = () => {
    if (gameState.value.status === 'idle') {
      gameState.value.status = 'live'
      gameState.value.startTime = Date.now()
      gameState.value.currentSetStartedAt = Date.now()
      addToHistory(DEFAULT_MESSAGES.GAME_START, 'success')
    }
  }

  const scorePoint = (team: TeamSide) => {
    if (gameState.value.gameFinished) return
    startMatch()

    const opponent = getOpponent(team)
    gameState.value[team].score += 1
    gameState.value[team].serving = true
    gameState.value[opponent].serving = false

    addToHistory(
      DEFAULT_MESSAGES.POINT_SCORED(
        gameState.value[team].name,
        `${gameState.value.local.score}-${gameState.value.visitor.score}`,
      ),
      team,
    )

    resolveSetIfWon()
  }

  const removePoint = (team: TeamSide) => {
    if (gameState.value[team].score <= 0 || gameState.value.gameFinished) return
    gameState.value[team].score -= 1
    addToHistory(DEFAULT_MESSAGES.POINT_REMOVED(gameState.value[team].name), 'warning')
  }

  const setManualScore = (team: TeamSide, score: number) => {
    if (gameState.value.gameFinished) return

    const nextScore = Math.max(0, Math.min(99, Number.isFinite(score) ? score : 0))
    const opponent = getOpponent(team)
    gameState.value[team].score = nextScore
    gameState.value[team].serving = true
    gameState.value[opponent].serving = false
    startMatch()
    addToHistory(`Marcador ajustado: ${gameState.value[team].shortCode} ${nextScore}`, 'info')
    resolveSetIfWon()
  }

  const setManualSets = (team: TeamSide, sets: number) => {
    if (gameState.value.gameFinished) return

    gameState.value[team].sets = Math.max(0, Math.min(3, Number.isFinite(sets) ? sets : 0))
    addToHistory(`Sets ajustados: ${gameState.value[team].shortCode} ${gameState.value[team].sets}`, 'info')

    if (gameState.value[team].sets >= getSetsToWinMatch(gameState.value)) {
      gameState.value.gameFinished = true
      gameState.value.status = 'finished'
      addToHistory(DEFAULT_MESSAGES.GAME_WIN(gameState.value[team].name), 'winner')
    }
  }

  const hasSetWinner = (team: TeamSide) => {
    return hasWonCurrentSet(gameState.value, team)
  }

  const resolveSetIfWon = () => {
    const winner = getCurrentSetWinner(gameState.value)
    if (winner) finishSet(winner)
  }

  const finishSet = (winner: TeamSide) => {
    if (gameState.value.gameFinished) return
    if (!hasSetWinner(winner)) return

    const completedSet: CompletedSet = {
      setNumber: gameState.value.currentSet,
      local: gameState.value.local.score,
      visitor: gameState.value.visitor.score,
      winner,
      finishedAt: Date.now(),
    }

    gameState.value.completedSets.push(completedSet)
    gameState.value[winner].sets += 1
    addToHistory(DEFAULT_MESSAGES.SET_WIN(gameState.value[winner].name, gameState.value.currentSet), 'success')

    const setsToWin = getSetsToWinMatch(gameState.value)
    if (gameState.value[winner].sets >= setsToWin) {
      gameState.value.gameFinished = true
      gameState.value.status = 'finished'
      addToHistory(DEFAULT_MESSAGES.GAME_WIN(gameState.value[winner].name), 'winner')
      return
    }

    advanceToNextSet()
  }

  const advanceToNextSet = () => {
    if (gameState.value.gameFinished || gameState.value.currentSet >= gameState.value.settings.maxSets) return

    gameState.value.currentSet += 1
    gameState.value.local.score = 0
    gameState.value.visitor.score = 0
    gameState.value.local.timeoutsUsed = 0
    gameState.value.visitor.timeoutsUsed = 0
    gameState.value.local.timeoutActiveUntil = undefined
    gameState.value.visitor.timeoutActiveUntil = undefined
    gameState.value.local.serving = gameState.value.currentSet % 2 === 1
    gameState.value.visitor.serving = !gameState.value.local.serving
    gameState.value.currentSetStartedAt = Date.now()
    addToHistory(DEFAULT_MESSAGES.SET_START(gameState.value.currentSet), 'info')
  }

  const nextSet = () => {
    if (gameState.value.gameFinished) return

    const pendingWinner = getCurrentSetWinner(gameState.value)
    if (!pendingWinner) {
      addToHistory('El set solo puede avanzar cuando un equipo cumple la regla de puntos y ventaja.', 'warning')
      return
    }

    finishSet(pendingWinner)
  }

  const resetSet = () => {
    if (gameState.value.gameFinished) return

    gameState.value.local.score = 0
    gameState.value.visitor.score = 0
    gameState.value.local.timeoutsUsed = 0
    gameState.value.visitor.timeoutsUsed = 0
    gameState.value.local.timeoutActiveUntil = undefined
    gameState.value.visitor.timeoutActiveUntil = undefined
    gameState.value.currentSetStartedAt = Date.now()
    addToHistory(DEFAULT_MESSAGES.SET_RESET, 'warning')
  }

  const resetGame = () => {
    gameState.value = createInitialState(broadcastConfig.config)
    addToHistory(DEFAULT_MESSAGES.GAME_RESET, 'warning')
  }

  const toggleServe = () => {
    gameState.value.local.serving = !gameState.value.local.serving
    gameState.value.visitor.serving = !gameState.value.visitor.serving
    const servingTeam = gameState.value.local.serving ? gameState.value.local.name : gameState.value.visitor.name
    addToHistory(`Saque para ${servingTeam}`, 'info')
  }

  const setServingTeam = (team: TeamSide) => {
    gameState.value.local.serving = team === 'local'
    gameState.value.visitor.serving = team === 'visitor'
    addToHistory(`Saque para ${gameState.value[team].name}`, 'info')
  }

  const rotateTeam = (team: TeamSide) => {
    const next = gameState.value[team].rotation.shift()
    if (next) gameState.value[team].rotation.push(next)
    gameState.value[team].currentPlayer = gameState.value[team].rotation[0] ?? 1
  }

  const startTimeout = (team: TeamSide) => {
    if (gameState.value.gameFinished || gameState.value.status === 'idle') return
    if (gameState.value[team].timeoutsUsed >= gameState.value.settings.timeoutsPerSet) return
    if ((gameState.value[team].timeoutActiveUntil ?? 0) > Date.now()) return
    gameState.value[team].timeoutsUsed += 1
    gameState.value[team].timeoutActiveUntil =
      Date.now() + gameState.value.settings.timeoutSeconds * 1000
    overlayControl.showTimeout(team)
    addToHistory(DEFAULT_MESSAGES.TIMEOUT(gameState.value[team].name), 'warning')
  }

  const updateGameSettings = (settings: Partial<GameState['settings']>) => {
    gameState.value.settings = {
      ...gameState.value.settings,
      ...settings,
    }
  }

  const expireTimeouts = () => {
    const now = Date.now()
    ;(['local', 'visitor'] as TeamSide[]).forEach((team) => {
      if (gameState.value[team].timeoutActiveUntil && gameState.value[team].timeoutActiveUntil <= now) {
        gameState.value[team].timeoutActiveUntil = undefined
      }
    })
  }

  const getGameState = () => cloneState(gameState.value)
  const restoreGameState = (state: GameState) => {
    gameState.value = cloneState(state)
  }

  const currentTeamServing = computed<TeamSide>(() =>
    gameState.value.local.serving ? 'local' : 'visitor',
  )
  const currentSet = computed(() => gameState.value.currentSet)
  const isGameFinished = computed(() => gameState.value.gameFinished)
  const winnerTeam = computed(() => {
    if (!gameState.value.gameFinished) return null
    return gameState.value.local.sets > gameState.value.visitor.sets
      ? gameState.value.local
      : gameState.value.visitor
  })
  const gameStatus = computed(() => gameState.value.status)
  const isSetPoint = computed(() => {
    return isSetPointForTeam(gameState.value, 'local') || isSetPointForTeam(gameState.value, 'visitor')
  })
  const matchPointTeam = computed<TeamSide | null>(() => {
    if (isMatchPoint(gameState.value, 'local')) return 'local'
    if (isMatchPoint(gameState.value, 'visitor')) return 'visitor'
    return null
  })
  const setPointTeam = computed<TeamSide | null>(() => {
    if (isSetPointForTeam(gameState.value, 'local')) return 'local'
    if (isSetPointForTeam(gameState.value, 'visitor')) return 'visitor'
    return null
  })
  const canAdvanceSet = computed(() => canManuallyAdvanceSet(gameState.value))
  const targetPoints = computed(() => getSetTargetPoints(gameState.value))

  const unsubscribe = matchSync.subscribe((payload) => {
    if (!isLoaded.value) return
    isApplyingRemoteState = true
    gameState.value = cloneState(payload)
    setTimeout(() => {
      isApplyingRemoteState = false
    }, 0)
  })

  watch(gameState, publish, { deep: true })
  watch(() => broadcastConfig.config, syncTeamsFromConfig, { deep: true })
  if (typeof window !== 'undefined') window.setInterval(expireTimeouts, 500)

  hydrate()

  return {
    gameState,
    isLoaded,
    currentTeamServing,
    currentSet,
    isGameFinished,
    winnerTeam,
    gameStatus,
    isSetPoint,
    setPointTeam,
    matchPointTeam,
    canAdvanceSet,
    targetPoints,
    hydrate,
    startMatch,
    scorePoint,
    removePoint,
    setManualScore,
    setManualSets,
    nextSet,
    resetSet,
    resetGame,
    toggleServe,
    setServingTeam,
    rotateTeam,
    startTimeout,
    updateGameSettings,
    addToHistory,
    getGameState,
    restoreGameState,
    syncTeamsFromConfig,
    unsubscribe,
  }
})
