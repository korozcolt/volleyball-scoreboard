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
  data?: any
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
  gameState: Readonly<Ref<GameState>>
  scorePoint: (team: 'local' | 'visitor') => void
  removePoint: (team: 'local' | 'visitor') => void
  rotateTeam: (team: 'local' | 'visitor') => void
  nextSet: () => void
  resetGame: () => void
  updateTeamName: (team: 'local' | 'visitor', name: string) => void
  updateTeamLogo: (team: 'local' | 'visitor', logo: string) => void
  isGameFinished: ComputedRef<boolean>
  currentSet: ComputedRef<number>
  gameStatus: ComputedRef<GameStatus>
}

export interface UseCommunicationReturn {
  broadcast: (state: GameState) => void
  listen: (callback: (state: CommunicationState) => void) => () => void
  getCurrentState: () => CommunicationState | null
  isConnected: Readonly<Ref<boolean>>
  lastUpdate: Readonly<Ref<Date | null>>
}

// Importaciones de Vue para los tipos
import type { ComputedRef, Ref } from 'vue'
