import type { GameSettings, OverlayConfig } from '@types/game.types'

// Configuración por defecto del juego
export const DEFAULT_GAME_SETTINGS: GameSettings = {
  maxSets: 5,
  pointsToWin: 25,
  minAdvantage: 2,
  decidingSetPoints: 15,
  enableRotation: true,
  enablePlayerNames: false,
}

// Configuración por defecto del overlay
export const DEFAULT_OVERLAY_CONFIG: OverlayConfig = {
  theme: 'default',
  showPlayerNames: false,
  showServeIndicator: true,
  showHistory: false,
  animationsEnabled: true,
}

// Claves para localStorage
export const STORAGE_KEYS = {
  GAME_STATE: 'volleyball_scoreboard_state',
  OVERLAY_CONFIG: 'volleyball_overlay_config',
  USER_PREFERENCES: 'volleyball_user_preferences',
  TEAM_LOGOS: 'volleyball_team_logos',
} as const

// Rutas de la aplicación
export const ROUTES = {
  HOME: '/',
  CONTROLLER: '/controller',
  OVERLAY: '/overlay',
  SETTINGS: '/settings',
} as const

// Configuración de la comunicación
export const COMMUNICATION_CONFIG = {
  POLLING_INTERVAL: 500, // ms
  DEBOUNCE_DELAY: 100, // ms
  STORAGE_VERSION: '1.0.0',
  MAX_HISTORY_ITEMS: 50,
} as const

// Colores del tema por defecto
export const THEME_COLORS = {
  default: {
    primary: '#2563eb', // blue-600
    secondary: '#dc2626', // red-600
    accent: '#f59e0b', // amber-500
    background: '#1f2937', // gray-800
    surface: '#374151', // gray-700
    text: '#ffffff',
    textSecondary: '#d1d5db', // gray-300
  },
  dark: {
    primary: '#3b82f6', // blue-500
    secondary: '#ef4444', // red-500
    accent: '#fbbf24', // amber-400
    background: '#111827', // gray-900
    surface: '#1f2937', // gray-800
    text: '#ffffff',
    textSecondary: '#9ca3af', // gray-400
  },
  light: {
    primary: '#1d4ed8', // blue-700
    secondary: '#b91c1c', // red-700
    accent: '#d97706', // amber-600
    background: '#ffffff',
    surface: '#f9fafb', // gray-50
    text: '#111827', // gray-900
    textSecondary: '#6b7280', // gray-500
  },
} as const

// Configuración de animaciones
export const ANIMATIONS = {
  SCORE_BOUNCE: {
    duration: 600,
    easing: 'ease-in-out',
  },
  SET_WIN: {
    duration: 1000,
    easing: 'ease-in-out',
  },
  SERVE_PULSE: {
    duration: 2000,
    easing: 'infinite',
  },
  SLIDE_IN: {
    duration: 500,
    easing: 'ease-out',
  },
  FADE_IN: {
    duration: 300,
    easing: 'ease-in',
  },
  NOTIFICATION: {
    duration: 3000,
    easing: 'ease-in-out',
  },
} as const

// Atajos de teclado
export const KEYBOARD_SHORTCUTS = {
  SCORE_LOCAL: 'KeyQ',
  SCORE_VISITOR: 'KeyW',
  REMOVE_LOCAL: 'KeyA',
  REMOVE_VISITOR: 'KeyS',
  ROTATE_LOCAL: 'KeyZ',
  ROTATE_VISITOR: 'KeyX',
  NEXT_SET: 'KeyN',
  RESET_GAME: 'KeyR', // Con Ctrl
  TOGGLE_SERVE: 'Space',
} as const

// Mensajes por defecto
export const DEFAULT_MESSAGES = {
  GAME_START: '🏐 ¡Inicio del partido!',
  SET_START: (setNumber: number) => `📢 Inicio del Set ${setNumber}`,
  SET_WIN: (teamName: string, setNumber: number) =>
    `🎉 ${teamName} gana el set ${setNumber}!`,
  GAME_WIN: (teamName: string) => `🏆 ¡${teamName} GANA EL PARTIDO!`,
  POINT_SCORED: (teamName: string, score: string) =>
    `⚡ Punto para ${teamName} (${score})`,
  POINT_REMOVED: (teamName: string) => `↩️ Punto removido de ${teamName}`,
  ROTATION: (teamName: string, player: number) =>
    `🔄 Rotación ${teamName} - Jugador en saque: #${player}`,
  GAME_RESET: '🔄 Juego reiniciado',
  TEAM_NAME_UPDATED: '📝 Nombres de equipos actualizados',
  LOGO_UPDATED: '🖼️ Logo actualizado',
} as const

// Configuración de validación
export const VALIDATION_RULES = {
  TEAM_NAME: {
    minLength: 1,
    maxLength: 30,
    pattern: /^[a-zA-Z0-9\s\-_áéíóúñüÁÉÍÓÚÑÜ]+$/,
  },
  PLAYER_NAME: {
    minLength: 1,
    maxLength: 20,
    pattern: /^[a-zA-Z\s\-áéíóúñüÁÉÍÓÚÑÜ]+$/,
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

// Configuración del overlay para OBS
export const OBS_CONFIG = {
  RECOMMENDED_WIDTH: 1920,
  RECOMMENDED_HEIGHT: 200,
  SAFE_AREA: {
    top: 20,
    bottom: 20,
    left: 40,
    right: 40,
  },
  TRANSPARENCY: true,
  BACKGROUND_COLOR: 'transparent',
} as const

// URLs de logos por defecto
export const DEFAULT_LOGOS = {
  LOCAL: '/logos/default-local.png',
  VISITOR: '/logos/default-visitor.png',
  LEAGUE: '/logos/league-logo.png',
  VOLLEYBALL: '🏐',
} as const

// Configuración de red y comunicación
export const NETWORK_CONFIG = {
  WEBSOCKET_RECONNECT_INTERVAL: 5000,
  MAX_RECONNECT_ATTEMPTS: 10,
  HEARTBEAT_INTERVAL: 30000,
  CONNECTION_TIMEOUT: 10000,
} as const

// Tipos de eventos para el historial
export const EVENT_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  LOCAL: 'local',
  VISITOR: 'visitor',
  WINNER: 'winner',
} as const

// Configuración de responsive breakpoints
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  '2XL': 1536,
} as const

// Configuración de desarrollo
export const DEV_CONFIG = {
  MOCK_DATA: process.env.NODE_ENV === 'development',
  DEBUG_MODE: process.env.NODE_ENV === 'development',
  LOG_LEVEL: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
} as const
