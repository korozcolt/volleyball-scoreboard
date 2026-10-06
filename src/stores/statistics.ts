import { COMMUNICATION_CONFIG, STORAGE_KEYS, SYNC_CHANNELS } from '@/utils/constants'
import type {
  GameState,
  PointClassification,
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
    clearUndo()
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

  // Set y marcador tal como quedan justo al anotar. Si el punto cierra el set, el estado del partido ya
  // avanzó al siguiente (0-0), así que el evento se registra con el contexto capturado antes de avanzar.
  type PointContext = { set: number; score: { local: number; visitor: number } }
  const capturePointContext = (scoringTeam: TeamSide): PointContext => ({
    set: match.gameState.currentSet,
    score: {
      local: match.gameState.local.score + (scoringTeam === 'local' ? 1 : 0),
      visitor: match.gameState.visitor.score + (scoringTeam === 'visitor' ? 1 : 0),
    },
  })

  // ─── Deshacer global ──────────────────────────────────────────────────────
  // Instantánea del marcador (incluye saque, rotación y sets) y de las estadísticas justo antes de cada
  // acción. Deshacer restaura ambas, así que revierte todo el efecto de la acción, incluso el punto que
  // cerró un set.
  type UndoEntry = { game: GameState; stats: StatisticsState; label: string; pointTeam?: TeamSide }
  const MAX_UNDO_ENTRIES = 40
  const undoStack = ref<UndoEntry[]>([])
  const canUndo = computed(() => undoStack.value.length > 0)
  const lastUndoLabel = computed(() => undoStack.value[undoStack.value.length - 1]?.label ?? '')

  const pushUndo = (label: string, pointTeam?: TeamSide) => {
    undoStack.value.push({ game: match.getGameState(), stats: cloneState(state.value), label, pointTeam })
    if (undoStack.value.length > MAX_UNDO_ENTRIES) undoStack.value.shift()
  }

  const clearUndo = () => {
    undoStack.value = []
  }

  const undoLast = () => {
    const entry = undoStack.value.pop()
    if (!entry) return
    match.restoreGameState(entry.game)
    state.value = cloneState(entry.stats)
    match.addToHistory(`Deshecho: ${entry.label}`, 'warning')
  }

  const addEvent = (
    team: TeamSide,
    type: StatisticEvent['type'],
    playerNumber?: string | number,
    regainedServe?: boolean,
    context?: PointContext,
  ) => {
    state.value.events.unshift({
      id: createId(),
      team,
      type,
      set: context?.set ?? match.gameState.currentSet,
      score: context?.score ?? {
        local: match.gameState.local.score,
        visitor: match.gameState.visitor.score,
      },
      timestamp: Date.now(),
      playerNumber: playerNumber !== undefined ? String(playerNumber) : undefined,
      regainedServe,
    })
    state.value.events = state.value.events.slice(0, COMMUNICATION_CONFIG.MAX_STAT_EVENTS)
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
    context?: PointContext,
  ) => {
    state.value[team].points += 1
    updateRun(team)

    if (reason === 'attack') state.value[team].attackPoints += 1
    if (reason === 'block') state.value[team].blockPoints += 1
    if (reason === 'ace') state.value[team].aces += 1
    if (reason === 'opponent_error') state.value[team].opponentErrors += 1

    addEvent(team, reason, isPersonalReason(reason) ? playerNumber : undefined, regainedServe, context)
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

  const pointEventTypes: ReadonlyArray<StatisticEvent['type']> = [
    'attack',
    'block',
    'ace',
    'opponent_error',
    'sanction',
    'manual',
  ]
  const errorEventTypes: ReadonlyArray<StatisticEvent['type']> = ['attack_error', 'serve_error', 'reception_error']

  // Revierte el contador y saca del log el evento en `index`. No toca el marcador.
  const revertEventAt = (index: number) => {
    const event = state.value.events[index]
    if (!event) return
    const team = event.team
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

  // Respaldo cuando el último movimiento no fue un punto de este equipo: baja el marcador y revierte solo
  // el último evento de PUNTO del equipo (nunca una recepción o defensa registrada después) junto con el
  // error del rival que lo originó, si lo hubo (se registra justo después del punto, o sea, más reciente).
  const revertLastPointEventForTeam = (team: TeamSide) => {
    const index = state.value.events.findIndex((event) => event.team === team && pointEventTypes.includes(event.type))
    if (index === -1) return
    const paired = state.value.events[index - 1]
    const hasPairedError =
      state.value.events[index].type === 'opponent_error' &&
      paired !== undefined &&
      paired.team !== team &&
      errorEventTypes.includes(paired.type)
    revertEventAt(index)
    if (hasPairedError) revertEventAt(index - 1)
  }

  const removePointWithRevert = (team: TeamSide) => {
    if (match.gameState[team].score <= 0 && undoStack.value[undoStack.value.length - 1]?.pointTeam !== team) return
    // Caso normal: el último movimiento fue un punto de este equipo → se deshace completo (marcador,
    // saque, rotación, racha, estadísticas y sets).
    if (undoStack.value[undoStack.value.length - 1]?.pointTeam === team) {
      undoLast()
      return
    }
    if (match.gameState.gameFinished) return
    pushUndo('Quitar punto', undefined)
    match.removePoint(team)
    revertLastPointEventForTeam(team)
  }

  const recordRotationFault = (offendingTeam: TeamSide) => {
    if (match.gameState.gameFinished) return
    const opponent = getOpponent(offendingTeam)
    pushUndo(`Falta de rotación de ${match.gameState[offendingTeam].shortCode}`, opponent)
    const context = capturePointContext(opponent)
    const regainedServe = match.scorePoint(opponent)
    recordScoredPoint(opponent, 'opponent_error', undefined, regainedServe, context)
    match.addToHistory(
      `Falta de rotación: ${match.gameState[offendingTeam].name}. Punto para ${match.gameState[opponent].shortCode}.`,
      'warning',
    )
  }

  // ─── Clasificar / corregir puntos después de anotarlos ────────────────────
  // El anotador puede sumar el punto ya ("+1 sin clasificar") y decidir después cómo terminó y quién lo
  // hizo. Reclasificar nunca toca el marcador, los puntos totales, la racha ni el saque: solo cambia el
  // desglose (ataque/bloqueo/ace/error rival) y la jugadora atribuida.
  const counterKeyByType: Partial<Record<StatisticEvent['type'], keyof TeamStatistics>> = {
    attack: 'attackPoints',
    block: 'blockPoints',
    ace: 'aces',
    opponent_error: 'opponentErrors',
    attack_error: 'attackErrors',
    serve_error: 'serveErrors',
    reception_error: 'receptionErrors',
  }

  const bumpCounter = (team: TeamSide, type: StatisticEvent['type'], delta: 1 | -1) => {
    const key = counterKeyByType[type]
    if (key) state.value[team][key] = Math.max(0, state.value[team][key] + delta)
  }

  // Puntos que se pueden reclasificar (las sanciones no: son un punto por regla).
  const reclassifiablePointTypes: ReadonlyArray<StatisticEvent['type']> = [
    'manual',
    'attack',
    'block',
    'ace',
    'opponent_error',
  ]

  const pendingPoints = computed(() => state.value.events.filter((event) => event.type === 'manual'))
  const classifiedPoints = computed(() =>
    state.value.events.filter((event) => reclassifiablePointTypes.includes(event.type) && event.type !== 'manual'),
  )

  // `regainedServe` indica que el equipo que anotó no tenía el saque: define qué clasificaciones son posibles.
  // En eventos antiguos sin ese dato (undefined) no se restringe nada.
  const classificationError = (event: StatisticEvent, c: PointClassification): string | null => {
    if (c.kind === 'point' && c.reason === 'ace' && event.regainedServe === true) {
      return 'Un ace solo lo anota el equipo que ya tenía el saque.'
    }
    if (c.kind === 'error' && c.errorType === 'serve_error' && event.regainedServe === false) {
      return 'El error de saque es del equipo que saca: aquí el rival no tenía el saque.'
    }
    if (c.kind === 'error' && c.errorType === 'reception_error' && event.regainedServe === true) {
      return 'El error de recepción es del equipo que recibe: aquí el rival tenía el saque.'
    }
    return null
  }

  const reclassifyPoint = (eventId: string, classification: PointClassification): boolean => {
    let index = state.value.events.findIndex((event) => event.id === eventId)
    if (index === -1) return false
    const event = state.value.events[index]
    if (!reclassifiablePointTypes.includes(event.type)) return false

    const problem = classificationError(event, classification)
    if (problem) {
      rejectInvalidStat(problem)
      return false
    }

    pushUndo('Clasificar punto')
    const opponent = getOpponent(event.team)

    // Quita la clasificación anterior, incluido el error del rival que la originó (se registra justo
    // después del punto, o sea, una posición más reciente en el log).
    const paired = state.value.events[index - 1]
    if (
      event.type === 'opponent_error' &&
      paired !== undefined &&
      paired.team === opponent &&
      errorEventTypes.includes(paired.type)
    ) {
      bumpCounter(paired.team, paired.type, -1)
      state.value.events.splice(index - 1, 1)
      index -= 1
    }
    bumpCounter(event.team, event.type, -1)

    if (classification.kind === 'point') {
      event.type = classification.reason
      event.playerNumber =
        classification.reason !== 'opponent_error' && classification.playerNumber !== undefined
          ? String(classification.playerNumber)
          : undefined
      bumpCounter(event.team, event.type, 1)
    } else {
      event.type = 'opponent_error'
      event.playerNumber = undefined
      bumpCounter(event.team, 'opponent_error', 1)
      bumpCounter(opponent, classification.errorType, 1)
      state.value.events.splice(index, 0, {
        id: createId(),
        team: opponent,
        type: classification.errorType,
        set: event.set,
        score: { ...event.score },
        timestamp: event.timestamp,
        playerNumber:
          classification.playerNumber !== undefined ? String(classification.playerNumber) : undefined,
      })
    }

    match.addToHistory(
      `Punto clasificado: ${scoringLabels[event.type as ScoringReason] ?? event.type} · ${
        match.gameState[event.team].shortCode
      } (${event.score.local}-${event.score.visitor})`,
      'info',
    )
    return true
  }

  const scorePointWithReason = (team: TeamSide, reason: ScoringReason, playerNumber?: string | number) => {
    if (match.gameState.gameFinished) return
    if (reason === 'ace' && !match.gameState[team].serving) {
      rejectInvalidStat('El ace solo puede registrarlo el equipo que tiene el saque.')
      return
    }

    if (match.gameState.gameFinished) return
    pushUndo(scoringLabels[reason], team)
    const context = capturePointContext(team)
    const regainedServe = match.scorePoint(team)
    recordScoredPoint(team, reason, playerNumber, regainedServe, context)
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

    if (match.gameState.gameFinished) return
    const opponent = getOpponent(team)
    pushUndo(`Error de ${errorLabel[errorType]} de ${match.gameState[team].shortCode}`, opponent)
    const context = capturePointContext(opponent)
    state.value[team][errorStatKey[errorType]] += 1
    const regainedServe = match.scorePoint(opponent)
    recordScoredPoint(opponent, 'opponent_error', undefined, regainedServe, context)
    addEvent(team, errorType, playerNumber, undefined, context)
    match.addToHistory(`Error de ${errorLabel[errorType]} de ${match.gameState[team].shortCode}`, 'warning')
  }

  const issueSanction = (team: TeamSide, cardType: 'yellow' | 'red') => {
    if (match.gameState.gameFinished) return
    const opponent = getOpponent(team)
    pushUndo(cardType === 'red' ? 'Tarjeta roja' : 'Tarjeta amarilla', cardType === 'red' ? opponent : undefined)
    match.recordSanction(team, cardType)
    if (cardType === 'red') {
      const context = capturePointContext(opponent)
      const regainedServe = match.scorePoint(opponent)
      recordScoredPoint(opponent, 'sanction', undefined, regainedServe, context)
    }
  }

  const recordSkill = (team: TeamSide, skill: StatSkillType, playerNumber?: string | number) => {
    if (match.gameState.gameFinished) return
    if (
      (skill === 'positive_reception' || skill === 'negative_reception') &&
      match.gameState[team].serving
    ) {
      rejectInvalidStat('La recepción solo puede registrarla el equipo que recibe el saque.')
      return
    }

    pushUndo(statEventLabels[skill])
    if (skill === 'block_touch') state.value[team].blockTouches += 1
    if (skill === 'positive_reception') state.value[team].positiveReceptions += 1
    if (skill === 'negative_reception') state.value[team].negativeReceptions += 1
    if (skill === 'dig') state.value[team].digs += 1
    addEvent(team, skill, playerNumber)
  }

  const resetMatchStats = () => {
    state.value = createInitialState()
    clearUndo()
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
    recordRotationFault,
    reclassifyPoint,
    pendingPoints,
    classifiedPoints,
    pushUndo,
    undoLast,
    clearUndo,
    canUndo,
    lastUndoLabel,
    resetMatchStats,
    attackEfficiency,
    blockEfficiency,
    serveEfficiency,
    receptionRating,
    sideoutRating,
    unsubscribe: () => unsubscribeSync?.(),
  }
})
