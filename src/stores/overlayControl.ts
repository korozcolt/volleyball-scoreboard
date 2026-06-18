import { STORAGE_KEYS, SYNC_CHANNELS } from '@/utils/constants'
import type { OverlayCommand, OverlayControlState, OverlayMode, TeamSide } from '@/types/game.types'
import { ref, watch } from 'vue'
import { createScopedLocalSyncAdapter, type SyncAdapter } from '@/services/syncService'
import { defineStore } from 'pinia'
import { libraryApi } from '@/services/libraryApi'

const defaultState: OverlayControlState = {
  activeOverlay: 'scoreboard',
  isLive: false,
  showHistory: false,
  lowerThirdVisible: false,
  lineupVisible: false,
}

const createCommandId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`
const cloneState = (state: OverlayControlState): OverlayControlState => JSON.parse(JSON.stringify(state))

export const useOverlayControlStore = defineStore('overlayControl', () => {
  const state = ref<OverlayControlState>(cloneState(defaultState))
  const isLoaded = ref(false)
  const activeMatchId = ref<string | null>(null)
  let sync: SyncAdapter<OverlayControlState> = createScopedLocalSyncAdapter<OverlayControlState>(
    SYNC_CHANNELS.OVERLAY_CONTROL,
    STORAGE_KEYS.OVERLAY_CONTROL,
  )
  let unsubscribeSync: (() => void) | undefined
  let persistTimer: number | undefined
  let isApplyingRemoteState = false

  const hydrate = () => {
    state.value = {
      ...cloneState(defaultState),
      ...sync.read(),
    }
    isLoaded.value = true
  }

  const persistSessionOverlay = () => {
    if (!activeMatchId.value || typeof window === 'undefined') return
    if (persistTimer) window.clearTimeout(persistTimer)
    persistTimer = window.setTimeout(() => {
      libraryApi.updateMatchSession(activeMatchId.value!, { overlay: cloneState(state.value) }).catch(() => undefined)
    }, 450)
  }

  const subscribe = () => {
    unsubscribeSync?.()
    unsubscribeSync = sync.subscribe((payload) => {
      if (!isLoaded.value) return
      isApplyingRemoteState = true
      state.value = cloneState(payload)
      setTimeout(() => {
        isApplyingRemoteState = false
      }, 0)
    })
  }

  const setMatchScope = (matchId?: string, initialState?: OverlayControlState) => {
    const nextScope = matchId ?? null
    if (activeMatchId.value === nextScope && isLoaded.value) return
    activeMatchId.value = nextScope
    sync = createScopedLocalSyncAdapter<OverlayControlState>(
      SYNC_CHANNELS.OVERLAY_CONTROL,
      STORAGE_KEYS.OVERLAY_CONTROL,
      matchId,
    )
    const stored = sync.read()
    state.value = cloneState(initialState ?? stored ?? defaultState)
    isLoaded.value = true
    subscribe()
    if (!stored && initialState) publish()
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

  const toggleLineup = (visible?: boolean) => {
    state.value.lineupVisible = visible !== undefined ? visible : !state.value.lineupVisible
  }

  const publish = () => {
    if (isLoaded.value && !isApplyingRemoteState) {
      sync.publish(cloneState(state.value))
      persistSessionOverlay()
    }
  }

  watch(state, publish, { deep: true })
  hydrate()
  subscribe()

  return {
    state,
    isLoaded,
    activeMatchId,
    hydrate,
    setMatchScope,
    sendCommand,
    setActiveOverlay,
    setLive,
    showTimeout,
    toggleLineup,
    unsubscribe: () => unsubscribeSync?.(),
  }
})
