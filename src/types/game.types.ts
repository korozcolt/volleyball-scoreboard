// Tipos principales del juego de volleyball

export interface Player {
  id: number
  name?: string
  position: number
}

export interface Team {
  id: string
  name: string
  logo?: string
  score: number
  sets: number
  serving: boolean
  currentPlayer: number
  rotation: number[]
  players?: Player[]
  color?: string
}

export interface GameSettings {
  maxSets: number
  pointsToWin: number
  minAdvantage: number
  decidingSetPoints: number
  enableRotation: boolean
  enablePlayerNames: boolean
}

export interface GameHistory {
  id: string
  message: string
  type: HistoryType
  timestamp: Date
  set: number
  score?: {
    local: number
    visitor: number
  }
}

export type HistoryType = 'info' | 'success' | 'warning' | 'error' | 'local' | 'visitor' | 'winner'

export interface GameState {
  local: Team
  visitor: Team
  currentSet: number
  history: GameHistory[]
  gameFinished: boolean
  startTime: Date
  settings: GameSettings
  leagueLogo?: string
  metadata?: {
    tournament?: string
    venue?: string
    date?: Date
    referee?: string
  }
}

export interface ScoreboardEvent {
  type: EventType
  team?: 'local' | 'visitor'
  data?: Record<string, unknown>
  timestamp: Date
}

export type EventType =
  | 'score_point'
  | 'remove_point'
  | 'rotate_team'
  | 'next_set'
  | 'reset_game'
  | 'update_team_name'
  | 'update_team_logo'
  | 'update_team_color'
  | 'update_league_logo'
  | 'toggle_serve'
  | 'game_start'
  | 'game_finished'
  | 'set_finished'

export interface CommunicationState extends GameState {
  timestamp: number
  version?: string
}

// Constantes del juego
export const VOLLEYBALL_CONSTANTS = {
  STANDARD_SET_POINTS: 25,
  DECIDING_SET_POINTS: 15,
  MIN_ADVANTAGE: 2,
  MAX_SETS: 5,
  PLAYERS_PER_TEAM: 6,
  ROTATION_POSITIONS: [1, 2, 3, 4, 5, 6] as const,
} as const

export type RotationPosition = (typeof VOLLEYBALL_CONSTANTS.ROTATION_POSITIONS)[number]

// Interfaces adicionales para el estado del juego
export interface GameProgress {
  setsPlayed: number
  totalSets: number
  currentSetProgress: number
  estimatedTimeRemaining?: number
}

export interface GameStats {
  totalPoints: { local: number; visitor: number }
  averageSetDuration: number
  longestRally?: number
  serviceAces?: { local: number; visitor: number }
  errors?: { local: number; visitor: number }
}

export interface CurrentSetInfo {
  setNumber: number
  startTime: Date
  duration: number
  isDecidingSet: boolean
  pointsToWin: number
}

export interface ServeInfo {
  currentServer: 'local' | 'visitor'
  serverPosition: number
  consecutiveServes: number
  lastServeChange: Date
}

export interface ScoreboardStore {
  gameState: GameState
  scorePoint: (team: 'local' | 'visitor') => void
  removePoint: (team: 'local' | 'visitor') => void
  rotateTeam: (team: 'local' | 'visitor') => void
  nextSet: () => void
  resetGame: () => void
  updateTeamName: (team: 'local' | 'visitor', name: string) => void
  updateTeamLogo: (team: 'local' | 'visitor', logo: string) => void
  updateTeamColor: (team: 'local' | 'visitor', color: string) => void
  toggleServe: () => void
}

// Estados del juego
export type GameStatus = 'waiting' | 'playing' | 'finished' | 'paused'

// Tipos para las animaciones
export interface AnimationConfig {
  duration: number
  easing: string
  delay?: number
}

export interface ScoreAnimationEvent {
  team: 'local' | 'visitor'
  oldScore: number
  newScore: number
  animationType: 'score' | 'set' | 'game'
}

// Configuración del overlay
export interface OverlayConfig {
  theme: 'default' | 'dark' | 'light' | 'custom'
  showPlayerNames: boolean
  showServeIndicator: boolean
  showHistory: boolean
  animationsEnabled: boolean
  customColors?: {
    primary: string
    secondary: string
    accent: string
    background: string
  }
}

// Tipos para los composables
export interface UseGameStateReturn {
  // Estado principal
  gameState: Readonly<Ref<GameState>>
  store: ScoreboardStore

  // Estados computados
  isGameFinished: ComputedRef<boolean>
  currentSet: ComputedRef<number>
  gameStatus: ComputedRef<GameStatus>
  winnerTeam: ComputedRef<Team | null>
  gameProgress: ComputedRef<GameProgress>
  currentTeamServing: ComputedRef<'local' | 'visitor' | null>

  // Equipos
  localTeam: ComputedRef<Team>
  visitorTeam: ComputedRef<Team>

  // Información detallada
  gameStats: ComputedRef<GameStats>
  currentSetInfo: ComputedRef<CurrentSetInfo>
  serveInfo: ComputedRef<ServeInfo>
  recentHistory: ComputedRef<GameHistory[]>
  currentSetHistory: ComputedRef<GameHistory[]>

  // Acciones principales
  scorePoint: (team: 'local' | 'visitor') => void
  removePoint: (team: 'local' | 'visitor') => void
  rotateTeam: (team: 'local' | 'visitor') => void
  nextSet: () => void
  resetGame: () => void
  updateTeamName: (team: 'local' | 'visitor', name: string) => void
  updateTeamLogo: (team: 'local' | 'visitor', logo: string) => void
  updateTeamColor: (team: 'local' | 'visitor', color: string) => void
  toggleServe: () => void

  // Validaciones
  canScorePoint: (team: 'local' | 'visitor') => boolean
  canRemovePoint: (team: 'local' | 'visitor') => boolean
  canRotate: (team: 'local' | 'visitor') => boolean
  canStartNextSet: () => boolean

  // Análisis
  getTeamMomentum: (team: 'local' | 'visitor') => number
  getSetMVP: (setNumber: number) => Player | null
}

export interface UseCommunicationReturn {
  broadcast: (state: GameState) => void
  listen: (callback: (state: CommunicationState) => void) => () => void
  getCurrentState: () => CommunicationState | null
  isConnected: Ref<boolean>
  lastUpdate: Ref<Date | null>
  connectionStatus: Ref<string>
  syncWithExistingState: () => void
  cleanup: () => void
  getConnectionStats: () => {
    isConnected: boolean
    lastUpdate: Date | null
    status: 'connected' | 'disconnected' | 'reconnecting'
    activeListeners: number
    supportsModernAPI: boolean
  }
}

// Importaciones de Vue para los tipos
import type { ComputedRef, Ref } from 'vue'
