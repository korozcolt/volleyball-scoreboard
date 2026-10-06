import { describe, expect, it } from 'vitest'
import type { StatisticEvent } from '@/types/game.types'
import {
  buildLeaders,
  buildPlayerLines,
  buildPlayersCsv,
  buildShareSummary,
  countUnattributed,
  sortLines,
  sumLines,
} from '@/utils/playerStats'

let counter = 0
const event = (
  team: 'local' | 'visitor',
  type: StatisticEvent['type'],
  playerNumber?: string,
  set = 1,
): StatisticEvent => ({
  id: `e${++counter}`,
  team,
  type,
  set,
  score: { local: 0, visitor: 0 },
  timestamp: counter,
  playerNumber,
})

const roster = [
  { number: '5', name: 'Sandra Valeria Zambrano' },
  { number: '7', name: 'Maria Monica Vergara', isLibero: true },
  { number: '9', name: 'Sin eventos' },
]

describe('buildPlayerLines', () => {
  const events = [
    event('local', 'attack', '5'),
    event('local', 'attack', '5'),
    event('local', 'block', '5'),
    event('local', 'ace', '5'),
    event('local', 'attack_error', '5'),
    event('local', 'serve_error', '5'),
    event('local', 'dig', '7'),
    event('local', 'positive_reception', '7'),
    event('local', 'positive_reception', '7'),
    event('local', 'negative_reception', '7'),
    event('local', 'reception_error', '7'),
    event('visitor', 'attack', '5'),
  ]

  it('suma por jugadora y no mezcla equipos', () => {
    const lines = buildPlayerLines(events, 'local', roster)
    const sandra = lines.find((line) => line.playerNumber === '5')!
    expect(sandra).toMatchObject({ attackPoints: 2, blockPoints: 1, aces: 1, points: 4, errors: 2, balance: 2 })
    expect(sandra.name).toBe('Sandra Valeria Zambrano')
    expect(lines.some((line) => line.playerNumber === '9')).toBe(false)
  })

  it('calcula porcentajes y deja null cuando no hay datos', () => {
    const lines = buildPlayerLines(events, 'local', roster)
    const sandra = lines.find((line) => line.playerNumber === '5')!
    const maria = lines.find((line) => line.playerNumber === '7')!
    expect(sandra.attackPct).toBe(67) // 2 / (2 + 1)
    expect(sandra.receptionPct).toBeNull()
    expect(maria.receptionPct).toBe(50) // 2 / (2 + 1 + 1)
    expect(maria.attackPct).toBeNull()
    expect(maria.isLibero).toBe(true)
  })

  it('con includeRoster muestra a las jugadoras activas sin eventos', () => {
    const lines = buildPlayerLines(events, 'local', roster, 'all', true)
    expect(lines.find((line) => line.playerNumber === '9')).toMatchObject({ points: 0, balance: 0 })
  })

  it('filtra por set', () => {
    const multi = [event('local', 'attack', '5', 1), event('local', 'attack', '5', 2), event('local', 'block', '5', 2)]
    expect(buildPlayerLines(multi, 'local', roster, 1)[0].points).toBe(1)
    expect(buildPlayerLines(multi, 'local', roster, 2)[0].points).toBe(2)
    expect(buildPlayerLines(multi, 'local', roster, 'all')[0].points).toBe(3)
  })

  it('ignora eventos sin jugadora', () => {
    expect(buildPlayerLines([event('local', 'attack')], 'local', roster)).toEqual([])
  })

  it('ordena por puntos, luego balance, luego dorsal', () => {
    const tied = [
      event('local', 'attack', '9'),
      event('local', 'attack', '5'),
      event('local', 'attack_error', '5'),
      event('local', 'attack', '3'),
    ]
    expect(buildPlayerLines(tied, 'local').map((line) => line.playerNumber)).toEqual(['3', '9', '5'])
  })
})

describe('sortLines', () => {
  const lines = buildPlayerLines(
    [event('local', 'attack', '5'), event('local', 'attack', '5'), event('local', 'attack', '9'), event('local', 'attack_error', '9')],
    'local',
  )

  it('ordena por columna en ambas direcciones y deja los nulos al final', () => {
    expect(sortLines(lines, 'attackPoints', 'asc').map((l) => l.playerNumber)).toEqual(['9', '5'])
    expect(sortLines(lines, 'attackPoints', 'desc').map((l) => l.playerNumber)).toEqual(['5', '9'])
    const withNull = buildPlayerLines([event('local', 'dig', '1'), event('local', 'attack', '2')], 'local')
    expect(sortLines(withNull, 'attackPct', 'desc').at(-1)!.playerNumber).toBe('1')
    expect(sortLines(withNull, 'attackPct', 'asc').at(-1)!.playerNumber).toBe('1')
  })
})

describe('countUnattributed y sumLines', () => {
  it('cuenta pendientes y puntos sin jugadora, por equipo y set', () => {
    const events = [
      event('local', 'manual'),
      event('local', 'manual', undefined, 2),
      event('local', 'attack'), // clasificado sin jugadora
      event('local', 'opponent_error'), // no cuenta: no es personal
      event('visitor', 'manual'),
    ]
    expect(countUnattributed(events, 'local')).toEqual({ pending: 2, withoutPlayer: 1 })
    expect(countUnattributed(events, 'local', 2)).toEqual({ pending: 1, withoutPlayer: 0 })
    expect(countUnattributed(events, 'visitor')).toEqual({ pending: 1, withoutPlayer: 0 })
  })

  it('suma los totales del equipo', () => {
    const lines = buildPlayerLines(
      [event('local', 'attack', '5'), event('local', 'block', '6'), event('local', 'serve_error', '5')],
      'local',
    )
    expect(sumLines(lines)).toMatchObject({ points: 2, attackPoints: 1, blockPoints: 1, errors: 1 })
  })
})

describe('buildLeaders', () => {
  it('devuelve el líder de cada categoría y avisa los empates', () => {
    const lines = buildPlayerLines(
      [
        event('local', 'attack', '5'),
        event('local', 'attack', '5'),
        event('local', 'ace', '9'),
        event('local', 'ace', '3'),
        event('local', 'serve_error', '3'),
      ],
      'local',
      roster,
    )
    const leaders = buildLeaders(lines)
    expect(leaders.points).toMatchObject({ playerNumber: '5', value: 2, tiedWith: 0, name: 'Sandra Valeria Zambrano' })
    // 9 y 3 empatan en aces; gana el de mejor balance (el 9, sin errores)
    expect(leaders.aces).toMatchObject({ playerNumber: '9', value: 1, tiedWith: 1 })
    expect(leaders.errors).toMatchObject({ playerNumber: '3', value: 1 })
    expect(leaders.blockPoints).toBeNull()
    expect(leaders.digs).toBeNull()
  })
})

describe('exportación', () => {
  const lines = buildPlayerLines([event('local', 'attack', '5'), event('local', 'attack_error', '5')], 'local', [
    { number: '5', name: 'Sandra "La Pantera", Z' },
  ])
  const roster2 = [{ number: '5', name: 'Sandra Valeria Zambrano' }]

  it('CSV con BOM, comillas escapadas y valores vacíos para porcentajes nulos', () => {
    const csv = buildPlayersCsv([{ shortCode: 'SUC', name: 'Sucre', lines }], 'Todos')
    expect(csv.startsWith('﻿Equipo,Set,Dorsal,Nombre')).toBe(true)
    const row = csv.split('\r\n')[1]
    expect(row).toContain('"Sandra ""La Pantera"", Z"')
    expect(row.startsWith('SUC,Todos,5,')).toBe(true)
    expect(row.endsWith(',0,0,,0,0')).toBe(true) // recep. + / − en 0, recep. % vacío, defensas y bloqueos tocados en 0
  })

  it('resumen para compartir con marcador, sets y líderes', () => {
    const leaders = buildLeaders(buildPlayerLines([event('local', 'attack', '5')], 'local', roster2))
    const text = buildShareSummary({
      tournament: 'II Nacional U13',
      phase: 'Fase de grupos',
      local: { shortCode: 'SUC', name: 'Sucre', sets: 1, leaders },
      visitor: { shortCode: 'RIS', name: 'Risaralda', sets: 2, leaders: buildLeaders([]) },
      completedSets: [
        { setNumber: 1, local: 20, visitor: 25, winner: 'visitor', finishedAt: 0 },
        { setNumber: 2, local: 25, visitor: 19, winner: 'local', finishedAt: 0 },
        { setNumber: 3, local: 22, visitor: 25, winner: 'visitor', finishedAt: 0 },
      ],
      finished: true,
    })
    expect(text).toContain('Final: Sucre 1 - 2 Risaralda')
    expect(text).toContain('Sets: 20-25, 25-19, 22-25')
    expect(text).toContain('SUC: #5 Sandra Valeria (1 pts)') // nombre recortado a dos palabras
    expect(text).not.toContain('RIS:') // sin líderes no se imprime la línea
  })

  it('en un empate dice cuántas empatan en lugar de señalar a una jugadora', () => {
    const tied = buildLeaders(
      buildPlayerLines([event('local', 'block', '5'), event('local', 'block', '7'), event('local', 'block', '9')], 'local', roster),
    )
    const text = buildShareSummary({
      local: { shortCode: 'SUC', name: 'Sucre', sets: 0, leaders: tied },
      visitor: { shortCode: 'RIS', name: 'Risaralda', sets: 0, leaders: buildLeaders([]) },
      completedSets: [],
      finished: false,
    })
    expect(text).toContain('1 bloqueos (3 empatadas)')
    expect(text).not.toContain('#5')
  })
})
