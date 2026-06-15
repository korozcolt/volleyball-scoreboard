import { DEFAULT_BROADCAST_CONFIG, STORAGE_KEYS, SYNC_CHANNELS } from '@/utils/constants'
import type { BroadcastConfig, TeamSide } from '@/types/game.types'
import { computed, ref, watch } from 'vue'
import { createLocalSyncAdapter } from '@/services/syncService'
import { defineStore } from 'pinia'

const sync = createLocalSyncAdapter<BroadcastConfig>(
  SYNC_CHANNELS.BROADCAST_CONFIG,
  STORAGE_KEYS.BROADCAST_CONFIG,
)

const cloneConfig = (config: BroadcastConfig): BroadcastConfig => JSON.parse(JSON.stringify(config))

export const useBroadcastConfigStore = defineStore('broadcastConfig', () => {
  const config = ref<BroadcastConfig>(cloneConfig(DEFAULT_BROADCAST_CONFIG))
  const isLoaded = ref(false)
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

  const publish = () => {
    if (isLoaded.value && !isApplyingRemoteState) sync.publish(cloneConfig(config.value))
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

  const unsubscribe = sync.subscribe((payload) => {
    if (!isLoaded.value) return
    isApplyingRemoteState = true
    config.value = cloneConfig(payload)
    setTimeout(() => {
      isApplyingRemoteState = false
    }, 0)
  })

  watch(config, publish, { deep: true })

  hydrate()

  const teams = computed(() => config.value.teams)

  return {
    config,
    teams,
    isLoaded,
    hydrate,
    updateTeam,
    updateConfig,
    resetConfig,
    unsubscribe,
  }
})
