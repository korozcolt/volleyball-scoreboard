import { DEFAULT_BROADCAST_CONFIG, STORAGE_KEYS, SYNC_CHANNELS } from '@/utils/constants'
import type { BroadcastConfig, TeamSide } from '@/types/game.types'
import { computed, ref, watch } from 'vue'
import { createScopedLocalSyncAdapter, type SyncAdapter } from '@/services/syncService'
import { defineStore } from 'pinia'
import { libraryApi } from '@/services/libraryApi'

const cloneConfig = (config: BroadcastConfig): BroadcastConfig => JSON.parse(JSON.stringify(config))

export const useBroadcastConfigStore = defineStore('broadcastConfig', () => {
  const config = ref<BroadcastConfig>(cloneConfig(DEFAULT_BROADCAST_CONFIG))
  const isLoaded = ref(false)
  const activeMatchId = ref<string | null>(null)
  let sync: SyncAdapter<BroadcastConfig> = createScopedLocalSyncAdapter<BroadcastConfig>(
    SYNC_CHANNELS.BROADCAST_CONFIG,
    STORAGE_KEYS.BROADCAST_CONFIG,
  )
  let unsubscribeSync: (() => void) | undefined
  let persistTimer: number | undefined
  let isApplyingRemoteState = false

  const hydrate = () => {
    const stored = sync.read()
    config.value = {
      ...cloneConfig(DEFAULT_BROADCAST_CONFIG),
      ...stored,
      teams: {
        local: {
          ...DEFAULT_BROADCAST_CONFIG.teams.local,
          ...stored?.teams.local,
        },
        visitor: {
          ...DEFAULT_BROADCAST_CONFIG.teams.visitor,
          ...stored?.teams.visitor,
        },
      },
    }
    isLoaded.value = true
  }

  const persistSessionConfig = () => {
    if (!activeMatchId.value || typeof window === 'undefined') return
    if (persistTimer) window.clearTimeout(persistTimer)
    persistTimer = window.setTimeout(() => {
      libraryApi.updateMatchSession(activeMatchId.value!, { config: cloneConfig(config.value) }).catch(() => undefined)
    }, 450)
  }

  const publish = () => {
    if (isLoaded.value && !isApplyingRemoteState) {
      sync.publish(cloneConfig(config.value))
      persistSessionConfig()
    }
  }

  const subscribe = () => {
    unsubscribeSync?.()
    unsubscribeSync = sync.subscribe((payload) => {
      if (!isLoaded.value) return
      isApplyingRemoteState = true
      config.value = cloneConfig(payload)
      setTimeout(() => {
        isApplyingRemoteState = false
      }, 0)
    })
  }

  const setMatchScope = async (matchId?: string, initialConfig?: BroadcastConfig) => {
    const nextScope = matchId ?? null
    if (activeMatchId.value === nextScope && isLoaded.value) return

    activeMatchId.value = nextScope
    sync = createScopedLocalSyncAdapter<BroadcastConfig>(
      SYNC_CHANNELS.BROADCAST_CONFIG,
      STORAGE_KEYS.BROADCAST_CONFIG,
      matchId,
    )

    const stored = sync.read()
    config.value = cloneConfig(initialConfig ?? stored ?? DEFAULT_BROADCAST_CONFIG)
    isLoaded.value = true
    subscribe()
    if (!stored && initialConfig) publish()
  }

  const updateTeam = (
    team: TeamSide,
    changes: Partial<BroadcastConfig['teams'][TeamSide]>,
  ) => {
    config.value.teams[team] = {
      ...config.value.teams[team],
      ...changes,
      shortCode: changes.shortCode
        ? changes.shortCode.toUpperCase().slice(0, 4)
        : config.value.teams[team].shortCode,
    }
  }

  const updateConfig = (changes: Partial<BroadcastConfig>) => {
    config.value = {
      ...config.value,
      ...changes,
      teams: {
        ...config.value.teams,
        ...changes.teams,
      },
    }
  }

  const resetConfig = () => {
    config.value = cloneConfig(DEFAULT_BROADCAST_CONFIG)
  }

  watch(config, publish, { deep: true })

  hydrate()
  subscribe()

  const teams = computed(() => config.value.teams)

  return {
    config,
    teams,
    isLoaded,
    activeMatchId,
    hydrate,
    setMatchScope,
    updateTeam,
    updateConfig,
    resetConfig,
    unsubscribe: () => unsubscribeSync?.(),
  }
})
