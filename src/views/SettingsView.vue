<template>
  <div class="settings-view min-h-screen bg-gray-900 text-white">
    <!-- Header -->
    <header class="bg-gray-800 border-b border-gray-700 p-4">
      <div class="container mx-auto flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <h1 class="text-2xl font-bold text-blue-400">⚙️ Configuración</h1>
          <div class="text-sm text-gray-400">
            Volleyball Scoreboard Settings
          </div>
        </div>
        <router-link
          to="/"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          🏠 Inicio
        </router-link>
      </div>
    </header>

    <!-- Main Content -->
    <main class="container mx-auto p-6">
      <!-- Game Settings -->
      <div class="mb-8 bg-gray-800 rounded-lg p-6">
        <h2 class="text-xl font-semibold mb-4 text-white">Configuración del Juego</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Máximo de Sets
            </label>
            <select
              v-model="settings.maxSets"
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            >
              <option value="3">3 Sets</option>
              <option value="5">5 Sets</option>
            </select>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Puntos para Ganar Set
            </label>
            <input
              v-model.number="settings.pointsToWin"
              type="number"
              min="15"
              max="30"
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Ventaja Mínima
            </label>
            <input
              v-model.number="settings.minAdvantage"
              type="number"
              min="1"
              max="5"
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Puntos Set Decisivo
            </label>
            <input
              v-model.number="settings.decidingSetPoints"
              type="number"
              min="10"
              max="25"
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>
        </div>
        
        <div class="mt-6 space-y-4">
          <label class="flex items-center">
            <input
              v-model="settings.enableRotation"
              type="checkbox"
              class="mr-3 h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
            />
            <span class="text-gray-300">Habilitar rotación de jugadores</span>
          </label>
          
          <label class="flex items-center">
            <input
              v-model="settings.enablePlayerNames"
              type="checkbox"
              class="mr-3 h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
            />
            <span class="text-gray-300">Mostrar nombres de jugadores</span>
          </label>
        </div>
      </div>

      <!-- Team Settings -->
      <div class="mb-8 bg-gray-800 rounded-lg p-6">
        <h2 class="text-xl font-semibold mb-4 text-white">Configuración de Equipos</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Local Team -->
          <div>
            <h3 class="text-lg font-medium text-blue-400 mb-3">Equipo Local</h3>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">
                  Nombre del Equipo
                </label>
                <input
                  v-model="localTeam.name"
                  type="text"
                  class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="Nombre del equipo local"
                />
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">
                  Color del Equipo
                </label>
                <input
                  v-model="localTeam.color"
                  type="color"
                  class="w-full h-10 bg-gray-700 border border-gray-600 rounded-lg"
                />
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">
                  Logo del Equipo
                </label>
                <ImageUpload
                  v-model="localTeam.logo"
                  label="logo del equipo local"
                  @file-selected="handleLocalLogoUpload"
                />
              </div>
            </div>
          </div>
          
          <!-- Visitor Team -->
          <div>
            <h3 class="text-lg font-medium text-red-400 mb-3">Equipo Visitante</h3>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">
                  Nombre del Equipo
                </label>
                <input
                  v-model="visitorTeam.name"
                  type="text"
                  class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="Nombre del equipo visitante"
                />
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">
                  Color del Equipo
                </label>
                <input
                  v-model="visitorTeam.color"
                  type="color"
                  class="w-full h-10 bg-gray-700 border border-gray-600 rounded-lg"
                />
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">
                  Logo del Equipo
                </label>
                <ImageUpload
                  v-model="visitorTeam.logo"
                  label="logo del equipo visitante"
                  @file-selected="handleVisitorLogoUpload"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- League Logo Section -->
      <div class="mb-8 bg-gray-800 rounded-lg p-6">
        <h2 class="text-xl font-semibold mb-4 text-white">Logo de Liga</h2>
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">
            Logo de la Liga
          </label>
          <ImageUpload
            v-model="leagueLogo"
            label="logo de la liga"
            @file-selected="handleLeagueLogoUpload"
          />
        </div>
      </div>

      <!-- Actions -->
      <div class="flex justify-center space-x-4">
        <button
          @click="saveSettings"
          class="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg transition-colors font-medium"
        >
          💾 Guardar Configuración
        </button>
        
        <button
          @click="resetSettings"
          class="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg transition-colors font-medium"
        >
          🔄 Restablecer
        </button>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useScoreboardStore } from '@/stores/scoreboard'
import ImageUpload from '@/components/common/ImageUpload.vue'
import type { GameSettings } from '@/types/game.types'

const scoreboardStore = useScoreboardStore()

// Settings reactive data
const settings = ref<GameSettings>({
  maxSets: 5,
  pointsToWin: 25,
  minAdvantage: 2,
  decidingSetPoints: 15,
  enableRotation: false,
  enablePlayerNames: false
})

const localTeam = ref({
  name: 'Equipo Local',
  color: '#3b82f6',
  logo: undefined as string | undefined
})

const visitorTeam = ref({
  name: 'Equipo Visitante',
  color: '#ef4444',
  logo: undefined as string | undefined
})

const leagueLogo = ref<string | undefined>(undefined)

const loadSettings = () => {
  const savedSettings = localStorage.getItem('volleyball-settings')
  if (savedSettings) {
    try {
      const parsed = JSON.parse(savedSettings)
      
      // Load game settings
      if (parsed.maxSets !== undefined) settings.value.maxSets = parsed.maxSets
      if (parsed.pointsToWin !== undefined) settings.value.pointsToWin = parsed.pointsToWin
      if (parsed.minAdvantage !== undefined) settings.value.minAdvantage = parsed.minAdvantage
      if (parsed.decidingSetPoints !== undefined) settings.value.decidingSetPoints = parsed.decidingSetPoints
      if (parsed.enableRotation !== undefined) settings.value.enableRotation = parsed.enableRotation
      if (parsed.enablePlayerNames !== undefined) settings.value.enablePlayerNames = parsed.enablePlayerNames
      
      // Load team settings
      if (parsed.localTeam) {
        localTeam.value.name = parsed.localTeam.name || 'Equipo Local'
        localTeam.value.color = parsed.localTeam.color || '#3b82f6'
        localTeam.value.logo = parsed.localTeam.logo
      }
      
      if (parsed.visitorTeam) {
        visitorTeam.value.name = parsed.visitorTeam.name || 'Equipo Visitante'
        visitorTeam.value.color = parsed.visitorTeam.color || '#ef4444'
        visitorTeam.value.logo = parsed.visitorTeam.logo
      }
      
      // Load league logo
      if (parsed.leagueLogo) {
        leagueLogo.value = parsed.leagueLogo
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    }
  }
}

// Load current settings
onMounted(() => {
  loadSettings()
})

const handleLocalLogoUpload = (file: File) => {
  const reader = new FileReader()
  reader.onload = (e) => {
    if (e.target?.result) {
      localTeam.value.logo = e.target.result as string
      scoreboardStore.updateTeamLogo('local', e.target.result as string)
    }
  }
  reader.readAsDataURL(file)
}

const handleVisitorLogoUpload = (file: File) => {
  const reader = new FileReader()
  reader.onload = (e) => {
    if (e.target?.result) {
      visitorTeam.value.logo = e.target.result as string
      scoreboardStore.updateTeamLogo('visitor', e.target.result as string)
    }
  }
  reader.readAsDataURL(file)
}

const handleLeagueLogoUpload = (file: File) => {
  const reader = new FileReader()
  reader.onload = (e) => {
    if (e.target?.result) {
      leagueLogo.value = e.target.result as string
      scoreboardStore.updateLeagueLogo(e.target.result as string)
    }
  }
  reader.readAsDataURL(file)
}

const saveSettings = () => {
  // Save game settings
  scoreboardStore.updateGameSettings(settings.value)
  
  // Update team names and colors
  scoreboardStore.updateTeamName('local', localTeam.value.name)
  scoreboardStore.updateTeamName('visitor', visitorTeam.value.name)
  scoreboardStore.updateTeamColor('local', localTeam.value.color)
  scoreboardStore.updateTeamColor('visitor', visitorTeam.value.color)
  
  // Save to localStorage
  localStorage.setItem('volleyball-settings', JSON.stringify({
    ...settings.value,
    localTeam: localTeam.value,
    visitorTeam: visitorTeam.value,
    leagueLogo: leagueLogo.value
  }))
  
  alert('Configuración guardada exitosamente')
}

const resetSettings = () => {
  if (confirm('¿Estás seguro de que quieres restablecer toda la configuración?')) {
    settings.value = {
      maxSets: 5,
      pointsToWin: 25,
      minAdvantage: 2,
      decidingSetPoints: 15,
      enableRotation: false,
      enablePlayerNames: false
    }
    
    localTeam.value = {
      name: 'Equipo Local',
      color: '#3b82f6',
      logo: undefined
    }
    
    visitorTeam.value = {
    name: 'Equipo Visitante',
    color: '#ef4444',
    logo: undefined
  }
  
  leagueLogo.value = undefined
  
  localStorage.removeItem('volleyball-settings')
  alert('Configuración restablecida')
  }
}
</script>