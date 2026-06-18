import { COMMUNICATION_CONFIG, DEFAULT_BROADCAST_CONFIG, DEFAULT_GAME_SETTINGS, DEFAULT_MESSAGES, STORAGE_KEYS, SYNC_CHANNELS } from '@/utils/constants'
import type { BroadcastConfig, CompletedSet, GameHistory, GameState, HistoryType, Team, TeamSide } from '@/types/game.types'
import { computed, ref, watch } from 'vue'
import { createScopedLocalSyncAdapter, type SyncAdapter } from '@/services/syncService'
import { defineStore } from 'pinia'
import { libraryApi } from '@/services/libraryApi'
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
  roster: [1, 2, 3, 4, 5, 6].map((number) => ({
    id: `${id}-${number}`,
    number,
    name: `Jugador ${number}`,
    position: number,
    active: true,
  })),
  rotationState: {
    positions: [1, 2, 3, 4, 5, 6],
    currentPlayerNumber: 1,
    history: [],
  },
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
  const activeMatchId = ref<string | null>(null)
  let matchSync: SyncAdapter<GameState> = createScopedLocalSyncAdapter<GameState>(
    SYNC_CHANNELS.MATCH,
    STORAGE_KEYS.MATCH_STATE,
  )
  let unsubscribeSync: (() => void) | undefined
  let persistTimer: number | undefined
  let isApplyingRemoteState = false

  const hydrate = () => {
    const stored = matchSync.read()
    gameState.value = stored ? cloneState(stored) : createInitialState(broadcastConfig.config)
    syncTeamsFromConfig()
    isLoaded.value = true
  }

  const publish = () => {
    if (isLoaded.value && !isApplyingRemoteState) {
      matchSync.publish(cloneState(gameState.value))
      persistSessionState()
    }
  }

  const flushSessionState = (force = false) => {
    if (!activeMatchId.value) return
    if (!persistTimer && !force) return
    if (persistTimer) {
      window.clearTimeout(persistTimer)
      persistTimer = undefined
    }
    
    libraryApi.updateMatchSession(activeMatchId.value, {
      state: cloneState(gameState.value),
      status: gameState.value.gameFinished ? 'finished' : (gameState.value.status === 'live' ? 'live' : 'draft'),
    }).catch(() => undefined)
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => flushSessionState(true))
  }

  const persistSessionState = () => {
    if (!activeMatchId.value || typeof window === 'undefined') return
    if (persistTimer) window.clearTimeout(persistTimer)
    persistTimer = window.setTimeout(flushSessionState, 450)
  }

  const subscribe = () => {
    unsubscribeSync?.()
    unsubscribeSync = matchSync.subscribe((payload) => {
      if (!isLoaded.value) return
      isApplyingRemoteState = true
      gameState.value = cloneState(payload)
      setTimeout(() => {
        isApplyingRemoteState = false
      }, 0)
    })
  }

  const setMatchScope = (matchId?: string, initialState?: GameState, initialConfig = broadcastConfig.config) => {
    const nextScope = matchId ?? null
    if (activeMatchId.value === nextScope && isLoaded.value) return

    activeMatchId.value = nextScope
    matchSync = createScopedLocalSyncAdapter<GameState>(
      SYNC_CHANNELS.MATCH,
      STORAGE_KEYS.MATCH_STATE,
      matchId,
    )

    const stored = matchSync.read()
    gameState.value = cloneState(initialState ?? stored ?? createInitialState(initialConfig))
    isLoaded.value = true
    subscribe()
    if (!stored && initialState) publish()
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

  const hasMatchProgress = () => {
    return (
      gameState.value.status !== 'idle' ||
      gameState.value.local.score > 0 ||
      gameState.value.visitor.score > 0 ||
      gameState.value.local.sets > 0 ||
      gameState.value.visitor.sets > 0 ||
      gameState.value.completedSets.length > 0
    )
  }

  function syncTeamsFromConfig(force = false) {
    if (!force && hasMatchProgress()) return false

    ;(['local', 'visitor'] as TeamSide[]).forEach((team) => {
      const configTeam = broadcastConfig.config.teams[team]
      gameState.value[team].name = configTeam.name
      gameState.value[team].shortCode = configTeam.shortCode
      gameState.value[team].primaryColor = configTeam.primaryColor
      gameState.value[team].color = configTeam.primaryColor
      gameState.value[team].logoUrl = configTeam.logoUrl
      gameState.value[team].logo = configTeam.logoUrl
      if (configTeam.roster) {
        setTeamRoster(team, configTeam.roster.map((p, idx) => ({
          id: p.id || `p-${Date.now()}-${idx}`,
          number: p.number,
          name: p.name || `Jugador ${p.number}`,
          position: 0,
          active: p.active !== false,
          isLibero: p.isLibero,
          role: p.role,
        })))
      }
    })

    gameState.value.metadata.court = broadcastConfig.config.court
    gameState.value.metadata.tournament = broadcastConfig.config.tournament
    gameState.value.metadata.phase = broadcastConfig.config.phase
    gameState.value.leagueLogo = broadcastConfig.config.leagueLogoUrl
    return true
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
    const regainedServe = !gameState.value[team].serving
    if (regainedServe && gameState.value.settings.enableRotation) {
      rotateTeam(team, 'regained_serve')
    }
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

  const rotationFault = (offendingTeam: TeamSide) => {
    if (gameState.value.gameFinished) return
    
    const opponent = getOpponent(offendingTeam)
    
    // Add point to the opposing team.
    // scorePoint already handles giving them the serve and rotating if necessary.
    scorePoint(opponent)
    
    // Add a specific history message for the fault
    addToHistory(
      `Falta de rotación: ${gameState.value[offendingTeam].name}. Punto para ${gameState.value[opponent].shortCode}.`,
      'warning'
    )
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
    publish()
    flushSessionState(true)
  }

  const resetGame = () => {
    Object.assign(gameState.value, createInitialState(broadcastConfig.config))
    syncTeamsFromConfig(true)
    addToHistory(DEFAULT_MESSAGES.GAME_RESET, 'warning')
    publish()
    flushSessionState(true)
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

  const rotateTeam = (team: TeamSide, reason: 'regained_serve' | 'manual' = 'manual') => {
    const next = gameState.value[team].rotation.shift()
    if (next) gameState.value[team].rotation.push(next)
    gameState.value[team].currentPlayer = gameState.value[team].rotation[0] ?? 1
    gameState.value[team].rotationState = {
      positions: [...gameState.value[team].rotation],
      currentPlayerNumber: gameState.value[team].currentPlayer,
      history: [
        {
          team,
          timestamp: Date.now(),
          reason,
          rotation: [...gameState.value[team].rotation],
        },
        ...(gameState.value[team].rotationState?.history ?? []),
      ].slice(0, 30),
    }
    if (reason === 'manual') {
      addToHistory(`Rotación manual de ${gameState.value[team].shortCode}`, 'info')
    }
  }

  function setTeamRoster(team: TeamSide, players: Team['roster'] = []) {
    const activePlayers = players.filter((player) => player.active !== false)
    const fallback = [1, 2, 3, 4, 5, 6].map((number) => ({
      id: `${team}-${number}`,
      number: String(number),
      name: `Jugador ${number}`,
      position: number,
      active: true,
    }))
    
    // We keep ALL active players in the roster.
    const roster = (activePlayers.length > 0 ? activePlayers : fallback).map((player, index) => ({
      ...player,
      position: index + 1,
    }))

    const initialStarters = roster.slice(0, 6)
    const rotation = initialStarters.map((player) => player.number)

    gameState.value[team].roster = roster
    gameState.value[team].players = initialStarters.map((player) => ({
      id: Number(player.id) || 0,
      number: player.number,
      name: player.name,
      position: player.position,
      active: player.active,
    }))
    gameState.value[team].rotation = rotation
    gameState.value[team].currentPlayer = rotation[0] ?? 1
    gameState.value[team].rotationState = {
      positions: rotation,
      currentPlayerNumber: gameState.value[team].currentPlayer,
      history: gameState.value[team].rotationState?.history ?? [],
    }
  }

  /**
   * Assigns players to specific court positions by jersey number.
   * @param jerseyByPosition Array of 6 jersey numbers indexed by position [pos1, pos2, pos3, pos4, pos5, pos6]
   * Position 1 = server (back right), Position 2 = front right, 3 = front center,
   * 4 = front left, 5 = back left, 6 = back center
   */
  const setCourtPositions = (team: TeamSide, jerseyByPosition: (string | number)[]) => {
    const slots = jerseyByPosition.slice(0, 6)
    while (slots.length < 6) slots.push(String(slots.length + 1))
    gameState.value[team].rotation = slots
    gameState.value[team].currentPlayer = slots[0] ?? '1'
    gameState.value[team].rotationState = {
      positions: [...slots],
      currentPlayerNumber: slots[0] ?? '1',
      history: [
        {
          team,
          timestamp: Date.now(),
          reason: 'manual' as const,
          rotation: [...slots],
        },
        ...(gameState.value[team].rotationState?.history ?? []),
      ].slice(0, 30),
    }
    addToHistory(`Formación de ${gameState.value[team].shortCode} actualizada`, 'info')
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
  const canSyncTeamsFromConfig = computed(() => !hasMatchProgress())
  const targetPoints = computed(() => getSetTargetPoints(gameState.value))

  watch(gameState, publish, { deep: true })
  watch(() => broadcastConfig.config, () => syncTeamsFromConfig(), { deep: true })
  if (typeof window !== 'undefined') window.setInterval(expireTimeouts, 500)

  hydrate()
  subscribe()

  return {
    gameState,
    isLoaded,
    activeMatchId,
    currentTeamServing,
    currentSet,
    isGameFinished,
    winnerTeam,
    gameStatus,
    isSetPoint,
    setPointTeam,
    matchPointTeam,
    canAdvanceSet,
    canSyncTeamsFromConfig,
    targetPoints,
    hydrate,
    setMatchScope,
    startMatch,
    scorePoint,
    rotationFault,
    removePoint,
    setManualScore,
    setManualSets,
    nextSet,
    resetSet,
    resetGame,
    toggleServe,
    setServingTeam,
    rotateTeam,
    setTeamRoster,
    setCourtPositions,
    startTimeout,
    updateGameSettings,
    addToHistory,
    getGameState,
    restoreGameState,
    syncTeamsFromConfig,
    unsubscribe: () => unsubscribeSync?.(),
  }
})
