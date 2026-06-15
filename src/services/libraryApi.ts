import type { BroadcastTeamConfig, GameState, StatisticsState, TeamProfile } from '@/types/game.types'

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
    const response = await fetch(team.id ? `/api/teams/${team.id}` : '/api/teams', {
      method: team.id ? 'PUT' : 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(team),
    })
    const payload = await readJson<{ team: TeamProfile }>(response)
    return payload.team
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

  async archiveMatch(snapshot: { gameState: GameState; statistics: StatisticsState }) {
    return readJson<{ id: string }>(
      await fetch('/api/matches', {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify(snapshot),
      }),
    )
  },
}
