import type { CompletedSet, StatisticEvent, TeamSide } from '@/types/game.types'

/** Jugadora tal como la conoce el roster del partido (para poner nombre a un dorsal). */
export interface RosterEntry {
  number: string | number
  name: string
  isLibero?: boolean
  active?: boolean
}

export type SetFilter = number | 'all'

export interface PlayerStatLine {
  playerNumber: string
  name: string
  isLibero: boolean
  /** Ataques punto + bloqueos punto + aces. */
  points: number
  attackPoints: number
  blockPoints: number
  aces: number
  blockTouches: number
  /** Errores propios que dieron punto al rival (ataque + saque + recepción). */
  errors: number
  attackErrors: number
  serveErrors: number
  receptionErrors: number
  positiveReceptions: number
  negativeReceptions: number
  digs: number
  /** Puntos menos errores. */
  balance: number
  /** Ataques punto sobre ataques punto + errores de ataque; null si no hubo ninguno. */
  attackPct: number | null
  /** Recepciones positivas sobre positivas + negativas + errores de recepción; null si no hubo ninguna. */
  receptionPct: number | null
}

export type SortKey = keyof Pick<
  PlayerStatLine,
  | 'playerNumber'
  | 'points'
  | 'attackPoints'
  | 'blockPoints'
  | 'aces'
  | 'blockTouches'
  | 'errors'
  | 'attackErrors'
  | 'serveErrors'
  | 'receptionErrors'
  | 'positiveReceptions'
  | 'negativeReceptions'
  | 'digs'
  | 'balance'
  | 'attackPct'
  | 'receptionPct'
>

const percent = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : null)

const emptyLine = (playerNumber: string, roster: Map<string, RosterEntry>): PlayerStatLine => {
  const entry = roster.get(playerNumber)
  return {
    playerNumber,
    name: entry?.name ?? '',
    isLibero: entry?.isLibero ?? false,
    points: 0,
    attackPoints: 0,
    blockPoints: 0,
    aces: 0,
    blockTouches: 0,
    errors: 0,
    attackErrors: 0,
    serveErrors: 0,
    receptionErrors: 0,
    positiveReceptions: 0,
    negativeReceptions: 0,
    digs: 0,
    balance: 0,
    attackPct: null,
    receptionPct: null,
  }
}

const rosterMap = (roster: RosterEntry[]) => {
  const map = new Map<string, RosterEntry>()
  for (const entry of roster) map.set(String(entry.number), entry)
  return map
}

const inSet = (event: StatisticEvent, set: SetFilter) => set === 'all' || event.set === set

export const compareDefault = (a: PlayerStatLine, b: PlayerStatLine) =>
  b.points - a.points || b.balance - a.balance || Number(a.playerNumber) - Number(b.playerNumber)

/**
 * Una línea por jugadora a partir del log de eventos. Solo cuentan los eventos atribuidos a una jugadora.
 * Con `includeRoster`, las jugadoras activas del roster sin eventos aparecen con ceros (útil en reportes).
 */
export const buildPlayerLines = (
  events: StatisticEvent[],
  team: TeamSide,
  roster: RosterEntry[] = [],
  set: SetFilter = 'all',
  includeRoster = false,
): PlayerStatLine[] => {
  const names = rosterMap(roster)
  const lines = new Map<string, PlayerStatLine>()
  const lineFor = (number: string) => {
    let line = lines.get(number)
    if (!line) {
      line = emptyLine(number, names)
      lines.set(number, line)
    }
    return line
  }

  if (includeRoster) {
    for (const entry of roster) {
      if (entry.active !== false) lineFor(String(entry.number))
    }
  }

  for (const event of events) {
    if (event.team !== team || !event.playerNumber || !inSet(event, set)) continue
    const line = lineFor(String(event.playerNumber))
    switch (event.type) {
      case 'attack':
        line.attackPoints += 1
        break
      case 'block':
        line.blockPoints += 1
        break
      case 'ace':
        line.aces += 1
        break
      case 'block_touch':
        line.blockTouches += 1
        break
      case 'attack_error':
        line.attackErrors += 1
        break
      case 'serve_error':
        line.serveErrors += 1
        break
      case 'reception_error':
        line.receptionErrors += 1
        break
      case 'positive_reception':
        line.positiveReceptions += 1
        break
      case 'negative_reception':
        line.negativeReceptions += 1
        break
      case 'dig':
        line.digs += 1
        break
    }
  }

  for (const line of lines.values()) {
    line.points = line.attackPoints + line.blockPoints + line.aces
    line.errors = line.attackErrors + line.serveErrors + line.receptionErrors
    line.balance = line.points - line.errors
    line.attackPct = percent(line.attackPoints, line.attackPoints + line.attackErrors)
    line.receptionPct = percent(
      line.positiveReceptions,
      line.positiveReceptions + line.negativeReceptions + line.receptionErrors,
    )
  }

  return Array.from(lines.values()).sort(compareDefault)
}

/** Ordena por una columna; los nulos van siempre al final. */
export const sortLines = (lines: PlayerStatLine[], key: SortKey, direction: 'asc' | 'desc') => {
  const factor = direction === 'asc' ? 1 : -1
  return [...lines].sort((a, b) => {
    const left = key === 'playerNumber' ? Number(a.playerNumber) : a[key]
    const right = key === 'playerNumber' ? Number(b.playerNumber) : b[key]
    if (left === null && right === null) return compareDefault(a, b)
    if (left === null) return 1
    if (right === null) return -1
    return (left - right) * factor || compareDefault(a, b)
  })
}

export interface TeamTotals {
  points: number
  attackPoints: number
  blockPoints: number
  aces: number
  errors: number
  digs: number
}

export const sumLines = (lines: PlayerStatLine[]): TeamTotals =>
  lines.reduce<TeamTotals>(
    (total, line) => ({
      points: total.points + line.points,
      attackPoints: total.attackPoints + line.attackPoints,
      blockPoints: total.blockPoints + line.blockPoints,
      aces: total.aces + line.aces,
      errors: total.errors + line.errors,
      digs: total.digs + line.digs,
    }),
    { points: 0, attackPoints: 0, blockPoints: 0, aces: 0, errors: 0, digs: 0 },
  )

export interface UnattributedPoints {
  /** Puntos sumados con "+1 sin clasificar" que aún no se clasifican. */
  pending: number
  /** Ataques, bloqueos o aces clasificados pero sin jugadora. */
  withoutPlayer: number
}

export const countUnattributed = (
  events: StatisticEvent[],
  team: TeamSide,
  set: SetFilter = 'all',
): UnattributedPoints => {
  const result: UnattributedPoints = { pending: 0, withoutPlayer: 0 }
  for (const event of events) {
    if (event.team !== team || !inSet(event, set)) continue
    if (event.type === 'manual') result.pending += 1
    else if ((event.type === 'attack' || event.type === 'block' || event.type === 'ace') && !event.playerNumber) {
      result.withoutPlayer += 1
    }
  }
  return result
}

export interface Leader {
  playerNumber: string
  name: string
  value: number
  /** Cuántas jugadoras más comparten el mismo valor. */
  tiedWith: number
}

export interface TeamLeaders {
  points: Leader | null
  attackPoints: Leader | null
  blockPoints: Leader | null
  aces: Leader | null
  digs: Leader | null
  errors: Leader | null
}

const leaderBy = (lines: PlayerStatLine[], pick: (line: PlayerStatLine) => number): Leader | null => {
  let best = 0
  for (const line of lines) best = Math.max(best, pick(line))
  if (best <= 0) return null
  const top = lines.filter((line) => pick(line) === best)
  const first = [...top].sort(compareDefault)[0]
  return { playerNumber: first.playerNumber, name: first.name, value: best, tiedWith: top.length - 1 }
}

export const buildLeaders = (lines: PlayerStatLine[]): TeamLeaders => ({
  points: leaderBy(lines, (line) => line.points),
  attackPoints: leaderBy(lines, (line) => line.attackPoints),
  blockPoints: leaderBy(lines, (line) => line.blockPoints),
  aces: leaderBy(lines, (line) => line.aces),
  digs: leaderBy(lines, (line) => line.digs),
  errors: leaderBy(lines, (line) => line.errors),
})

// ─── Exportación ──────────────────────────────────────────────────────────

const csvCell = (value: string | number | null) => {
  const text = value === null ? '' : String(value)
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export interface CsvTeam {
  shortCode: string
  name: string
  lines: PlayerStatLine[]
}

/** CSV con BOM para que Excel respete los acentos. */
export const buildPlayersCsv = (teams: CsvTeam[], setLabel: string) => {
  const header = [
    'Equipo',
    'Set',
    'Dorsal',
    'Nombre',
    'Puntos',
    'Ataque',
    'Bloqueo',
    'Ace',
    'Err. ataque',
    'Err. saque',
    'Err. recepción',
    'Balance',
    'Ataque %',
    'Recep. +',
    'Recep. −',
    'Recep. %',
    'Defensas',
    'Bloq. tocado',
  ]
  const rows = teams.flatMap((team) =>
    team.lines.map((line) => [
      team.shortCode,
      setLabel,
      line.playerNumber,
      line.name,
      line.points,
      line.attackPoints,
      line.blockPoints,
      line.aces,
      line.attackErrors,
      line.serveErrors,
      line.receptionErrors,
      line.balance,
      line.attackPct,
      line.positiveReceptions,
      line.negativeReceptions,
      line.receptionPct,
      line.digs,
      line.blockTouches,
    ]),
  )
  return '﻿' + [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')
}

export interface SummaryTeam {
  shortCode: string
  name: string
  sets: number
  leaders: TeamLeaders
}

// En un empate no se señala a nadie: cualquier elección sería arbitraria.
const describeLeader = (leader: Leader | null, unit: string) => {
  if (!leader) return null
  if (leader.tiedWith > 0) return `${leader.value} ${unit} (${leader.tiedWith + 1} empatadas)`
  const name = leader.name ? ` ${leader.name.split(' ').slice(0, 2).join(' ')}` : ''
  return `#${leader.playerNumber}${name} (${leader.value} ${unit})`
}

/** Resumen corto en texto plano, pensado para pegar en WhatsApp. */
export const buildShareSummary = (input: {
  tournament?: string
  phase?: string
  local: SummaryTeam
  visitor: SummaryTeam
  completedSets: CompletedSet[]
  finished: boolean
}) => {
  const { local, visitor } = input
  const lines: string[] = []
  const header = [input.tournament, input.phase].filter(Boolean).join(' · ')
  if (header) lines.push(`🏐 ${header}`)
  lines.push(
    `${input.finished ? 'Final' : 'Parcial'}: ${local.name} ${local.sets} - ${visitor.sets} ${visitor.name}`,
  )
  if (input.completedSets.length) {
    lines.push(`Sets: ${input.completedSets.map((set) => `${set.local}-${set.visitor}`).join(', ')}`)
  }
  for (const team of [local, visitor]) {
    const parts = [
      describeLeader(team.leaders.points, 'pts'),
      describeLeader(team.leaders.blockPoints, 'bloqueos'),
      describeLeader(team.leaders.aces, 'aces'),
    ].filter((part): part is string => part !== null)
    if (parts.length) {
      lines.push('', `${team.shortCode}: ${parts.join(' · ')}`)
    }
  }
  return lines.join('\n')
}
