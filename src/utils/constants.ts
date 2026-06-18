import type { BroadcastConfig, GameSettings } from '@/types/game.types'

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  maxSets: 5,
  pointsToWin: 25,
  minAdvantage: 2,
  decidingSetPoints: 15,
  enableRotation: true,
  enablePlayerNames: false,
  timeoutSeconds: 30,
  timeoutsPerSet: 2,
}

export const DEFAULT_BROADCAST_CONFIG: BroadcastConfig = {
  teams: {
    local: {
      name: 'Milano Volley',
      shortCode: 'MIL',
      primaryColor: '#00a6e0',
    },
    visitor: {
      name: 'Trentino Itas',
      shortCode: 'TRN',
      primaryColor: '#ee3a5a',
    },
  },
  tournament: 'Finales ProVolley',
  phase: 'Semifinal, Partido 3',
  court: 'Cancha 1',
  backgroundStyle: 'classic-dark',
  lowerThirdStyle: 'glass',
}

export const STORAGE_KEYS = {
  MATCH_STATE: 'volleystream_match_state',
  BROADCAST_CONFIG: 'volleystream_broadcast_config',
  OVERLAY_CONTROL: 'volleystream_overlay_control',
  STATISTICS: 'volleystream_statistics',
  GAME_STATE: 'volleystream_match_state',
  OVERLAY_CONFIG: 'volleystream_overlay_control',
  USER_PREFERENCES: 'volleystream_user_preferences',
  TEAM_LOGOS: 'volleystream_team_logos',
  MATCH_SESSIONS: 'volleystream_match_sessions',
  LAST_MATCH_ID: 'volleystream_last_match_id',
} as const

export const SYNC_CHANNELS = {
  MATCH: 'volleystream:match',
  BROADCAST_CONFIG: 'volleystream:broadcast-config',
  OVERLAY_CONTROL: 'volleystream:overlay-control',
  STATISTICS: 'volleystream:statistics',
} as const

export const scopedStorageKey = (baseKey: string, scopeId?: string) =>
  scopeId ? `${baseKey}:${scopeId}` : baseKey

export const scopedSyncChannel = (baseChannel: string, scopeId?: string) =>
  scopeId ? `${baseChannel}:${scopeId}` : baseChannel

export const ROUTES = {
  HOME: '/',
  CONTROLLER: '/controller',
  OVERLAY: '/overlay',
  LINEUP: '/lineup',
  STATISTICS: '/statistics',
  SETTINGS: '/settings',
  MATCHES: '/matches',
} as const

export const COMMUNICATION_CONFIG = {
  POLLING_INTERVAL: 500,
  DEBOUNCE_DELAY: 100,
  STORAGE_VERSION: '2.1.0',
  MAX_HISTORY_ITEMS: 60,
} as const

export const KEYBOARD_SHORTCUTS = {
  SCORE_LOCAL: 'KeyQ',
  SCORE_VISITOR: 'KeyW',
  REMOVE_LOCAL: 'KeyA',
  REMOVE_VISITOR: 'KeyS',
  NEXT_SET: 'KeyN',
  RESET_GAME: 'KeyR',
  TOGGLE_SERVE: 'Space',
  SHOW_HISTORY: 'KeyH',
} as const

export const BROADCAST_THEME = {
  background: '#031427',
  surface: '#031427',
  surfaceLowest: '#000f21',
  surfaceLow: '#0b1c30',
  surfaceContainer: '#102034',
  surfaceHigh: '#1b2b3f',
  surfaceHighest: '#26364a',
  outline: '#45464d',
  text: '#d3e4fe',
  muted: '#c6c6cd',
  accent: '#7bd0ff',
  accentStrong: '#00a6e0',
  alert: '#ffb2b7',
  danger: '#ee3a5a',
} as const

export const DEFAULT_MESSAGES = {
  GAME_START: 'Inicio del partido',
  SET_START: (setNumber: number) => `Inicio del set ${setNumber}`,
  SET_WIN: (teamName: string, setNumber: number) => `${teamName} gana el set ${setNumber}`,
  GAME_WIN: (teamName: string) => `${teamName} gana el partido`,
  POINT_SCORED: (teamName: string, score: string) => `Punto para ${teamName} (${score})`,
  POINT_REMOVED: (teamName: string) => `Punto removido de ${teamName}`,
  GAME_RESET: 'Partido reiniciado',
  SET_RESET: 'Set reiniciado',
  TEAM_NAME_UPDATED: 'Equipo actualizado',
  LOGO_UPDATED: 'Logo actualizado',
  TIMEOUT: (teamName: string) => `Timeout solicitado por ${teamName}`,
} as const

export const VALIDATION_RULES = {
  TEAM_NAME: {
    minLength: 1,
    maxLength: 40,
    pattern: /^[a-zA-Z0-9\s\-_áéíóúñüÁÉÍÓÚÑÜ.]+$/,
  },
  PLAYER_NAME: {
    minLength: 1,
    maxLength: 20,
    pattern: /^[a-zA-Z\s\-áéíóúñüÁÉÍÓÚÑÜ]+$/,
  },
  SHORT_CODE: {
    minLength: 2,
    maxLength: 4,
    pattern: /^[A-Z0-9]+$/,
  },
  SCORE: {
    min: 0,
    max: 99,
  },
  SET: {
    min: 1,
    max: 5,
  },
  PLAYER_NUMBER: {
    min: 1,
    max: 99,
  },
} as const

export const OBS_CONFIG = {
  RECOMMENDED_WIDTH: 1920,
  RECOMMENDED_HEIGHT: 200,
  PREVIEW_ASPECT_RATIO: '16 / 9',
  SAFE_AREA_PERCENT: 5,
  TRANSPARENCY: true,
  BACKGROUND_COLOR: 'transparent',
} as const
