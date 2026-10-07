import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useMatchStore } from '@/stores/match'
import { useStatisticsStore } from '@/stores/statistics'
import { isMatchPoint } from '@/utils/volleyballRules'

let match: ReturnType<typeof useMatchStore>
let stats: ReturnType<typeof useStatisticsStore>

// Juega un set completo: el equipo gana 25-N (con ventaja de 2 si hace falta).
const playSet = (winner: 'local' | 'visitor', loserPoints = 18) => {
  const loser = winner === 'local' ? 'visitor' : 'local'
  for (let i = 0; i < loserPoints; i++) stats.scorePointWithReason(loser, 'manual')
  for (let i = 0; i < 25; i++) stats.scorePointWithReason(winner, 'manual')
}

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
  match = useMatchStore()
  stats = useStatisticsStore()
  match.setMatchScope()
  stats.setMatchScope()
  match.updateGameSettings({ maxSets: 3, pointsToWin: 25, decidingSetPoints: 25 })
})

describe('partido de 3 sets (mejor de 3, comportamiento por defecto)', () => {
  it('termina cuando un equipo gana 2 sets', () => {
    playSet('visitor')
    playSet('visitor')
    expect(match.gameState.gameFinished).toBe(true)
    expect(match.gameState.completedSets).toHaveLength(2)
  })
})

describe('se juegan todos los sets', () => {
  beforeEach(() => match.updateGameSettings({ playAllSets: true }))

  it('no termina con 2-0: arranca el set 3', () => {
    playSet('visitor')
    playSet('visitor')
    expect(match.gameState.gameFinished).toBe(false)
    expect(match.gameState.currentSet).toBe(3)
    expect(match.gameState.visitor.sets).toBe(2)
    expect(match.gameState.local.score).toBe(0)
  })

  it('termina al cerrar el tercer set y gana quien tiene más sets (el que iba ganando)', () => {
    playSet('visitor')
    playSet('visitor')
    playSet('local')
    expect(match.gameState.gameFinished).toBe(true)
    expect(match.gameState.status).toBe('finished')
    expect(match.gameState.completedSets).toHaveLength(3)
    expect(match.gameState.visitor.sets).toBe(2)
    expect(match.gameState.local.sets).toBe(1)
    // El mensaje de victoria nombra a quien tiene más sets (el visitante), no a quien ganó el último set.
    const win = match.gameState.history.find((item) => item.type === 'winner')
    expect(win?.message).toContain(match.gameState.visitor.name)
  })

  it('termina 3-0 y 0-3 según corresponda', () => {
    playSet('local')
    playSet('local')
    playSet('local')
    expect(match.gameState.gameFinished).toBe(true)
    expect(match.gameState.local.sets).toBe(3)
  })

  it('con 1-1 el tercer set decide, igual que antes', () => {
    playSet('local')
    playSet('visitor')
    expect(match.gameState.gameFinished).toBe(false)
    playSet('visitor')
    expect(match.gameState.gameFinished).toBe(true)
    expect(match.gameState.visitor.sets).toBe(2)
  })

  it('"match point" solo aparece en el último set y si ganarlo da la mayoría de sets', () => {
    playSet('visitor')
    // set 2: visitante tiene 24 -> set point, pero con todos los sets obligatorios aún no es match point
    for (let i = 0; i < 10; i++) stats.scorePointWithReason('local', 'manual')
    for (let i = 0; i < 24; i++) stats.scorePointWithReason('visitor', 'manual')
    expect(isMatchPoint(match.gameState, 'visitor')).toBe(false)
  })
})

describe('reabrir un partido cerrado antes de tiempo (caso Sucre vs Antioquia)', () => {
  it('lo deja en el set 3, sin puntos, con todos los sets obligatorios y las estadísticas intactas', () => {
    playSet('visitor')
    playSet('visitor')
    expect(match.gameState.gameFinished).toBe(true)
    const eventsBefore = stats.state.events.length

    expect(match.reopenAndPlayAllSets()).toBe(true)

    const state = match.gameState
    expect(state.gameFinished).toBe(false)
    expect(state.status).toBe('live')
    expect(state.currentSet).toBe(3)
    expect(state.local.score + state.visitor.score).toBe(0)
    expect(state.completedSets).toHaveLength(2) // no se duplica el set 2
    expect(state.visitor.sets).toBe(2)
    expect(state.settings.playAllSets).toBe(true)
    expect(state.local.timeoutsUsed + state.visitor.timeoutsUsed).toBe(0)
    expect(stats.state.events.length).toBe(eventsBefore)
    expect(stats.state.local.currentRun + stats.state.visitor.currentRun).toBe(0) // la racha no pasa al set nuevo
  })

  it('no hace nada si el partido no está terminado o ya se jugaron todos los sets', () => {
    expect(match.reopenAndPlayAllSets()).toBe(false)
    match.updateGameSettings({ playAllSets: true })
    playSet('local')
    playSet('local')
    playSet('local')
    expect(match.gameState.gameFinished).toBe(true)
    expect(match.reopenAndPlayAllSets()).toBe(false)
    expect(match.gameState.gameFinished).toBe(true)
  })

  it('después de reabrir, cerrar el set 3 termina el partido', () => {
    playSet('visitor')
    playSet('visitor')
    match.reopenAndPlayAllSets()
    playSet('local', 20)
    expect(match.gameState.gameFinished).toBe(true)
    expect(match.gameState.completedSets).toHaveLength(3)
    expect(match.gameState.visitor.sets).toBe(2)
    expect(match.gameState.local.sets).toBe(1)
  })
})
