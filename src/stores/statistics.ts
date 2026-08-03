import { COMMUNICATION_CONFIG, STORAGE_KEYS, SYNC_CHANNELS } from '@/utils/constants'
import type {
  PlayerStatSummary,
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
  blockTouches: 0,
  aces: 0,
  opponentErrors: 0,
  attackErrors: 0,
  serveErrors: 0,
  receptionErrors: 0,
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

// Sesiones de partido persistidas antes de agregar un campo nuevo a TeamStatistics no lo traen —
// sin este merge, esos partidos viejos mostrarían NaN al cargar (el mismo problema que tuvo `substitutions`).
const normalizeState = (raw?: Partial<StatisticsState> | null): StatisticsState => ({
  local: { ...createTeamStats(), ...raw?.local },
  visitor: { ...createTeamStats(), ...raw?.visitor },
  events: raw?.events ?? [],
  lastScoringTeam: raw?.lastScoringTeam,
})

const scoringLabels: Record<ScoringReason, string> = {
  manual: 'Punto manual',
  attack: 'Ataque',
  block: 'Bloqueo',
  ace: 'Ace',
  opponent_error: 'Punto por error',
  sanction: 'Punto por sanción',
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
    state.value = normalizeState(sync.read())
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
      state.value = normalizeState(payload)
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
    state.value = normalizeState(initialState ?? stored)
    isLoaded.value = true
    subscribe()
    if (!stored && initialState) publish()
  }

  const addEvent = (
    team: TeamSide,
    type: StatisticEvent['type'],
    playerNumber?: string | number,
    regainedServe?: boolean,
  ) => {
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
      playerNumber: playerNumber !== undefined ? String(playerNumber) : undefined,
      regainedServe,
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

  // 'opponent_error' y 'manual' no son estadísticas personales — no se les atribuye jugador.
  const isPersonalReason = (reason: ScoringReason) => reason === 'attack' || reason === 'block' || reason === 'ace'

  const recordScoredPoint = (
    team: TeamSide,
    reason: ScoringReason = 'manual',
    playerNumber?: string | number,
    regainedServe?: boolean,
  ) => {
    state.value[team].points += 1
    updateRun(team)

    if (reason === 'attack') state.value[team].attackPoints += 1
    if (reason === 'block') state.value[team].blockPoints += 1
    if (reason === 'ace') state.value[team].aces += 1
    if (reason === 'opponent_error') state.value[team].opponentErrors += 1

    addEvent(team, reason, isPersonalReason(reason) ? playerNumber : undefined, regainedServe)
    match.addToHistory(`Estadística: ${scoringLabels[reason]} para ${match.gameState[team].shortCode}`, team)
  }

  const rejectInvalidStat = (message: string) => {
    match.addToHistory(message, 'warning')
  }

  const statEventLabels: Record<StatisticEvent['type'], string> = {
    ...scoringLabels,
    attack_error: 'Error de ataque',
    serve_error: 'Error de saque',
    reception_error: 'Error de recepción',
    positive_reception: 'Recepción positiva',
    negative_reception: 'Recepción negativa',
    dig: 'Defensa',
    block_touch: 'Bloqueo tocado',
  }

  const revertLastEventForTeam = (team: TeamSide) => {
    const index = state.value.events.findIndex((event) => event.team === team)
    if (index === -1) return

    const event = state.value.events[index]
    const stats = state.value[team]

    switch (event.type) {
      case 'attack':
        stats.attackPoints = Math.max(0, stats.attackPoints - 1)
        stats.points = Math.max(0, stats.points - 1)
        break
      case 'block':
        stats.blockPoints = Math.max(0, stats.blockPoints - 1)
        stats.points = Math.max(0, stats.points - 1)
        break
      case 'ace':
        stats.aces = Math.max(0, stats.aces - 1)
        stats.points = Math.max(0, stats.points - 1)
        break
      case 'opponent_error':
        stats.opponentErrors = Math.max(0, stats.opponentErrors - 1)
        stats.points = Math.max(0, stats.points - 1)
        break
      case 'sanction':
        stats.points = Math.max(0, stats.points - 1)
        break
      case 'manual':
        stats.points = Math.max(0, stats.points - 1)
        break
      case 'attack_error':
        stats.attackErrors = Math.max(0, stats.attackErrors - 1)
        break
      case 'serve_error':
        stats.serveErrors = Math.max(0, stats.serveErrors - 1)
        break
      case 'reception_error':
        stats.receptionErrors = Math.max(0, stats.receptionErrors - 1)
        break
      case 'positive_reception':
        stats.positiveReceptions = Math.max(0, stats.positiveReceptions - 1)
        break
      case 'negative_reception':
        stats.negativeReceptions = Math.max(0, stats.negativeReceptions - 1)
        break
      case 'dig':
        stats.digs = Math.max(0, stats.digs - 1)
        break
      case 'block_touch':
        stats.blockTouches = Math.max(0, stats.blockTouches - 1)
        break
    }

    state.value.events.splice(index, 1)
    match.addToHistory(
      `Estadística revertida: ${statEventLabels[event.type]} de ${match.gameState[team].shortCode}${
        event.playerNumber ? ` #${event.playerNumber}` : ''
      }`,
      'warning',
    )
  }

  const removePointWithRevert = (team: TeamSide) => {
    if (match.gameState[team].score <= 0 || match.gameState.gameFinished) return
    match.removePoint(team)
    revertLastEventForTeam(team)
  }

  const scorePointWithReason = (team: TeamSide, reason: ScoringReason, playerNumber?: string | number) => {
    if (reason === 'ace' && !match.gameState[team].serving) {
      rejectInvalidStat('El ace solo puede registrarlo el equipo que tiene el saque.')
      return
    }

    const regainedServe = match.scorePoint(team)
    if (!match.gameState.gameFinished || reason !== 'manual') {
      recordScoredPoint(team, reason, playerNumber, regainedServe)
    }
  }

  const errorStatKey: Record<StatErrorType, 'attackErrors' | 'serveErrors' | 'receptionErrors'> = {
    attack_error: 'attackErrors',
    serve_error: 'serveErrors',
    reception_error: 'receptionErrors',
  }

  const errorLabel: Record<StatErrorType, string> = {
    attack_error: 'ataque',
    serve_error: 'saque',
    reception_error: 'recepción',
  }

  const recordErrorAndPoint = (team: TeamSide, errorType: StatErrorType, playerNumber?: string | number) => {
    if (errorType === 'serve_error' && !match.gameState[team].serving) {
      rejectInvalidStat('El error de saque solo puede registrarlo el equipo que tiene el saque.')
      return
    }
    if (errorType === 'reception_error' && match.gameState[team].serving) {
      rejectInvalidStat('El error de recepción solo puede registrarlo el equipo que recibe el saque.')
      return
    }

    const opponent = getOpponent(team)
    state.value[team][errorStatKey[errorType]] += 1
    const regainedServe = match.scorePoint(opponent)
    recordScoredPoint(opponent, 'opponent_error', undefined, regainedServe)
    addEvent(team, errorType, playerNumber)
    match.addToHistory(`Error de ${errorLabel[errorType]} de ${match.gameState[team].shortCode}`, 'warning')
  }

  const issueSanction = (team: TeamSide, cardType: 'yellow' | 'red') => {
    if (match.gameState.gameFinished) return
    match.recordSanction(team, cardType)
    if (cardType === 'red') {
      const opponent = getOpponent(team)
      const regainedServe = match.scorePoint(opponent)
      recordScoredPoint(opponent, 'sanction', undefined, regainedServe)
    }
  }

  const recordSkill = (team: TeamSide, skill: StatSkillType, playerNumber?: string | number) => {
    if (
      (skill === 'positive_reception' || skill === 'negative_reception') &&
      match.gameState[team].serving
    ) {
      rejectInvalidStat('La recepción solo puede registrarla el equipo que recibe el saque.')
      return
    }

    if (skill === 'block_touch') state.value[team].blockTouches += 1
    if (skill === 'positive_reception') state.value[team].positiveReceptions += 1
    if (skill === 'negative_reception') state.value[team].negativeReceptions += 1
    if (skill === 'dig') state.value[team].digs += 1
    addEvent(team, skill, playerNumber)
  }

  const resetMatchStats = () => {
    state.value = createInitialState()
  }

  const resetRun = () => {
    state.value.local.currentRun = 0
    state.value.visitor.currentRun = 0
    state.value.lastScoringTeam = undefined
  }

  match.onSetStart(resetRun)

  const ratio = (positive: number, negative: number) => {
    const total = positive + negative
    return total > 0 ? Math.round((positive / total) * 100) : 0
  }

  // % de ataque: kills sobre kills+errores. No hay conteo de "ataques en juego"
  // (que quedaron en la cancha), solo se registran los desenlaces (punto o error).
  const attackEfficiency = (team: TeamSide) => {
    const stats = state.value[team]
    return ratio(stats.attackPoints, stats.attackErrors)
  }

  // Sin conteo de bloqueos fallidos/tocados, solo se puede reportar el total de puntos.
  const blockEfficiency = (team: TeamSide) => state.value[team].blockPoints

  const serveEfficiency = (team: TeamSide) => {
    const stats = state.value[team]
    return ratio(stats.aces, stats.serveErrors)
  }

  const receptionRating = (team: TeamSide) => {
    const stats = state.value[team]
    return ratio(stats.positiveReceptions, stats.negativeReceptions)
  }

  // % de sideout: puntos ganados recuperando el saque (regainedServe) sobre el total de veces que
  // el equipo recibió saque (esos mismos puntos + los puntos que el rival anotó extendiendo su propio saque).
  const sideoutRating = (team: TeamSide) => {
    const opponent = getOpponent(team)
    // regainedServe solo se registra en eventos de punto (vía recordScoredPoint); es undefined en
    // eventos de habilidad/error (dig, block_touch, attack_error, ...), que no cuentan aquí.
    const won = state.value.events.filter((event) => event.team === team && event.regainedServe === true).length
    const lostReceiving = state.value.events.filter(
      (event) => event.team === opponent && event.regainedServe === false,
    ).length
    return ratio(won, lostReceiving)
  }

  const createPlayerSummary = (playerNumber: string): PlayerStatSummary => ({
    playerNumber,
    attackPoints: 0,
    blockPoints: 0,
    blockTouches: 0,
    aces: 0,
    attackErrors: 0,
    serveErrors: 0,
    receptionErrors: 0,
    positiveReceptions: 0,
    negativeReceptions: 0,
    digs: 0,
  })

  const playerStatKeyByEventType: Partial<Record<StatisticEvent['type'], keyof Omit<PlayerStatSummary, 'playerNumber'>>> = {
    attack: 'attackPoints',
    block: 'blockPoints',
    block_touch: 'blockTouches',
    ace: 'aces',
    attack_error: 'attackErrors',
    serve_error: 'serveErrors',
    reception_error: 'receptionErrors',
    positive_reception: 'positiveReceptions',
    negative_reception: 'negativeReceptions',
    dig: 'digs',
  }

  const playerStatsFor = (team: TeamSide): PlayerStatSummary[] => {
    const summaries = new Map<string, PlayerStatSummary>()

    for (const event of state.value.events) {
      if (event.team !== team || !event.playerNumber) continue
      const statKey = playerStatKeyByEventType[event.type]
      if (!statKey) continue

      const summary = summaries.get(event.playerNumber) ?? createPlayerSummary(event.playerNumber)
      summary[statKey] += 1
      summaries.set(event.playerNumber, summary)
    }

    return Array.from(summaries.values()).sort(
      (a, b) =>
        b.attackPoints + b.blockPoints + b.aces - (a.attackPoints + a.blockPoints + a.aces),
    )
  }

  const leaders = computed(() => {
    const localAttack = attackEfficiency('local')
    const visitorAttack = attackEfficiency('visitor')
    return {
      points: state.value.local.points >= state.value.visitor.points ? 'local' : 'visitor',
      aces: state.value.local.aces >= state.value.visitor.aces ? 'local' : 'visitor',
      blocks: state.value.local.blockPoints >= state.value.visitor.blockPoints ? 'local' : 'visitor',
      efficiency: localAttack >= visitorAttack ? 'local' : 'visitor',
    } satisfies Record<string, TeamSide>
  })

  watch(state, publish, { deep: true })

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
    issueSanction,
    removePointWithRevert,
    resetMatchStats,
    attackEfficiency,
    blockEfficiency,
    serveEfficiency,
    receptionRating,
    sideoutRating,
    playerStatsFor,
    unsubscribe: () => unsubscribeSync?.(),
  }
})
