import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { libraryApi } from '@/services/libraryApi'
import { STORAGE_KEYS } from '@/utils/constants'
import { useBroadcastConfigStore } from '@/stores/broadcastConfig'
import { useMatchStore } from '@/stores/match'
import { useOverlayControlStore } from '@/stores/overlayControl'
import { useStatisticsStore } from '@/stores/statistics'

export const useMatchScope = () => {
  const route = useRoute()
  const router = useRouter()
  const match = useMatchStore()
  const broadcast = useBroadcastConfigStore()
  const overlay = useOverlayControlStore()
  const statistics = useStatisticsStore()
  const isLoadingSession = ref(false)
  const sessionError = ref('')

  const matchId = computed(() => {
    const param = route.params.matchId
    return Array.isArray(param) ? param[0] : param
  })

  const activateScope = async () => {
    if (!matchId.value) {
      await router.replace('/matches')
      return
    }

    isLoadingSession.value = true
    sessionError.value = ''

    try {
      const session = await libraryApi.getMatchSession(matchId.value)
      localStorage.setItem(STORAGE_KEYS.LAST_MATCH_ID, session.id)
      broadcast.setMatchScope(session.id, session.config)
      overlay.setMatchScope(session.id, session.overlay)
      statistics.setMatchScope(session.id, session.statistics)
      match.setMatchScope(session.id, session.state, broadcast.config)
    } catch (error) {
      sessionError.value = (error as Error).message
      broadcast.setMatchScope(matchId.value)
      overlay.setMatchScope(matchId.value)
      statistics.setMatchScope(matchId.value)
      match.setMatchScope(matchId.value)
    } finally {
      isLoadingSession.value = false
    }
  }

  onMounted(activateScope)
  watch(matchId, activateScope)

  return {
    matchId,
    isLoadingSession,
    sessionError,
    activateScope,
  }
}
