import { STORAGE_KEYS, SYNC_CHANNELS } from '@/utils/constants'
import type { OverlayCommand, OverlayControlState, OverlayMode, TeamSide } from '@/types/game.types'
import { ref, watch } from 'vue'
import { createLocalSyncAdapter } from '@/services/syncService'
import { defineStore } from 'pinia'

const defaultState: OverlayControlState = {
  activeOverlay: 'scoreboard',
  isLive: false,
  showHistory: false,
  lowerThirdVisible: false,
}

const sync = createLocalSyncAdapter<OverlayControlState>(
  SYNC_CHANNELS.OVERLAY_CONTROL,
  STORAGE_KEYS.OVERLAY_CONTROL,
)

const createCommandId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`
const cloneState = (state: OverlayControlState): OverlayControlState => JSON.parse(JSON.stringify(state))

export const useOverlayControlStore = defineStore('overlayControl', () => {
  const state = ref<OverlayControlState>(cloneState(defaultState))
  const isLoaded = ref(false)
  let isApplyingRemoteState = false

  const hydrate = () => {
    state.value = {
      ...cloneState(defaultState),
      ...sync.read(),
    }
    isLoaded.value = true
  }

  const sendCommand = (command: Omit<OverlayCommand, 'id' | 'createdAt'>) => {
    state.value.lastCommand = {
      id: createCommandId(),
      createdAt: Date.now(),
      ...command,
    }

    if (command.type === 'switch_overlay' && command.overlayMode) {
      state.value.activeOverlay = command.overlayMode
    }

    if (command.type === 'show_history') {
      state.value.activeOverlay = 'history'
      state.value.showHistory = true
    }

    if (command.type === 'hide_history') {
      state.value.activeOverlay = 'scoreboard'
      state.value.showHistory = false
    }
  }

  const setActiveOverlay = (overlayMode: OverlayMode) => {
    sendCommand({ type: 'switch_overlay', overlayMode })
  }

  const setLive = (isLive: boolean) => {
    state.value.isLive = isLive
    sendCommand({ type: 'go_live', message: isLive ? 'Transmisión en vivo' : 'Transmisión detenida' })
  }

  const showTimeout = (team: TeamSide) => {
    sendCommand({ type: 'show_timeout', team, durationMs: 30000 })
  }

  const publish = () => {
    if (isLoaded.value && !isApplyingRemoteState) sync.publish(cloneState(state.value))
  }

  const unsubscribe = sync.subscribe((payload) => {
    if (!isLoaded.value) return
    isApplyingRemoteState = true
    state.value = cloneState(payload)
    setTimeout(() => {
      isApplyingRemoteState = false
    }, 0)
  })

  watch(state, publish, { deep: true })
  hydrate()

  return {
    state,
    isLoaded,
    hydrate,
    sendCommand,
    setActiveOverlay,
    setLive,
    showTimeout,
    unsubscribe,
  }
})
