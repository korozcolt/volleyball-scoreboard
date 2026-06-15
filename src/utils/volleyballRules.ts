import type { GameState, TeamSide } from '@/types/game.types'

export const getSetTargetPoints = (state: GameState): number => {
  if (state.settings.maxSets === 1) return state.settings.pointsToWin

  return state.currentSet === state.settings.maxSets
    ? state.settings.decidingSetPoints
    : state.settings.pointsToWin
}

export const getOpponent = (team: TeamSide): TeamSide => (team === 'local' ? 'visitor' : 'local')

export const hasWonCurrentSet = (state: GameState, team: TeamSide): boolean => {
  const opponent = getOpponent(team)
  const target = getSetTargetPoints(state)

  return (
    state[team].score >= target &&
    state[team].score - state[opponent].score >= state.settings.minAdvantage
  )
}

export const getCurrentSetWinner = (state: GameState): TeamSide | null => {
  if (hasWonCurrentSet(state, 'local')) return 'local'
  if (hasWonCurrentSet(state, 'visitor')) return 'visitor'
  return null
}

export const getSetsToWinMatch = (state: GameState): number => Math.ceil(state.settings.maxSets / 2)

export const isMatchPoint = (state: GameState, team: TeamSide): boolean => {
  const opponent = getOpponent(team)
  const setsToWin = getSetsToWinMatch(state)
  const target = getSetTargetPoints(state)

  return (
    state[team].sets === setsToWin - 1 &&
    state[team].score >= target - 1 &&
    state[team].score >= state[opponent].score &&
    !state.gameFinished
  )
}

export const isSetPoint = (state: GameState, team: TeamSide): boolean => {
  const opponent = getOpponent(team)
  const target = getSetTargetPoints(state)

  return (
    state[team].score >= target - 1 &&
    state[team].score >= state[opponent].score &&
    !state.gameFinished
  )
}

export const canManuallyAdvanceSet = (state: GameState): boolean => {
  return getCurrentSetWinner(state) !== null && !state.gameFinished
}
