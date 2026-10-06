import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useMatchStore } from '@/stores/match'
import { useStatisticsStore } from '@/stores/statistics'
import type { TeamSide } from '@/types/game.types'

const other = (team: TeamSide): TeamSide => (team === 'local' ? 'visitor' : 'local')

let match: ReturnType<typeof useMatchStore>
let stats: ReturnType<typeof useStatisticsStore>

const serving = (): TeamSide => (match.gameState.local.serving ? 'local' : 'visitor')
const snapshot = () =>
  JSON.stringify({
    local: match.gameState.local,
    visitor: match.gameState.visitor,
    set: match.gameState.currentSet,
    sets: match.gameState.completedSets,
    stats: [stats.state.local, stats.state.visitor],
    events: stats.state.events.length,
  })

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
  match = useMatchStore()
  stats = useStatisticsStore()
  match.setMatchScope()
  stats.setMatchScope()
})

describe('deshacer global', () => {
  it('"-1 Punto" tras un punto del equipo restaura marcador, saque, rotación y estadísticas', () => {
    const before = snapshot()
    const receiver = other(serving())
    stats.scorePointWithReason(receiver, 'attack', match.gameState[receiver].rotation[0])
    expect(snapshot()).not.toBe(before)
    stats.removePointWithRevert(receiver)
    expect(snapshot()).toBe(before)
  })

  it('deshacer un error revierte el punto del rival y el error propio', () => {
    const before = snapshot()
    const server = serving()
    stats.recordErrorAndPoint(server, 'serve_error', match.gameState[server].currentPlayer)
    stats.removePointWithRevert(other(server))
    expect(snapshot()).toBe(before)
  })

  it('deshacer el punto que cierra el set vuelve al set anterior', () => {
    for (let i = 0; i < 24; i++) stats.scorePointWithReason('local', 'manual')
    const before = snapshot()
    stats.scorePointWithReason('local', 'attack', match.gameState.local.rotation[0])
    expect(match.gameState.currentSet).toBe(2)
    stats.undoLast()
    expect(match.gameState.currentSet).toBe(1)
    expect(snapshot()).toBe(before)
  })

  it('el punto que cierra el set se registra con el set y marcador reales', () => {
    for (let i = 0; i < 24; i++) stats.scorePointWithReason('local', 'manual')
    stats.scorePointWithReason('local', 'attack', match.gameState.local.rotation[0])
    const last = stats.state.events[0]
    expect(last.set).toBe(1)
    expect(last.score.local).toBe(25)
  })

  it('"-1 Punto" sin un punto reciente del equipo revierte solo el punto, no una defensa', () => {
    stats.scorePointWithReason('visitor', 'attack', 1)
    stats.recordSkill('visitor', 'dig', 2)
    stats.removePointWithRevert('visitor')
    expect(stats.state.visitor.digs).toBe(1)
    expect(stats.state.visitor.attackPoints).toBe(0)
  })

  it('el log de eventos no se corta a 60', () => {
    for (let i = 0; i < 100; i++) stats.recordSkill('local', 'dig', 3)
    expect(stats.state.events.length).toBe(100)
  })

  it('no registra estadísticas después de terminado el partido', () => {
    match.gameState.gameFinished = true
    const before = stats.state.events.length
    stats.scorePointWithReason('local', 'attack', 1)
    stats.recordSkill('local', 'dig', 1)
    expect(stats.state.events.length).toBe(before)
  })
})

describe('clasificar puntos pendientes', () => {
  it('clasifica un punto manual sin tocar marcador ni puntos totales', () => {
    const team = serving()
    stats.scorePointWithReason(team, 'manual')
    const event = stats.pendingPoints[0]
    const score = match.gameState[team].score
    const points = stats.state[team].points

    expect(stats.reclassifyPoint(event.id, { kind: 'point', reason: 'ace', playerNumber: '2' })).toBe(true)
    expect(stats.state[team].aces).toBe(1)
    expect(stats.pendingPoints).toHaveLength(0)
    expect(match.gameState[team].score).toBe(score)
    expect(stats.state[team].points).toBe(points)
    expect(stats.state.events.find((e) => e.id === event.id)?.playerNumber).toBe('2')
  })

  it('reclasificar mueve el contador de una categoría a otra', () => {
    const team = serving()
    stats.scorePointWithReason(team, 'manual')
    const id = stats.pendingPoints[0].id
    stats.reclassifyPoint(id, { kind: 'point', reason: 'ace', playerNumber: '2' })
    stats.reclassifyPoint(id, { kind: 'point', reason: 'attack', playerNumber: '5' })
    expect(stats.state[team].aces).toBe(0)
    expect(stats.state[team].attackPoints).toBe(1)
  })

  it('respeta quién tenía el saque: sin ace ni error de recepción rival cuando el rival sacaba', () => {
    const receiver = other(serving())
    stats.scorePointWithReason(receiver, 'manual')
    const event = stats.pendingPoints[0]
    expect(event.regainedServe).toBe(true)
    expect(stats.reclassifyPoint(event.id, { kind: 'point', reason: 'ace', playerNumber: '1' })).toBe(false)
    expect(stats.reclassifyPoint(event.id, { kind: 'error', errorType: 'reception_error', playerNumber: '3' })).toBe(false)
    expect(stats.reclassifyPoint(event.id, { kind: 'error', errorType: 'serve_error', playerNumber: '4' })).toBe(true)
    expect(stats.state[other(receiver)].serveErrors).toBe(1)
    expect(stats.state[receiver].opponentErrors).toBe(1)
  })

  it('cambiar de error a ataque elimina el error del rival que lo originó', () => {
    const receiver = other(serving())
    stats.scorePointWithReason(receiver, 'manual')
    const id = stats.pendingPoints[0].id
    stats.reclassifyPoint(id, { kind: 'error', errorType: 'serve_error', playerNumber: '4' })
    stats.reclassifyPoint(id, { kind: 'point', reason: 'attack', playerNumber: '6' })
    expect(stats.state[other(receiver)].serveErrors).toBe(0)
    expect(stats.state[receiver].opponentErrors).toBe(0)
    expect(stats.state[receiver].attackPoints).toBe(1)
    expect(stats.state.events.some((e) => e.type === 'serve_error')).toBe(false)
  })

  it('se puede deshacer una clasificación', () => {
    const team = serving()
    stats.scorePointWithReason(team, 'manual')
    const before = snapshot()
    stats.reclassifyPoint(stats.pendingPoints[0].id, { kind: 'point', reason: 'attack', playerNumber: '5' })
    stats.undoLast()
    expect(snapshot()).toBe(before)
    expect(stats.pendingPoints).toHaveLength(1)
  })
})
