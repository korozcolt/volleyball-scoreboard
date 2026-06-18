import { createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve } from 'node:path'
import { Readable } from 'node:stream'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'
import sharp from 'sharp'
import { WebSocketServer } from 'ws'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const rootDir = resolve(__dirname, '..')
const distDir = join(rootDir, 'dist')
const port = Number(process.env.PORT ?? 3000)
const dataDir = resolve(process.env.DATA_DIR ?? join(rootDir, 'data'))
const uploadDir = join(dataDir, 'uploads')
const logoDir = join(uploadDir, 'logos')
const dbPath = process.env.DATABASE_URL?.startsWith('file:')
  ? process.env.DATABASE_URL.replace(/^file:/, '')
  : join(dataDir, 'volleystream.sqlite')
const maxImageBytes = Number(process.env.MAX_IMAGE_MB ?? 3) * 1024 * 1024

mkdirSync(logoDir, { recursive: true })

const db = new Database(dbPath)
db.pragma('journal_mode = WAL')
db.exec(`
  CREATE TABLE IF NOT EXISTS team_profiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    short_code TEXT NOT NULL,
    primary_color TEXT NOT NULL,
    logo_url TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS match_archives (
    id TEXT PRIMARY KEY,
    match_id TEXT,
    tournament TEXT,
    phase TEXT,
    local_team TEXT,
    visitor_team TEXT,
    winner TEXT,
    final_score TEXT,
    snapshot TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS team_players (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL,
    number TEXT NOT NULL,
    name TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    is_libero INTEGER NOT NULL DEFAULT 0,
    role TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(team_id, number),
    FOREIGN KEY(team_id) REFERENCES team_profiles(id) ON DELETE CASCADE
  );
`)

// Run migrations
try {
  const tableInfo = db.prepare("PRAGMA table_info(team_players)").all()
  const numberColumn = tableInfo.find(c => c.name === 'number')
  if (numberColumn && numberColumn.type === 'INTEGER') {
    console.log('Migrating team_players number column to TEXT...')
    db.exec(`
      CREATE TABLE IF NOT EXISTS new_team_players (
        id TEXT PRIMARY KEY,
        team_id TEXT NOT NULL,
        number TEXT NOT NULL,
        name TEXT NOT NULL,
        active INTEGER NOT NULL DEFAULT 1,
        is_libero INTEGER NOT NULL DEFAULT 0,
        role TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        UNIQUE(team_id, number),
        FOREIGN KEY(team_id) REFERENCES team_profiles(id) ON DELETE CASCADE
      );
      INSERT OR IGNORE INTO new_team_players SELECT id, team_id, CAST(number AS TEXT), name, active, is_libero, role, created_at, updated_at FROM team_players;
      DROP TABLE team_players;
      ALTER TABLE new_team_players RENAME TO team_players;
    `)
    console.log('Migration completed.')
  }
} catch (e) {
  console.error('Migration failed:', e)
}

db.exec(`
  CREATE TABLE IF NOT EXISTS match_sessions (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    format INTEGER NOT NULL,
    local_team_profile_id TEXT,
    visitor_team_profile_id TEXT,
    title TEXT,
    state TEXT,
    config TEXT,
    statistics TEXT,
    overlay TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
`)

const tableColumns = (table) => db.prepare(`PRAGMA table_info(${table})`).all().map((column) => column.name)
if (!tableColumns('match_archives').includes('match_id')) {
  db.prepare('ALTER TABLE match_archives ADD COLUMN match_id TEXT').run()
}

const playerCols = tableColumns('team_players')
if (!playerCols.includes('is_libero')) {
  db.prepare('ALTER TABLE team_players ADD COLUMN is_libero INTEGER NOT NULL DEFAULT 0').run()
}
if (!playerCols.includes('role')) {
  db.prepare('ALTER TABLE team_players ADD COLUMN role TEXT').run()
}

const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
  ['.woff2', 'font/woff2'],
])

const createId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`

const sendJson = (response, status, payload) => {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify(payload))
}

const readJsonBody = async (request) => {
  const chunks = []
  for await (const chunk of request) chunks.push(chunk)
  if (!chunks.length) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

const toApiTeam = (row) => ({
  id: row.id,
  name: row.name,
  shortCode: row.short_code,
  primaryColor: row.primary_color,
  logoUrl: row.logo_url ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const toApiPlayer = (row) => ({
  id: row.id,
  teamId: row.team_id,
  number: row.number,
  name: row.name,
  active: Boolean(row.active),
  isLibero: Boolean(row.is_libero),
  role: row.role ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const readPlayers = (teamId) =>
  db
    .prepare('SELECT * FROM team_players WHERE team_id = ? ORDER BY number ASC')
    .all(teamId)
    .map(toApiPlayer)

const toApiSession = (row) => ({
  id: row.id,
  status: row.status,
  format: row.format,
  localTeamProfileId: row.local_team_profile_id ?? undefined,
  visitorTeamProfileId: row.visitor_team_profile_id ?? undefined,
  title: row.title ?? undefined,
  state: row.state ? JSON.parse(row.state) : undefined,
  config: row.config ? JSON.parse(row.config) : undefined,
  statistics: row.statistics ? JSON.parse(row.statistics) : undefined,
  overlay: row.overlay ? JSON.parse(row.overlay) : undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const upsertTeam = (team) => {
  const now = Date.now()
  let id = team.id
  if (!id) {
    const existing = db.prepare('SELECT id FROM team_profiles WHERE LOWER(name) = LOWER(?) AND LOWER(short_code) = LOWER(?)').get(String(team.name ?? '').trim(), String(team.shortCode ?? 'TBD').trim())
    id = existing ? existing.id : createId('team')
  }
  const payload = {
    id,
    name: String(team.name ?? '').trim() || 'Equipo sin nombre',
    shortCode: String(team.shortCode ?? 'TBD').trim().toUpperCase().slice(0, 4) || 'TBD',
    primaryColor: String(team.primaryColor ?? '#7bd0ff'),
    logoUrl: team.logoUrl ? String(team.logoUrl) : null,
    createdAt: team.createdAt ?? now,
    updatedAt: now,
  }

  db.prepare(`
    INSERT INTO team_profiles (id, name, short_code, primary_color, logo_url, created_at, updated_at)
    VALUES (@id, @name, @shortCode, @primaryColor, @logoUrl, @createdAt, @updatedAt)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      short_code = excluded.short_code,
      primary_color = excluded.primary_color,
      logo_url = excluded.logo_url,
      updated_at = excluded.updated_at
  `).run(payload)

  return payload
}

const upsertPlayer = (teamId, player) => {
  const team = db.prepare('SELECT id FROM team_profiles WHERE id = ?').get(teamId)
  if (!team) return null

  const now = Date.now()
  const id = player.id || createId('player')
  const payload = {
    id,
    teamId,
    number: Math.max(1, Math.min(99, Number(player.number) || 1)),
    name: String(player.name ?? '').trim() || `Jugador ${player.number ?? ''}`.trim(),
    active: player.active === false ? 0 : 1,
    isLibero: player.isLibero ? 1 : 0,
    role: player.role ? String(player.role) : null,
    createdAt: player.createdAt ?? now,
    updatedAt: now,
  }

  db.prepare(`
    INSERT INTO team_players (id, team_id, number, name, active, is_libero, role, created_at, updated_at)
    VALUES (@id, @teamId, @number, @name, @active, @isLibero, @role, @createdAt, @updatedAt)
    ON CONFLICT(team_id, number) DO UPDATE SET
      name = excluded.name,
      active = excluded.active,
      is_libero = excluded.is_libero,
      role = excluded.role,
      updated_at = excluded.updated_at
  `).run(payload)

  const row = db.prepare('SELECT * FROM team_players WHERE team_id = ? AND number = ?').get(teamId, payload.number)
  return toApiPlayer(row)
}

const upsertSession = (session) => {
  const now = Date.now()
  const id = session.id || createId('session')
  const current = session.id
    ? db.prepare('SELECT * FROM match_sessions WHERE id = ?').get(session.id)
    : null
  const payload = {
    id,
    status: session.status ?? current?.status ?? 'draft',
    format: Number(session.format ?? current?.format ?? 5),
    localTeamProfileId: session.localTeamProfileId ?? current?.local_team_profile_id ?? null,
    visitorTeamProfileId: session.visitorTeamProfileId ?? current?.visitor_team_profile_id ?? null,
    title: session.title ?? current?.title ?? null,
    state:
      session.state !== undefined
        ? JSON.stringify(session.state)
        : current?.state ?? null,
    config:
      session.config !== undefined
        ? JSON.stringify(session.config)
        : current?.config ?? null,
    statistics:
      session.statistics !== undefined
        ? JSON.stringify(session.statistics)
        : current?.statistics ?? null,
    overlay:
      session.overlay !== undefined
        ? JSON.stringify(session.overlay)
        : current?.overlay ?? null,
    createdAt: current?.created_at ?? session.createdAt ?? now,
    updatedAt: now,
  }

  db.prepare(`
    INSERT INTO match_sessions
      (id, status, format, local_team_profile_id, visitor_team_profile_id, title, state, config, statistics, overlay, created_at, updated_at)
    VALUES
      (@id, @status, @format, @localTeamProfileId, @visitorTeamProfileId, @title, @state, @config, @statistics, @overlay, @createdAt, @updatedAt)
    ON CONFLICT(id) DO UPDATE SET
      status = excluded.status,
      format = excluded.format,
      local_team_profile_id = excluded.local_team_profile_id,
      visitor_team_profile_id = excluded.visitor_team_profile_id,
      title = excluded.title,
      state = excluded.state,
      config = excluded.config,
      statistics = excluded.statistics,
      overlay = excluded.overlay,
      updated_at = excluded.updated_at
  `).run(payload)

  return toApiSession(db.prepare('SELECT * FROM match_sessions WHERE id = ?').get(id))
}

const resolveUploadPath = (pathname) => {
  const relativePath = normalize(pathname.replace(/^\/uploads\/?/, '')).replace(/^(\.\.[/\\])+/, '')
  const filePath = join(uploadDir, relativePath)
  return filePath.startsWith(uploadDir) ? filePath : null
}

const handleLogoUpload = async (request, response) => {
  const webRequest = new Request(`http://localhost${request.url}`, {
    method: 'POST',
    headers: request.headers,
    body: Readable.toWeb(request),
    duplex: 'half',
  })
  const formData = await webRequest.formData()
  const file = formData.get('file')

  if (!file || typeof file === 'string') {
    sendJson(response, 400, { error: 'Archivo no recibido.' })
    return
  }

  if (file.size > maxImageBytes) {
    sendJson(response, 413, { error: `La imagen supera el limite de ${process.env.MAX_IMAGE_MB ?? 3} MB.` })
    return
  }

  const input = Buffer.from(await file.arrayBuffer())
  const mimeType = file.type || 'application/octet-stream'
  const baseName = createId('logo')
  const isSvg = mimeType === 'image/svg+xml' || file.name?.toLowerCase().endsWith('.svg')
  const filename = isSvg ? `${baseName}.svg` : `${baseName}.webp`
  const filePath = join(logoDir, filename)

  if (isSvg) {
    writeFileSync(filePath, input)
  } else {
    await sharp(input)
      .resize({ width: 512, height: 512, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82, effort: 5 })
      .toFile(filePath)
  }

  const publicUrl = `/uploads/logos/${filename}`
  sendJson(response, 201, {
    url: publicUrl,
    originalName: file.name,
    mimeType: isSvg ? 'image/svg+xml' : 'image/webp',
    size: statSync(filePath).size,
  })
}

const handleApi = async (request, response, url) => {
  try {
    if (url.pathname === '/api/teams' && request.method === 'GET') {
      const rows = db
        .prepare('SELECT * FROM team_profiles ORDER BY updated_at DESC, name ASC')
        .all()
      sendJson(response, 200, {
        teams: rows.map((row) => ({
          ...toApiTeam(row),
          players: readPlayers(row.id),
        })),
      })
      return true
    }

    if (url.pathname === '/api/teams' && request.method === 'POST') {
      const team = upsertTeam(await readJsonBody(request))
      sendJson(response, 201, { team })
      return true
    }

    const teamMatch = url.pathname.match(/^\/api\/teams\/([^/]+)$/)
    if (teamMatch && request.method === 'PUT') {
      const current = db.prepare('SELECT * FROM team_profiles WHERE id = ?').get(teamMatch[1])
      if (!current) {
        sendJson(response, 404, { error: 'Equipo no encontrado.' })
        return true
      }
      const body = await readJsonBody(request)
      const team = upsertTeam({
        id: teamMatch[1],
        createdAt: current.created_at,
        ...body,
      })
      sendJson(response, 200, { team })
      return true
    }

    const playersMatch = url.pathname.match(/^\/api\/teams\/([^/]+)\/players$/)
    if (playersMatch && request.method === 'GET') {
      sendJson(response, 200, { players: readPlayers(playersMatch[1]) })
      return true
    }

    if (playersMatch && request.method === 'POST') {
      const player = upsertPlayer(playersMatch[1], await readJsonBody(request))
      if (!player) {
        sendJson(response, 404, { error: 'Equipo no encontrado.' })
        return true
      }
      sendJson(response, 201, { player })
      return true
    }

    const playerMatch = url.pathname.match(/^\/api\/teams\/([^/]+)\/players\/([^/]+)$/)
    if (playerMatch && request.method === 'PATCH') {
      const current = db
        .prepare('SELECT * FROM team_players WHERE team_id = ? AND id = ?')
        .get(playerMatch[1], playerMatch[2])
      if (!current) {
        sendJson(response, 404, { error: 'Jugador no encontrado.' })
        return true
      }
      const body = await readJsonBody(request)
      const player = upsertPlayer(playerMatch[1], {
        id: playerMatch[2],
        createdAt: current.created_at,
        number: body.number ?? current.number,
        name: body.name ?? current.name,
        active: body.active ?? Boolean(current.active),
        isLibero: body.isLibero ?? Boolean(current.is_libero),
        role: body.role !== undefined ? body.role : current.role,
      })
      sendJson(response, 200, { player })
      return true
    }

    if (playerMatch && request.method === 'DELETE') {
      db.prepare('DELETE FROM team_players WHERE team_id = ? AND id = ?').run(playerMatch[1], playerMatch[2])
      sendJson(response, 200, { ok: true })
      return true
    }

    if (url.pathname === '/api/match-sessions' && request.method === 'GET') {
      const rows = db
        .prepare('SELECT * FROM match_sessions ORDER BY updated_at DESC LIMIT 100')
        .all()
      sendJson(response, 200, { sessions: rows.map(toApiSession) })
      return true
    }

    if (url.pathname === '/api/match-sessions' && request.method === 'POST') {
      const session = upsertSession(await readJsonBody(request))
      sendJson(response, 201, { session })
      return true
    }

    const sessionMatch = url.pathname.match(/^\/api\/match-sessions\/([^/]+)$/)
    if (sessionMatch && request.method === 'GET') {
      const row = db.prepare('SELECT * FROM match_sessions WHERE id = ?').get(sessionMatch[1])
      if (!row) {
        sendJson(response, 404, { error: 'Partido no encontrado.' })
        return true
      }
      sendJson(response, 200, { session: toApiSession(row) })
      return true
    }

    if (sessionMatch && request.method === 'PATCH') {
      const row = db.prepare('SELECT * FROM match_sessions WHERE id = ?').get(sessionMatch[1])
      if (!row) {
        sendJson(response, 404, { error: 'Partido no encontrado.' })
        return true
      }
      const session = upsertSession({
        id: sessionMatch[1],
        ...await readJsonBody(request),
      })
      sendJson(response, 200, { session })
      return true
    }

    if (url.pathname === '/api/assets/logos' && request.method === 'POST') {
      await handleLogoUpload(request, response)
      return true
    }

    if (url.pathname === '/api/matches' && request.method === 'GET') {
      const rows = db
        .prepare('SELECT * FROM match_archives ORDER BY created_at DESC LIMIT 100')
        .all()
        .map((row) => ({
          id: row.id,
          tournament: row.tournament,
          phase: row.phase,
          localTeam: row.local_team,
          visitorTeam: row.visitor_team,
          winner: row.winner,
          finalScore: row.final_score,
          snapshot: JSON.parse(row.snapshot),
          createdAt: row.created_at,
        }))
      sendJson(response, 200, { matches: rows })
      return true
    }

    if (url.pathname === '/api/matches' && request.method === 'POST') {
      const snapshot = await readJsonBody(request)
      const id = createId('match')
      const gameState = snapshot.gameState ?? snapshot
      const winner =
        gameState?.gameFinished && gameState?.local?.sets !== gameState?.visitor?.sets
          ? gameState.local.sets > gameState.visitor.sets
            ? gameState.local.shortCode
            : gameState.visitor.shortCode
          : null

      db.prepare(`
        INSERT INTO match_archives
          (id, match_id, tournament, phase, local_team, visitor_team, winner, final_score, snapshot, created_at)
        VALUES
          (@id, @matchId, @tournament, @phase, @localTeam, @visitorTeam, @winner, @finalScore, @snapshot, @createdAt)
      `).run({
        id,
        matchId: snapshot.matchId ?? null,
        tournament: gameState?.metadata?.tournament ?? null,
        phase: gameState?.metadata?.phase ?? null,
        localTeam: gameState?.local?.name ?? null,
        visitorTeam: gameState?.visitor?.name ?? null,
        winner,
        finalScore:
          gameState?.local && gameState?.visitor
            ? `${gameState.local.sets}-${gameState.visitor.sets}`
            : null,
        snapshot: JSON.stringify(snapshot),
        createdAt: Date.now(),
      })
      if (snapshot.matchId) {
        upsertSession({
          id: snapshot.matchId,
          status: 'archived',
          state: gameState,
          statistics: snapshot.statistics,
        })
      }
      sendJson(response, 201, { id })
      return true
    }

    return false
  } catch (error) {
    console.error('API error:', error)
    sendJson(response, 500, { error: 'Error interno del servidor.' })
    return true
  }
}

const resolveStaticPath = (url) => {
  const pathname = decodeURIComponent(new URL(url, 'http://localhost').pathname)
  const requestedPath = normalize(pathname).replace(/^(\.\.[/\\])+/, '')
  const filePath = join(distDir, requestedPath)

  if (filePath.startsWith(distDir) && existsSync(filePath) && statSync(filePath).isFile()) {
    return filePath
  }

  return join(distDir, 'index.html')
}

const server = createServer(async (request, response) => {
  if (!existsSync(distDir)) {
    response.writeHead(503, { 'content-type': 'text/plain; charset=utf-8' })
    response.end('Build no encontrado. Ejecuta npm run build antes de iniciar producción.')
    return
  }

  const url = new URL(request.url ?? '/', 'http://localhost')

  if (url.pathname.startsWith('/api/')) {
    const handled = await handleApi(request, response, url)
    if (!handled) sendJson(response, 404, { error: 'Endpoint no encontrado.' })
    return
  }

  if (url.pathname.startsWith('/uploads/')) {
    const filePath = resolveUploadPath(url.pathname)
    if (!filePath || !existsSync(filePath) || !statSync(filePath).isFile()) {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
      response.end('Asset no encontrado.')
      return
    }

    response.writeHead(200, {
      'cache-control': 'public, max-age=31536000, immutable',
      'content-type': mimeTypes.get(extname(filePath)) ?? 'application/octet-stream',
    })
    createReadStream(filePath).pipe(response)
    return
  }

  const filePath = resolveStaticPath(request.url ?? '/')
  const contentType = mimeTypes.get(extname(filePath)) ?? 'application/octet-stream'

  response.writeHead(200, {
    'cache-control': filePath.endsWith('index.html') ? 'no-cache' : 'public, max-age=31536000, immutable',
    'content-type': contentType,
  })
  createReadStream(filePath).pipe(response)
})

const syncServer = new WebSocketServer({ server, path: '/ws' })
const lastByChannel = new Map()

syncServer.on('connection', (socket) => {
  for (const envelope of lastByChannel.values()) {
    socket.send(JSON.stringify(envelope))
  }

  socket.on('message', (data) => {
    try {
      const envelope = JSON.parse(data.toString())
      if (!envelope?.channel || !envelope?.payload) return

      lastByChannel.set(envelope.channel, envelope)

      for (const client of syncServer.clients) {
        if (client.readyState === client.OPEN) {
          client.send(JSON.stringify(envelope))
        }
      }
    } catch (error) {
      console.warn('Invalid sync message:', error)
    }
  })
})

server.listen(port, '0.0.0.0', () => {
  console.log(`VolleyStream production server listening on http://0.0.0.0:${port}`)
  console.log(`VolleyStream sync websocket available at ws://0.0.0.0:${port}/ws`)
})
