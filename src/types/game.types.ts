import type { ComputedRef, Ref } from 'vue'

export type TeamSide = 'local' | 'visitor'
export type MatchStatus = 'idle' | 'live' | 'paused' | 'finished'
export type GameStatus = MatchStatus | 'waiting' | 'playing'
export type OverlayMode = 'scoreboard' | 'history' | 'stats'
export type BackgroundStyle = 'classic-dark' | 'steel-blue' | 'custom'
export type LowerThirdStyle = 'glass' | 'solid-dark' | 'high-contrast'
export type ScoringReason = 'manual' | 'attack' | 'block' | 'ace' | 'opponent_error'
export type StatErrorType = 'attack_error' | 'serve_error'
export type StatSkillType = 'positive_reception' | 'negative_reception' | 'dig'

export interface Player {
  id: number
  name?: string
  position: number
  number?: number
  active?: boolean
  isLibero?: boolean
  role?: string
}

export interface TeamPlayer {
  id: string
  teamId: string
  number: number
  name: string
  active: boolean
  isLibero?: boolean
  role?: string
  createdAt: number
  updatedAt: number
}

export interface MatchTeamPlayer {
  id: string
  teamPlayerId?: string
  number: number
  name: string
  position: number
  active: boolean
  isLibero?: boolean
  role?: string
}

export interface RotationState {
  positions: Array<number | null>
  currentPlayerNumber?: number
  history?: Array<{
    team: TeamSide
    timestamp: number
    reason: 'regained_serve' | 'manual'
    rotation: number[]
  }>
}

export interface Team {
  id: TeamSide
  name: string
  shortCode: string
  logoUrl?: string
  logo?: string
  score: number
  sets: number
  serving: boolean
  currentPlayer: number
  rotation: number[]
  players?: Player[]
  roster?: MatchTeamPlayer[]
  rotationState?: RotationState
  primaryColor: string
  color?: string
  timeoutsUsed: number
  timeoutActiveUntil?: number
}

export interface GameSettings {
  maxSets: number
  pointsToWin: number
  minAdvantage: number
  decidingSetPoints: number
  enableRotation: boolean
  enablePlayerNames: boolean
  timeoutSeconds: number
  timeoutsPerSet: number
}

export interface CompletedSet {
  setNumber: number
  local: number
  visitor: number
  winner: TeamSide
  finishedAt: number
}

export interface MatchMetadata {
  court: string
  tournament: string
  phase: string
  venue?: string
  referee?: string
  date?: string
}

export type HistoryType = 'info' | 'success' | 'warning' | 'error' | 'local' | 'visitor' | 'winner'

export interface GameHistory {
  id: string
  message: string
  type: HistoryType
  timestamp: number | Date
  set: number
  score?: {
    local: number
    visitor: number
  }
}

export interface GameState {
  local: Team
  visitor: Team
  currentSet: number
  completedSets: CompletedSet[]
  history: GameHistory[]
  gameFinished: boolean
  status: MatchStatus
  startTime: number | Date
  currentSetStartedAt: number | Date
  settings: GameSettings
  metadata: MatchMetadata
  leagueLogo?: string
}

export interface BroadcastTeamConfig {
  name: string
  shortCode: string
  primaryColor: string
  logoUrl?: string
  roster?: TeamPlayer[]
  profileId?: string
}

export interface TeamProfile extends BroadcastTeamConfig {
  id: string
  players?: TeamPlayer[]
  createdAt: number
  updatedAt: number
}

export type MatchSessionStatus = 'draft' | 'live' | 'finished' | 'archived'

export interface MatchSession {
  id: string
  status: MatchSessionStatus
  format: 1 | 3 | 5
  localTeamProfileId?: string
  visitorTeamProfileId?: string
  title?: string
  state?: GameState
  config?: BroadcastConfig
  statistics?: StatisticsState
  overlay?: OverlayControlState
  createdAt: number
  updatedAt: number
}

export interface BroadcastConfig {
  teams: Record<TeamSide, BroadcastTeamConfig>
  tournament: string
  phase: string
  court: string
  sponsorLogoUrl?: string
  leagueLogoUrl?: string
  backgroundStyle: BackgroundStyle
  lowerThirdStyle: LowerThirdStyle
}

export type OverlayCommandType =
  | 'show_history'
  | 'hide_history'
  | 'show_timeout'
  | 'switch_overlay'
  | 'show_lower_third'
  | 'go_live'

export interface OverlayCommand {
  id: string
  type: OverlayCommandType
  team?: TeamSide
  overlayMode?: OverlayMode
  message?: string
  createdAt: number
  durationMs?: number
}

export interface OverlayControlState {
  activeOverlay: OverlayMode
  isLive: boolean
  showHistory: boolean
  lowerThirdVisible: boolean
  lineupVisible: boolean
  lineupMode: 'court' | 'list'
  lastCommand?: OverlayCommand
}

export interface TeamStatistics {
  points: number
  attackPoints: number
  blockPoints: number
  aces: number
  opponentErrors: number
  attackErrors: number
  serveErrors: number
  positiveReceptions: number
  negativeReceptions: number
  digs: number
  currentRun: number
  biggestRun: number
}

export interface StatisticEvent {
  id: string
  team: TeamSide
  type: ScoringReason | StatErrorType | StatSkillType
  set: number
  score: {
    local: number
    visitor: number
  }
  timestamp: number
}

export interface StatisticsState {
  local: TeamStatistics
  visitor: TeamStatistics
  events: StatisticEvent[]
  lastScoringTeam?: TeamSide
}

export interface ScoreboardEvent {
  type: EventType
  team?: TeamSide
  data?: Record<string, unknown>
  timestamp: number
}

export type EventType =
  | 'score_point'
  | 'remove_point'
  | 'manual_score'
  | 'rotate_team'
  | 'next_set'
  | 'reset_set'
  | 'reset_game'
  | 'update_team_name'
  | 'update_team_logo'
  | 'update_team_color'
  | 'update_league_logo'
  | 'toggle_serve'
  | 'game_start'
  | 'game_finished'
  | 'set_finished'
  | 'timeout_started'

export interface CommunicationState extends GameState {
  timestamp: number
  version?: string
}

export interface SyncEnvelope<T> {
  channel: string
  version: string
  timestamp: number
  payload: T
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

export interface ScoreboardStore {
  gameState: GameState
  scorePoint: (team: TeamSide) => void
  removePoint: (team: TeamSide) => void
  rotateTeam: (team: TeamSide) => void
  nextSet: () => void
  resetGame: () => void
  updateTeamName: (team: TeamSide, name: string) => void
  updateTeamLogo: (team: TeamSide, logo: string) => void
  updateTeamColor: (team: TeamSide, color: string) => void
  toggleServe: () => void
}

export interface GameProgress {
  setsPlayed: number
  totalSets: number
  currentSetProgress: number
  estimatedTimeRemaining?: number
}

export interface GameStats {
  totalPoints: { local: number; visitor: number }
  averageSetDuration: number
}

export interface CurrentSetInfo {
  setNumber: number
  startTime: number | Date
  duration: number
  isDecidingSet: boolean
  pointsToWin: number
}

export interface ServeInfo {
  currentServer: TeamSide
  serverPosition: number
  consecutiveServes: number
  lastServeChange: number | Date
}

export interface UseGameStateReturn {
  gameState: Readonly<Ref<GameState>>
  store: ScoreboardStore
  isGameFinished: ComputedRef<boolean>
  currentSet: ComputedRef<number>
  gameStatus: ComputedRef<GameStatus>
  winnerTeam: ComputedRef<Team | null>
  gameProgress: ComputedRef<GameProgress>
  currentTeamServing: ComputedRef<TeamSide | null>
  localTeam: ComputedRef<Team>
  visitorTeam: ComputedRef<Team>
  gameStats: ComputedRef<GameStats>
  currentSetInfo: ComputedRef<CurrentSetInfo>
  serveInfo: ComputedRef<ServeInfo>
  recentHistory: ComputedRef<GameHistory[]>
  currentSetHistory: ComputedRef<GameHistory[]>
  scorePoint: (team: TeamSide) => void
  removePoint: (team: TeamSide) => void
  rotateTeam: (team: TeamSide) => void
  nextSet: () => void
  resetGame: () => void
  updateTeamName: (team: TeamSide, name: string) => void
  updateTeamLogo: (team: TeamSide, logo: string) => void
  updateTeamColor: (team: TeamSide, color: string) => void
  toggleServe: () => void
  canScorePoint: (team: TeamSide) => boolean
  canRemovePoint: (team: TeamSide) => boolean
  canRotate: (team: TeamSide) => boolean
  canStartNextSet: () => boolean
  getTeamMomentum: (team: TeamSide) => number
  getSetMVP: (setNumber: number) => Player | null
}

export const VOLLEYBALL_CONSTANTS = {
  STANDARD_SET_POINTS: 25,
  DECIDING_SET_POINTS: 15,
  MIN_ADVANTAGE: 2,
  MAX_SETS: 5,
  PLAYERS_PER_TEAM: 6,
  ROTATION_POSITIONS: [1, 2, 3, 4, 5, 6] as const,
} as const

export type RotationPosition = (typeof VOLLEYBALL_CONSTANTS.ROTATION_POSITIONS)[number]
