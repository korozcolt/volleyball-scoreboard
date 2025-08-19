import { VALIDATION_RULES } from '@utils/constants'

/**
 * Valida si una puntuación es válida
 */
export const validateScore = (score: number): boolean => {
  return score >= VALIDATION_RULES.SCORE.min && score <= VALIDATION_RULES.SCORE.max
}

/**
 * Valida si un nombre de equipo es válido
 */
export const validateTeamName = (name: string): boolean => {
  const { minLength, maxLength, pattern } = VALIDATION_RULES.TEAM_NAME
  return (
    name.length >= minLength &&
    name.length <= maxLength &&
    pattern.test(name)
  )
}

/**
 * Valida si un nombre de jugador es válido
 */
export const validatePlayerName = (name: string): boolean => {
  const { minLength, maxLength, pattern } = VALIDATION_RULES.PLAYER_NAME
  return (
    name.length >= minLength &&
    name.length <= maxLength &&
    pattern.test(name)
  )
}

/**
 * Valida si un número de jugador es válido
 */
export const validatePlayerNumber = (number: number): boolean => {
  return number >= VALIDATION_RULES.PLAYER_NUMBER.min &&
    number <= VALIDATION_RULES.PLAYER_NUMBER.max
}

/**
 * Verifica si un set ha sido ganado
 */
export const checkSetWin = (
  score1: number,
  score2: number,
  targetPoints: number = 25,
  minAdvantage: number = 2
): boolean => {
  const maxScore = Math.max(score1, score2)
  const minScore = Math.min(score1, score2)

  return maxScore >= targetPoints && (maxScore - minScore) >= minAdvantage
}

/**
 * Verifica si el juego ha terminado
 */
export const checkGameWin = (sets1: number, sets2: number, maxSets: number = 5): boolean => {
  const setsToWin = Math.ceil(maxSets / 2)
  return Math.max(sets1, sets2) >= setsToWin
}

/**
 * Genera un ID único
 */
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

/**
 * Valida una URL de logo
 */
export const validateLogoUrl = (url: string): boolean => {
  if (!url) return true // Logo vacío es válido

  try {
    new URL(url)
    return true
  } catch {
    // Si no es una URL válida, verificar si es un emoji o texto corto
    return url.length <= 10
  }
}

/**
 * Valida un código de color hexadecimal
 */
export const validateColor = (color: string): boolean => {
  return /^#([0-9A-F]{3}){1,2}$/i.test(color)
}

/**
 * Formatea el tiempo transcurrido del juego
 */
export const formatGameTime = (startTime: Date): string => {
  const now = new Date()
  const diff = now.getTime() - startTime.getTime()
  const minutes = Math.floor(diff / 60000)
  const seconds = Math.floor((diff % 60000) / 1000)

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

/**
 * Formatea la puntuación para mostrar
 */
export const formatScore = (localScore: number, visitorScore: number): string => {
  return `${localScore}-${visitorScore}`
}

/**
 * Formatea los sets para mostrar
 */
export const formatSets = (localSets: number, visitorSets: number): string => {
  return `${localSets}-${visitorSets}`
}

/**
 * Valida la configuración del juego
 */
export const validateGameSettings = (settings: any): boolean => {
  return (
    typeof settings.maxSets === 'number' &&
    settings.maxSets >= 3 &&
    settings.maxSets <= 7 &&
    settings.maxSets % 2 === 1 && // Debe ser impar
    typeof settings.pointsToWin === 'number' &&
    settings.pointsToWin >= 15 &&
    settings.pointsToWin <= 30 &&
    typeof settings.minAdvantage === 'number' &&
    settings.minAdvantage >= 1 &&
    settings.minAdvantage <= 5 &&
    typeof settings.decidingSetPoints === 'number' &&
    settings.decidingSetPoints >= 10 &&
    settings.decidingSetPoints <= 25
  )
}

/**
 * Sanitiza el nombre de un equipo
 */
export const sanitizeTeamName = (name: string): string => {
  return name
    .trim()
    .replace(/\s+/g, ' ') // Múltiples espacios a uno solo
    .replace(/[^\w\s\-áéíóúñüÁÉÍÓÚÑÜ]/g, '') // Solo caracteres permitidos
    .substring(0, VALIDATION_RULES.TEAM_NAME.maxLength)
}

/**
 * Sanitiza el nombre de un jugador
 */
export const sanitizePlayerName = (name: string): string => {
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s\-áéíóúñüÁÉÍÓÚÑÜ]/g, '')
    .substring(0, VALIDATION_RULES.PLAYER_NAME.maxLength)
}

/**
 * Verifica si una rotación es válida
 */
export const validateRotation = (rotation: number[]): boolean => {
  if (rotation.length !== 6) return false

  const sorted = [...rotation].sort((a, b) => a - b)
  return sorted.every((num, index) => num === index + 1)
}

/**
 * Obtiene el siguiente jugador en la rotación
 */
export const getNextPlayerInRotation = (currentRotation: number[]): number => {
  const [first, ...rest] = currentRotation
  return rest[0] || first
}

/**
 * Valida si un evento del historial es válido
 */
export const validateHistoryEvent = (event: any): boolean => {
  return (
    typeof event.id === 'string' &&
    typeof event.message === 'string' &&
    typeof event.type === 'string' &&
    event.timestamp instanceof Date &&
    typeof event.set === 'number'
  )
}

/**
 * Detecta si es un dispositivo móvil
 */
export const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )
}

/**
 * Detecta si está en modo landscape
 */
export const isLandscapeMode = (): boolean => {
  return window.innerWidth > window.innerHeight
}

/**
 * Calcula el progreso del set actual
 */
export const calculateSetProgress = (
  score: number,
  targetPoints: number = 25
): number => {
  return Math.min((score / targetPoints) * 100, 100)
}

/**
 * Determina si un set está en el punto de set
 */
export const isSetPoint = (
  teamScore: number,
  opponentScore: number,
  targetPoints: number = 25,
  minAdvantage: number = 2
): boolean => {
  return (
    teamScore >= targetPoints - 1 &&
    teamScore - opponentScore >= minAdvantage - 1
  )
}

/**
 * Determina si un set está en el punto de partido
 */
export const isMatchPoint = (
  teamSets: number,
  maxSets: number = 5,
  teamScore: number,
  opponentScore: number,
  targetPoints: number = 25,
  minAdvantage: number = 2
): boolean => {
  const setsToWin = Math.ceil(maxSets / 2)
  return (
    teamSets === setsToWin - 1 &&
    isSetPoint(teamScore, opponentScore, targetPoints, minAdvantage)
  )
}
