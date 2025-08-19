import { ref, watch } from 'vue'
import type { GameSettings } from '@/types/game.types'
import { DEFAULT_GAME_SETTINGS } from '@/utils/constants'

interface AppSettings {
  gameSettings: GameSettings
  leagueLogo?: string
  teamLogos: {
    local?: string
    visitor?: string
  }
  teamNames: {
    local: string
    visitor: string
  }
  teamColors: {
    local: string
    visitor: string
  }
}

const SETTINGS_KEY = 'volleyball-scoreboard-settings'

const defaultSettings: AppSettings = {
  gameSettings: { ...DEFAULT_GAME_SETTINGS },
  teamLogos: {},
  teamNames: {
    local: 'EQUIPO LOCAL',
    visitor: 'EQUIPO VISITANTE'
  },
  teamColors: {
    local: '#2563eb',
    visitor: '#dc2626'
  }
}

export function useSettings() {
  const settings = ref<AppSettings>({ ...defaultSettings })
  const isLoaded = ref(false)

  // Cargar configuración desde localStorage
  const loadSettings = (): AppSettings => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as AppSettings
        // Merge con configuración por defecto para asegurar que todas las propiedades existan
        return {
          ...defaultSettings,
          ...parsed,
          gameSettings: { ...defaultSettings.gameSettings, ...parsed.gameSettings },
          teamLogos: { ...defaultSettings.teamLogos, ...parsed.teamLogos },
          teamNames: { ...defaultSettings.teamNames, ...parsed.teamNames },
          teamColors: { ...defaultSettings.teamColors, ...parsed.teamColors }
        }
      }
    } catch (error) {
      console.warn('Error loading settings from localStorage:', error)
    }
    return { ...defaultSettings }
  }

  // Guardar configuración en localStorage
  const saveSettings = (newSettings: AppSettings) => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings))
      settings.value = { ...newSettings }
    } catch (error) {
      console.error('Error saving settings to localStorage:', error)
    }
  }

  // Inicializar configuración
  const initializeSettings = () => {
    settings.value = loadSettings()
    isLoaded.value = true
  }

  // Actualizar configuración específica
  const updateGameSettings = (newGameSettings: Partial<GameSettings>) => {
    const updated = {
      ...settings.value,
      gameSettings: { ...settings.value.gameSettings, ...newGameSettings }
    }
    saveSettings(updated)
  }

  const updateTeamName = (team: 'local' | 'visitor', name: string) => {
    const updated = {
      ...settings.value,
      teamNames: { ...settings.value.teamNames, [team]: name }
    }
    saveSettings(updated)
  }

  const updateTeamColor = (team: 'local' | 'visitor', color: string) => {
    const updated = {
      ...settings.value,
      teamColors: { ...settings.value.teamColors, [team]: color }
    }
    saveSettings(updated)
  }

  const updateTeamLogo = (team: 'local' | 'visitor', logo: string) => {
    const updated = {
      ...settings.value,
      teamLogos: { ...settings.value.teamLogos, [team]: logo }
    }
    saveSettings(updated)
  }

  const updateLeagueLogo = (logo: string) => {
    const updated = {
      ...settings.value,
      leagueLogo: logo
    }
    saveSettings(updated)
  }

  // Resetear configuración
  const resetSettings = () => {
    saveSettings({ ...defaultSettings })
  }

  // Exportar configuración
  const exportSettings = (): string => {
    return JSON.stringify(settings.value, null, 2)
  }

  // Importar configuración
  const importSettings = (settingsJson: string): boolean => {
    try {
      const imported = JSON.parse(settingsJson) as AppSettings
      saveSettings(imported)
      return true
    } catch (error) {
      console.error('Error importing settings:', error)
      return false
    }
  }

  // Watch para auto-guardar cambios
  watch(
    settings,
    (newSettings) => {
      if (isLoaded.value) {
        try {
          localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings))
        } catch (error) {
          console.error('Error auto-saving settings:', error)
        }
      }
    },
    { deep: true }
  )

  return {
    settings,
    isLoaded,
    initializeSettings,
    loadSettings,
    saveSettings,
    updateGameSettings,
    updateTeamName,
    updateTeamColor,
    updateTeamLogo,
    updateLeagueLogo,
    resetSettings,
    exportSettings,
    importSettings
  }
}