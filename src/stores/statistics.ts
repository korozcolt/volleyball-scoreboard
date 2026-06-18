import { COMMUNICATION_CONFIG, STORAGE_KEYS, SYNC_CHANNELS } from '@/utils/constants'
import type {
  ScoringReason,
  StatErrorType,
  StatSkillType,
  StatisticEvent,
  StatisticsState,
  TeamSide,
  TeamStatistics,
} from '@/types/game.types'
import { computed, ref, watch } from 'vue'
import { createScopedLocalSyncAdapter, type SyncAdapter } from '@/services/syncService'
import { defineStore } from 'pinia'
import { getOpponent } from '@/utils/volleyballRules'
import { libraryApi } from '@/services/libraryApi'
import { useMatchStore } from './match'

const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`
const cloneState = (state: StatisticsState): StatisticsState => JSON.parse(JSON.stringify(state))

const createTeamStats = (): TeamStatistics => ({
  points: 0,
  attackPoints: 0,
  blockPoints: 0,
  aces: 0,
  opponentErrors: 0,
  attackErrors: 0,
  serveErrors: 0,
  positiveReceptions: 0,
  negativeReceptions: 0,
  digs: 0,
  currentRun: 0,
  biggestRun: 0,
})

const createInitialState = (): StatisticsState => ({
  local: createTeamStats(),
  visitor: createTeamStats(),
  events: [],
})

const scoringLabels: Record<ScoringReason, string> = {
  manual: 'Punto manual',
  attack: 'Ataque',
  block: 'Bloqueo',
  ace: 'Ace',
  opponent_error: 'Punto por error',
}

export const useStatisticsStore = defineStore('statistics', () => {
  const match = useMatchStore()
  const state = ref<StatisticsState>(createInitialState())
  const isLoaded = ref(false)
  const activeMatchId = ref<string | null>(null)
  let sync: SyncAdapter<StatisticsState> = createScopedLocalSyncAdapter<StatisticsState>(
    SYNC_CHANNELS.STATISTICS,
    STORAGE_KEYS.STATISTICS,
  )
  let unsubscribeSync: (() => void) | undefined
  let persistTimer: number | undefined
  let isApplyingRemoteState = false

  const hydrate = () => {
    state.value = {
      ...createInitialState(),
      ...sync.read(),
    }
    isLoaded.value = true
  }

  const publish = () => {
    if (isLoaded.value && !isApplyingRemoteState) {
      sync.publish(cloneState(state.value))
      persistSessionStatistics()
    }
  }

  const flushSessionStatistics = () => {
    if (!activeMatchId.value || !persistTimer) return
    window.clearTimeout(persistTimer)
    persistTimer = undefined
    libraryApi.updateMatchSession(activeMatchId.value, { statistics: cloneState(state.value) }).catch(() => undefined)
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', flushSessionStatistics)
  }

  const persistSessionStatistics = () => {
    if (!activeMatchId.value || typeof window === 'undefined') return
    if (persistTimer) window.clearTimeout(persistTimer)
    persistTimer = window.setTimeout(flushSessionStatistics, 450)
  }

  const subscribe = () => {
    unsubscribeSync?.()
    unsubscribeSync = sync.subscribe((payload) => {
      if (!isLoaded.value) return
      isApplyingRemoteState = true
      state.value = cloneState(payload)
      setTimeout(() => {
        isApplyingRemoteState = false
      }, 0)
    })
  }

  const setMatchScope = (matchId?: string, initialState?: StatisticsState) => {
    const nextScope = matchId ?? null
    if (activeMatchId.value === nextScope && isLoaded.value) return
    activeMatchId.value = nextScope
    sync = createScopedLocalSyncAdapter<StatisticsState>(
      SYNC_CHANNELS.STATISTICS,
      STORAGE_KEYS.STATISTICS,
      matchId,
    )
    const stored = sync.read()
    state.value = cloneState(initialState ?? stored ?? createInitialState())
    isLoaded.value = true
    subscribe()
    if (!stored && initialState) publish()
  }

  const addEvent = (team: TeamSide, type: StatisticEvent['type']) => {
    state.value.events.unshift({
      id: createId(),
      team,
      type,
      set: match.gameState.currentSet,
      score: {
        local: match.gameState.local.score,
        visitor: match.gameState.visitor.score,
      },
      timestamp: Date.now(),
    })
    state.value.events = state.value.events.slice(0, COMMUNICATION_CONFIG.MAX_HISTORY_ITEMS)
  }

  const updateRun = (team: TeamSide) => {
    const opponent = getOpponent(team)
    state.value[opponent].currentRun = 0

    if (state.value.lastScoringTeam === team) {
      state.value[team].currentRun += 1
    } else {
      state.value[team].currentRun = 1
      state.value.lastScoringTeam = team
    }

    state.value[team].biggestRun = Math.max(
      state.value[team].biggestRun,
      state.value[team].currentRun,
    )
  }

  const recordScoredPoint = (team: TeamSide, reason: ScoringReason = 'manual') => {
    state.value[team].points += 1
    updateRun(team)

    if (reason === 'attack') state.value[team].attackPoints += 1
    if (reason === 'block') state.value[team].blockPoints += 1
    if (reason === 'ace') state.value[team].aces += 1
    if (reason === 'opponent_error') state.value[team].opponentErrors += 1

    addEvent(team, reason)
    match.addToHistory(`Estadística: ${scoringLabels[reason]} para ${match.gameState[team].shortCode}`, team)
  }

  const rejectInvalidStat = (message: string) => {
    match.addToHistory(message, 'warning')
  }

  const scorePointWithReason = (team: TeamSide, reason: ScoringReason) => {
    if (reason === 'ace' && !match.gameState[team].serving) {
      rejectInvalidStat('El ace solo puede registrarlo el equipo que tiene el saque.')
      return
    }

    match.scorePoint(team)
    if (!match.gameState.gameFinished || reason !== 'manual') {
      recordScoredPoint(team, reason)
    }
  }

  const recordErrorAndPoint = (team: TeamSide, errorType: StatErrorType) => {
    if (errorType === 'serve_error' && !match.gameState[team].serving) {
      rejectInvalidStat('El error de saque solo puede registrarlo el equipo que tiene el saque.')
      return
    }

    const opponent = getOpponent(team)
    state.value[team][errorType === 'attack_error' ? 'attackErrors' : 'serveErrors'] += 1
    match.scorePoint(opponent)
    recordScoredPoint(opponent, 'opponent_error')
    addEvent(team, errorType)
    match.addToHistory(
      `Error de ${errorType === 'attack_error' ? 'ataque' : 'saque'} de ${match.gameState[team].shortCode}`,
      'warning',
    )
  }

  const recordSkill = (team: TeamSide, skill: StatSkillType) => {
    if (
      (skill === 'positive_reception' || skill === 'negative_reception') &&
      match.gameState[team].serving
    ) {
      rejectInvalidStat('La recepción solo puede registrarla el equipo que recibe el saque.')
      return
    }

    if (skill === 'positive_reception') state.value[team].positiveReceptions += 1
    if (skill === 'negative_reception') state.value[team].negativeReceptions += 1
    if (skill === 'dig') state.value[team].digs += 1
    addEvent(team, skill)
  }

  const resetMatchStats = () => {
    state.value = createInitialState()
  }

  const teamEfficiency = (team: TeamSide) => {
    const stats = state.value[team]
    const positive = stats.attackPoints + stats.blockPoints + stats.aces
    const negative = stats.attackErrors + stats.serveErrors + stats.negativeReceptions
    const total = positive + negative
    return total > 0 ? Math.round((positive / total) * 100) : 0
  }

  const leaders = computed(() => {
    const localEfficiency = teamEfficiency('local')
    const visitorEfficiency = teamEfficiency('visitor')
    return {
      points: state.value.local.points >= state.value.visitor.points ? 'local' : 'visitor',
      aces: state.value.local.aces >= state.value.visitor.aces ? 'local' : 'visitor',
      blocks: state.value.local.blockPoints >= state.value.visitor.blockPoints ? 'local' : 'visitor',
      efficiency: localEfficiency >= visitorEfficiency ? 'local' : 'visitor',
    } satisfies Record<string, TeamSide>
  })

  watch(state, publish, { deep: true })
  hydrate()
  subscribe()

  return {
    state,
    isLoaded,
    activeMatchId,
    leaders,
    hydrate,
    setMatchScope,
    recordScoredPoint,
    scorePointWithReason,
    recordErrorAndPoint,
    recordSkill,
    resetMatchStats,
    teamEfficiency,
    unsubscribe: () => unsubscribeSync?.(),
  }
})
