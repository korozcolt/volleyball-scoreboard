import { computed } from 'vue'
import { defineStore } from 'pinia'
import { useBroadcastConfigStore } from './broadcastConfig'
import { useMatchStore } from './match'

export const useScoreboardStore = defineStore('scoreboard', () => {
  const match = useMatchStore()
  const broadcastConfig = useBroadcastConfigStore()

  const scoreHistory = computed(() =>
    match.gameState.history
      .filter((item) => item.score)
      .slice(0, 6)
      .map((item) => ({
        local: item.score?.local ?? 0,
        visitor: item.score?.visitor ?? 0,
        timestamp: new Date(item.timestamp),
      })),
  )

  const updateTeamName = (team: 'local' | 'visitor', name: string) => {
    broadcastConfig.updateTeam(team, { name })
  }

  const updateTeamLogo = (team: 'local' | 'visitor', logo: string) => {
    broadcastConfig.updateTeam(team, { logoUrl: logo })
  }

  const updateTeamColor = (team: 'local' | 'visitor', color: string) => {
    broadcastConfig.updateTeam(team, { primaryColor: color })
  }

  const updateLeagueLogo = (logo: string) => {
    broadcastConfig.updateConfig({ leagueLogoUrl: logo })
  }

  const initializeGame = () => {
    match.hydrate()
    broadcastConfig.hydrate()
  }

  const loadSavedSettings = initializeGame

  const gameProgress = computed(() => {
    const setsToWin = Math.ceil(match.gameState.settings.maxSets / 2)

    return {
      local: Math.min((match.gameState.local.sets / setsToWin) * 100, 100),
      visitor: Math.min((match.gameState.visitor.sets / setsToWin) * 100, 100),
      setsToWin,
    }
  })

  return {
    gameState: match.gameState,
    events: [],
    lastEventId: '',
    scoreHistory,
    currentTeamServing: match.currentTeamServing,
    gameStatus: match.gameStatus,
    isGameFinished: match.isGameFinished,
    currentSet: match.currentSet,
    winnerTeam: match.winnerTeam,
    gameProgress,
    scorePoint: match.scorePoint,
    removePoint: match.removePoint,
    rotateTeam: match.rotateTeam,
    nextSet: match.nextSet,
    resetGame: match.resetGame,
    toggleServe: match.toggleServe,
    updateTeamName,
    updateTeamLogo,
    updateTeamColor,
    updateLeagueLogo,
    updateGameSettings: match.updateGameSettings,
    addToHistory: match.addToHistory,
    getGameState: match.getGameState,
    restoreGameState: match.restoreGameState,
    initializeGame,
    loadSavedSettings,
    settingsManager: {
      settings: computed(() => ({
        gameSettings: match.gameState.settings,
        teamLogos: {
          local: broadcastConfig.config.teams.local.logoUrl,
          visitor: broadcastConfig.config.teams.visitor.logoUrl,
        },
        teamNames: {
          local: broadcastConfig.config.teams.local.name,
          visitor: broadcastConfig.config.teams.visitor.name,
        },
        teamColors: {
          local: broadcastConfig.config.teams.local.primaryColor,
          visitor: broadcastConfig.config.teams.visitor.primaryColor,
        },
        leagueLogo: broadcastConfig.config.leagueLogoUrl,
      })),
    },
  }
})

export type ScoreboardStore = ReturnType<typeof useScoreboardStore>
