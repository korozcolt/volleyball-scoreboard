import { timingSafeEqual } from 'node:crypto'
import { createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve, sep } from 'node:path'
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
const maxJsonBytes = Number(process.env.MAX_JSON_MB ?? 5) * 1024 * 1024
const maxSocketBytes = Number(process.env.MAX_WS_MB ?? 2) * 1024 * 1024

// Clave de operador. Con ADMIN_TOKEN definido, toda escritura (POST/PUT/PATCH/DELETE en /api) y todo
// mensaje por WebSocket exigen esa clave; lecturas y overlays de OBS siguen abiertos. Sin la variable
// el servidor se comporta como antes (útil en desarrollo), y avisa en el log.
const adminToken = (process.env.ADMIN_TOKEN ?? '').trim()

class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

const safeEqual = (a, b) => {
  const left = Buffer.from(String(a))
  const right = Buffer.from(String(b))
  return left.length === right.length && timingSafeEqual(left, right)
}

const isAuthorized = (candidate) => !adminToken || (Boolean(candidate) && safeEqual(candidate, adminToken))

const requestToken = (request) => {
  const header = request.headers['x-admin-token']
  if (typeof header === 'string' && header) return header
  const bearer = request.headers.authorization
  return typeof bearer === 'string' && bearer.startsWith('Bearer ') ? bearer.slice(7) : ''
}

const securityHeaders = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'same-origin',
}

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
    db.exec('BEGIN')
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
    db.exec('COMMIT')
    console.log('Migration completed.')
  }
} catch (e) {
  // Todo o nada: si falla a mitad, se deshace y la tabla original queda intacta.
  if (db.inTransaction) db.exec('ROLLBACK')
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
  response.writeHead(status, { ...securityHeaders, 'content-type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify(payload))
}

// Lee el cuerpo contando bytes: un cuerpo gigante se corta con 413 en lugar de llenar la memoria.
async function* limitedChunks(request, maxBytes) {
  const declared = Number(request.headers['content-length'] ?? 0)
  if (declared > maxBytes) throw new HttpError(413, 'El cuerpo de la solicitud es demasiado grande.')
  let total = 0
  for await (const chunk of request) {
    total += chunk.length
    if (total > maxBytes) throw new HttpError(413, 'El cuerpo de la solicitud es demasiado grande.')
    yield chunk
  }
}

const readJsonBody = async (request) => {
  const chunks = []
  for await (const chunk of limitedChunks(request, maxJsonBytes)) chunks.push(chunk)
  if (!chunks.length) return {}
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new HttpError(400, 'El cuerpo debe ser un objeto JSON.')
    }
    return parsed
  } catch (error) {
    if (error instanceof HttpError) throw error
    throw new HttpError(400, 'JSON inválido.')
  }
}

const normalizePlayerNumber = (value) => String(Math.max(1, Math.min(99, Number(value) || 1)))

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
    number: normalizePlayerNumber(player.number),
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
  return filePath.startsWith(uploadDir + sep) ? filePath : null
}

const handleLogoUpload = async (request, response) => {
  const webRequest = new Request(`http://localhost${request.url}`, {
    method: 'POST',
    headers: request.headers,
    body: Readable.toWeb(Readable.from(limitedChunks(request, maxImageBytes + 512 * 1024))),
    duplex: 'half',
  })
  const formData = await webRequest.formData().catch((error) => {
    if (error instanceof HttpError) throw error
    throw new HttpError(400, 'Formulario de subida inválido.')
  })
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
    // Defensa en profundidad (además del CSP sandbox de /uploads): nada de scripts ni manejadores en el SVG.
    if (/<script|\son[a-z]+\s*=|javascript:|<foreignObject|<iframe|<embed|<object/i.test(input.toString('utf8'))) {
      sendJson(response, 400, { error: 'El SVG contiene contenido activo y no se acepta.' })
      return
    }
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

const isWriteMethod = (method) => !['GET', 'HEAD', 'OPTIONS'].includes(method ?? 'GET')

const handleApi = async (request, response, url) => {
  try {
    if (url.pathname === '/api/auth/status' && request.method === 'GET') {
      sendJson(response, 200, {
        required: Boolean(adminToken),
        authorized: isAuthorized(requestToken(request)),
      })
      return true
    }

    if (isWriteMethod(request.method) && !isAuthorized(requestToken(request))) {
      sendJson(response, 401, { error: 'Se requiere la clave de operador para modificar datos.' })
      return true
    }

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
      const number = body.number !== undefined ? normalizePlayerNumber(body.number) : current.number
      const clash = db
        .prepare('SELECT id FROM team_players WHERE team_id = ? AND number = ? AND id != ?')
        .get(playerMatch[1], number, playerMatch[2])
      if (clash) {
        sendJson(response, 409, { error: `Ya existe otra jugadora con el dorsal ${number} en este equipo.` })
        return true
      }
      // UPDATE explícito por id: renumerar a una jugadora no debe chocar con la clave (team_id, number)
      // ni sobrescribir a otra jugadora.
      const name = String(body.name ?? current.name).trim() || current.name
      db.prepare(`
        UPDATE team_players
        SET number = @number, name = @name, active = @active, is_libero = @isLibero, role = @role, updated_at = @updatedAt
        WHERE id = @id AND team_id = @teamId
      `).run({
        id: playerMatch[2],
        teamId: playerMatch[1],
        number,
        name,
        active: (body.active ?? Boolean(current.active)) === false ? 0 : 1,
        isLibero: (body.isLibero ?? Boolean(current.is_libero)) ? 1 : 0,
        role: body.role !== undefined ? (body.role ? String(body.role) : null) : current.role,
        updatedAt: Date.now(),
      })
      const row = db.prepare('SELECT * FROM team_players WHERE id = ?').get(playerMatch[2])
      sendJson(response, 200, { player: toApiPlayer(row) })
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
        gameState?.gameFinished && gameState?.local && gameState?.visitor && gameState.local.sets !== gameState.visitor.sets
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
    if (error instanceof HttpError) {
      sendJson(response, error.status, { error: error.message })
      return true
    }
    console.error('API error:', error)
    sendJson(response, 500, { error: 'Error interno del servidor.' })
    return true
  }
}

const resolveStaticPath = (url) => {
  let pathname
  try {
    pathname = decodeURIComponent(new URL(url, 'http://localhost').pathname)
  } catch {
    throw new HttpError(400, 'URL inválida.')
  }
  const requestedPath = normalize(pathname).replace(/^(\.\.[/\\])+/, '')
  const filePath = join(distDir, requestedPath)

  if (filePath.startsWith(distDir + sep) && existsSync(filePath) && statSync(filePath).isFile()) {
    return filePath
  }

  return join(distDir, 'index.html')
}

const handleRequest = async (request, response) => {
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
      ...securityHeaders,
      // Los archivos subidos jamás deben ejecutar scripts, ni siquiera un SVG abierto directamente.
      'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      'cache-control': 'public, max-age=31536000, immutable',
      'content-type': mimeTypes.get(extname(filePath)) ?? 'application/octet-stream',
    })
    createReadStream(filePath).pipe(response)
    return
  }

  const filePath = resolveStaticPath(request.url ?? '/')
  const contentType = mimeTypes.get(extname(filePath)) ?? 'application/octet-stream'

  response.writeHead(200, {
    ...securityHeaders,
    'cache-control': filePath.endsWith('index.html') ? 'no-cache' : 'public, max-age=31536000, immutable',
    'content-type': contentType,
  })
  createReadStream(filePath).pipe(response)
}

const server = createServer((request, response) => {
  handleRequest(request, response).catch((error) => {
    const status = error instanceof HttpError ? error.status : 500
    if (!(error instanceof HttpError)) console.error('Request error:', error)
    if (response.headersSent) {
      response.destroy()
      return
    }
    response.writeHead(status, { ...securityHeaders, 'content-type': 'text/plain; charset=utf-8' })
    response.end(error instanceof HttpError ? error.message : 'Error interno del servidor.')
  })
})

// Un error inesperado en una promesa suelta se registra, pero no tumba el partido en vivo.
process.on('unhandledRejection', (reason) => console.error('Unhandled rejection:', reason))

const syncServer = new WebSocketServer({ server, path: '/ws', maxPayload: maxSocketBytes })
const lastByChannel = new Map()

// Sin esto, cada canal (4 por partido: match/broadcastConfig/overlayControl/statistics) queda
// para siempre en memoria aunque el partido termine hace días — fuga lenta pero indefinida.
// El TTL usa la hora del servidor (receivedAt): el timestamp del sobre lo pone el cliente y no es confiable.
const CHANNEL_TTL_MS = 12 * 60 * 60 * 1000
const MAX_CHANNELS = 500
const CHANNEL_PATTERN = /^[\w:.-]{1,160}$/
const pruneStaleChannels = () => {
  const cutoff = Date.now() - CHANNEL_TTL_MS
  for (const [channel, entry] of lastByChannel) {
    if (entry.receivedAt < cutoff) lastByChannel.delete(channel)
  }
}
setInterval(pruneStaleChannels, 30 * 60 * 1000).unref()

const HEARTBEAT_MS = 30 * 1000
const MAX_MESSAGES_PER_SECOND = 100

syncServer.on('connection', (socket, request) => {
  // Con ADMIN_TOKEN definido, solo quien presenta la clave puede publicar; el resto (overlays de OBS) solo recibe.
  const token = new URL(request.url ?? '/', 'http://localhost').searchParams.get('token') ?? ''
  const canWrite = isAuthorized(token)

  socket.isAlive = true
  socket.on('pong', () => {
    socket.isAlive = true
  })
  socket.on('error', (error) => console.warn('Socket error:', error.message))

  for (const { envelope } of lastByChannel.values()) {
    socket.send(JSON.stringify(envelope))
  }

  let windowStart = Date.now()
  let windowCount = 0

  socket.on('message', (data) => {
    if (!canWrite) return

    const now = Date.now()
    if (now - windowStart >= 1000) {
      windowStart = now
      windowCount = 0
    }
    if (++windowCount > MAX_MESSAGES_PER_SECOND) return

    try {
      const envelope = JSON.parse(data.toString())
      if (!envelope || typeof envelope.channel !== 'string' || !CHANNEL_PATTERN.test(envelope.channel)) return
      if (!envelope.payload) return

      lastByChannel.delete(envelope.channel)
      lastByChannel.set(envelope.channel, { envelope, receivedAt: now })
      if (lastByChannel.size > MAX_CHANNELS) {
        lastByChannel.delete(lastByChannel.keys().next().value)
      }

      const message = JSON.stringify(envelope)
      for (const client of syncServer.clients) {
        if (client.readyState === client.OPEN) client.send(message)
      }
    } catch (error) {
      console.warn('Invalid sync message:', error.message)
    }
  })
})

// Latido: quita conexiones muertas (cierres sin aviso, tablets que se durmieron) en lugar de acumularlas.
setInterval(() => {
  for (const client of syncServer.clients) {
    if (client.isAlive === false) {
      client.terminate()
      continue
    }
    client.isAlive = false
    client.ping()
  }
}, HEARTBEAT_MS).unref()

server.listen(port, '0.0.0.0', () => {
  console.log(`VolleyStream production server listening on http://0.0.0.0:${port}`)
  console.log(`VolleyStream sync websocket available at ws://0.0.0.0:${port}/ws`)
  console.log(
    adminToken
      ? 'Autenticación de operador ACTIVA (ADMIN_TOKEN definido).'
      : 'ADVERTENCIA: ADMIN_TOKEN no está definido — cualquiera con la URL puede modificar partidos.',
  )
})
