import type {
  BroadcastConfig,
  BroadcastTeamConfig,
  GameState,
  MatchSession,
  OverlayControlState,
  StatisticsState,
  TeamPlayer,
  TeamProfile,
} from '@/types/game.types'

const jsonHeaders = {
  'content-type': 'application/json',
}

const readJson = async <T>(response: Response): Promise<T> => {
  const payload = await response.json()
  if (!response.ok) throw new Error(payload.error ?? 'No se pudo completar la solicitud.')
  return payload as T
}

export const libraryApi = {
  async listTeams() {
    const payload = await readJson<{ teams: TeamProfile[] }>(await fetch('/api/teams'))
    return payload.teams
  },

  async saveTeam(team: Partial<TeamProfile> & BroadcastTeamConfig) {
    const response = team.id
      ? await fetch(`/api/teams/${team.id}`, {
          method: 'PUT',
          headers: jsonHeaders,
          body: JSON.stringify(team),
        })
      : await fetch('/api/teams', {
          method: 'POST',
          headers: jsonHeaders,
          body: JSON.stringify(team),
        })
    const payload = await readJson<{ team: TeamProfile }>(response)
    return payload.team
  },

  async listPlayers(teamId: string) {
    const payload = await readJson<{ players: TeamPlayer[] }>(
      await fetch(`/api/teams/${teamId}/players`),
    )
    return payload.players
  },

  async savePlayer(teamId: string, player: Partial<TeamPlayer> & { number: string | number; name: string }) {
    const response = player.id
      ? await fetch(`/api/teams/${teamId}/players/${player.id}`, {
          method: 'PATCH',
          headers: jsonHeaders,
          body: JSON.stringify(player),
        })
      : await fetch(`/api/teams/${teamId}/players`, {
          method: 'POST',
          headers: jsonHeaders,
          body: JSON.stringify(player),
        })
    const payload = await readJson<{ player: TeamPlayer }>(response)
    return payload.player
  },

  async deletePlayer(teamId: string, playerId: string) {
    await readJson<{ ok: true }>(
      await fetch(`/api/teams/${teamId}/players/${playerId}`, {
        method: 'DELETE',
      }),
    )
  },

  async listMatchSessions() {
    const payload = await readJson<{ sessions: MatchSession[] }>(await fetch('/api/match-sessions'))
    return payload.sessions
  },

  async getMatchSession(matchId: string) {
    const payload = await readJson<{ session: MatchSession }>(
      await fetch(`/api/match-sessions/${matchId}`),
    )
    return payload.session
  },

  async createMatchSession(payload: {
    format: 1 | 3 | 5
    localTeamProfileId?: string
    visitorTeamProfileId?: string
    title?: string
    state?: GameState
    config?: BroadcastConfig
    statistics?: StatisticsState
    overlay?: OverlayControlState
  }) {
    const response = await fetch('/api/match-sessions', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    })
    const body = await readJson<{ session: MatchSession }>(response)
    return body.session
  },

  async updateMatchSession(
    matchId: string,
    payload: Partial<Pick<MatchSession, 'status' | 'state' | 'config' | 'statistics' | 'overlay' | 'title'>>,
  ) {
    const response = await fetch(`/api/match-sessions/${matchId}`, {
      method: 'PATCH',
      headers: jsonHeaders,
      body: JSON.stringify(payload),
      keepalive: true,
    })
    const body = await readJson<{ session: MatchSession }>(response)
    return body.session
  },

  async uploadLogo(file: File) {
    const formData = new FormData()
    formData.append('file', file)

    const payload = await readJson<{
      url: string
      originalName: string
      mimeType: string
      size: number
    }>(
      await fetch('/api/assets/logos', {
        method: 'POST',
        body: formData,
      }),
    )

    return payload
  },

  async archiveMatch(snapshot: { matchId?: string; gameState: GameState; statistics: StatisticsState }) {
    return readJson<{ id: string }>(
      await fetch('/api/matches', {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify(snapshot),
      }),
    )
  },
}
