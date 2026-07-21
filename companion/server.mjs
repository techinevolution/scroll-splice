import { randomBytes, timingSafeEqual } from 'node:crypto'
import { promises as fs } from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  AppServerClient,
  messagesToPrompt,
  selectModelAndEffort,
} from './app-server-client.mjs'

export const COMPANION_TOKEN_HEADER = 'x-scrollsplice-companion-token'
export const COMPANION_COOKIE = 'scrollsplice_agent'

const MAX_BODY_BYTES = 1_000_000
const SAFE_ID_PATTERN = /^[A-Za-z0-9._:-]{1,200}$/

function safeEqual(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') return false
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  return a.length === b.length && timingSafeEqual(a, b)
}

function parseCookies(header) {
  const cookies = new Map()
  for (const part of String(header || '').split(';')) {
    const separator = part.indexOf('=')
    if (separator < 1) continue
    cookies.set(part.slice(0, separator).trim(), decodeURIComponent(part.slice(separator + 1).trim()))
  }
  return cookies
}

function json(res, status, value, headers = {}) {
  const body = Buffer.from(JSON.stringify(value))
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': body.length,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  })
  res.end(body)
}

async function readJson(req) {
  const contentType = String(req.headers['content-type'] || '').split(';')[0].trim()
  if (contentType !== 'application/json') throw Object.assign(new Error('Use application/json.'), { status: 415 })
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_BODY_BYTES) throw Object.assign(new Error('The request body is too large.'), { status: 413 })
    chunks.push(chunk)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
  } catch {
    throw Object.assign(new Error('The request body is not valid JSON.'), { status: 400 })
  }
}

function safeProjectKey(value) {
  return typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 200 &&
    !Array.from(value).some((character) => {
      const codePoint = character.codePointAt(0) ?? 0
      return codePoint <= 31 || codePoint === 127
    })
}

function validLoginId(value) {
  return typeof value === 'string' && SAFE_ID_PATTERN.test(value)
}

function contentTypeFor(filePath) {
  const extension = path.extname(filePath).toLowerCase()
  return ({
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.woff2': 'font/woff2',
  })[extension] || 'application/octet-stream'
}

export function createCompanionServer(options) {
  const {
    agent,
    token,
    allowedOrigins = [],
    serveDist = false,
    distDir = path.resolve('dist'),
  } = options
  if (!agent || typeof token !== 'string' || token.length < 24) {
    throw new Error('A companion agent and strong launch token are required.')
  }

  const origins = new Set(allowedOrigins.map((origin) => new URL(origin).origin))
  const activeTurns = new Map()
  const server = http.createServer(async (req, res) => {
    try {
      const host = String(req.headers.host || '')
      const allowedHosts = new Set([...origins].map((origin) => new URL(origin).host))
      const address = server.address()
      if (address && typeof address === 'object') {
        allowedHosts.add(`127.0.0.1:${address.port}`)
        allowedHosts.add(`localhost:${address.port}`)
      }
      if (!allowedHosts.has(host)) {
        json(res, 403, { message: 'Rejected host.' })
        return
      }

      const url = new URL(req.url || '/', `http://${host}`)
      const isApi = url.pathname === '/agent-api' || url.pathname.startsWith('/agent-api/')
      if (!isApi) {
        if (!serveDist || req.method !== 'GET') {
          json(res, 404, { message: 'Not found.' })
          return
        }
        await serveStatic(res, url.pathname, distDir, token)
        return
      }

      const headerToken = req.headers[COMPANION_TOKEN_HEADER]
      const cookieToken = parseCookies(req.headers.cookie).get(COMPANION_COOKIE)
      if (!safeEqual(headerToken, token) && !safeEqual(cookieToken, token)) {
        json(res, 401, { message: 'The local companion capability is missing.' })
        return
      }

      const origin = req.headers.origin
      if (origin && !origins.has(origin)) {
        json(res, 403, { message: 'Rejected origin.' })
        return
      }
      if (req.method !== 'GET' && !origin) {
        json(res, 403, { message: 'A trusted browser origin is required.' })
        return
      }

      if (req.method === 'GET' && url.pathname === '/agent-api/status') {
        try {
          json(res, 200, await agent.getStatus())
        } catch {
          json(res, 404, { available: false })
        }
        return
      }

      if (req.method === 'POST' && url.pathname === '/agent-api/login/start') {
        const result = await agent.loginStart()
        if (result?.type !== 'chatgpt' || !validLoginId(result.loginId) || typeof result.authUrl !== 'string') {
          throw new Error('Codex returned an invalid OpenAI login response.')
        }
        const authUrl = new URL(result.authUrl)
        if (authUrl.protocol !== 'https:') throw new Error('Codex returned an unsafe OpenAI login URL.')
        json(res, 200, { loginId: result.loginId, authUrl: authUrl.toString() })
        return
      }

      if (req.method === 'POST' && url.pathname === '/agent-api/login/cancel') {
        const body = await readJson(req)
        if (!validLoginId(body?.loginId)) throw Object.assign(new Error('A valid loginId is required.'), { status: 400 })
        const result = await agent.loginCancel(body.loginId)
        json(res, 200, { status: result?.status || 'notFound' })
        return
      }

      if (req.method === 'POST' && url.pathname === '/agent-api/logout') {
        await agent.logout()
        json(res, 200, { ok: true })
        return
      }

      if (req.method === 'POST' && url.pathname === '/agent-api/turn') {
        const body = await readJson(req)
        if (!safeProjectKey(body?.projectKey)) throw Object.assign(new Error('A valid projectKey is required.'), { status: 400 })
        const selected = selectModelAndEffort(agent.models || [], body.model, body.effort)
        const prompt = messagesToPrompt(body.messages)
        await streamTurn({ req, res, agent, activeTurns, selected, prompt })
        return
      }

      const toolMatch = /^\/agent-api\/tool-results\/([^/]+)$/.exec(url.pathname)
      if (req.method === 'POST' && toolMatch) {
        const callId = decodeURIComponent(toolMatch[1])
        if (!validLoginId(callId)) throw Object.assign(new Error('A valid callId is required.'), { status: 400 })
        agent.respondToolCall(callId, await readJson(req))
        json(res, 200, { ok: true })
        return
      }

      const cancelMatch = /^\/agent-api\/turns\/([^/]+)\/cancel$/.exec(url.pathname)
      if (req.method === 'POST' && cancelMatch) {
        const turnId = decodeURIComponent(cancelMatch[1])
        const active = activeTurns.get(turnId)
        if (!active) {
          json(res, 404, { message: 'That run is no longer active.' })
          return
        }
        await agent.interrupt(active.threadId, turnId)
        json(res, 200, { ok: true })
        return
      }

      json(res, 404, { message: 'Not found.' })
    } catch (error) {
      const status = error?.status || 500
      const message = status < 500 && error instanceof Error
        ? error.message
        : 'The local companion could not complete that request.'
      if (!res.headersSent) json(res, status, { message })
      else res.end()
    }
  })

  return server
}

async function streamTurn({ req, res, agent, activeTurns, selected, prompt }) {
  const threadId = await agent.startThread(selected.model)
  if (!threadId) throw new Error('Codex did not create a local run.')

  res.writeHead(200, {
    'Content-Type': 'application/x-ndjson; charset=utf-8',
    'Cache-Control': 'no-store, no-transform',
    'X-Content-Type-Options': 'nosniff',
    'X-Accel-Buffering': 'no',
  })
  res.flushHeaders?.()

  let turnId = null
  let completed = false
  const queued = []
  const write = (value) => {
    if (!res.destroyed && !res.writableEnded) res.write(`${JSON.stringify(value)}\n`)
  }
  const belongs = (params) => params?.threadId === threadId && (!turnId || !params.turnId || params.turnId === turnId)

  const onNotification = ({ method, params }) => {
    if (!belongs(params)) return
    const emit = (event) => turnId ? write(event) : queued.push(event)
    if (method === 'item/agentMessage/delta') {
      emit({ type: 'assistant-delta', delta: String(params.delta || '') })
    } else if (method === 'item/completed' && params.item?.type === 'agentMessage') {
      emit({ type: 'assistant-completed', text: params.item.text ?? null })
    } else if (method === 'turn/completed') {
      const id = params.turn?.id || turnId
      if (id !== turnId) return
      completed = true
      activeTurns.delete(turnId)
      write({ type: 'turn-completed', turnId, status: params.turn?.status || 'completed' })
      cleanup()
      res.end()
    } else if (method === 'error') {
      emit({ type: 'error', code: 'codex-error', message: String(params.error?.message || params.message || 'The local AI run failed.') })
    }
  }

  const onToolCall = async (params) => {
    if (!belongs(params)) return
    let args = params.arguments
    if (params.tool === 'import_latest_generated_asset') {
      const generationRef = agent.getLatestGenerationRef(params.turnId)
      const generation = generationRef && agent.getGeneration(generationRef)
      if (!generation) {
        agent.respondToolCall(params.callId, { success: false, result: { ok: false, message: 'Generate an image before importing it.' } })
        return
      }
      try {
        const bytes = await fs.readFile(generation.filePath)
        const requestedMetadata = params.arguments?.metadata || {}
        args = {
          ...(params.arguments || {}),
          metadata: {
            displayName: requestedMetadata.displayName || 'Generated image',
            provider: 'OpenAI',
            model: selected.model,
            prompt: generation.revisedPrompt || requestedMetadata.prompt || null,
            generatedAt: generation.generatedAt,
            ...(requestedMetadata.creatorCategoryId
              ? { creatorCategoryId: requestedMetadata.creatorCategoryId }
              : {}),
          },
          source: { kind: 'data-url', dataUrl: `data:${generation.mediaType};base64,${bytes.toString('base64')}` },
        }
      } catch {
        agent.respondToolCall(params.callId, { success: false, result: { ok: false, message: 'The staged generated image expired.' } })
        return
      }
    }
    write({
      type: 'tool-call',
      callId: params.callId,
      name: `${params.namespace}.${params.tool}`,
      arguments: args,
    })
  }

  const onGeneration = (event) => {
    if (event.threadId !== threadId || (turnId && event.turnId !== turnId)) return
    write({ type: 'image-generated', status: event.status, generationRef: event.generationRef })
  }

  const onBoundary = async (event) => {
    if (event.threadId && event.threadId !== threadId) return
    if (turnId && event.turnId && event.turnId !== turnId) return
    write({ type: 'error', code: 'capability-boundary', message: 'The run requested a capability that ScrollSplice deliberately disables.' })
    if (turnId) await agent.interrupt(threadId, turnId).catch(() => {})
  }

  const onFatal = async () => {
    write({ type: 'error', code: 'companion-failure', message: 'The isolated local AI process stopped unexpectedly.' })
    if (turnId) await agent.interrupt(threadId, turnId).catch(() => {})
    cleanup()
    res.end()
  }

  const cleanup = () => {
    agent.off('notification', onNotification)
    agent.off('toolCall', onToolCall)
    agent.off('generation', onGeneration)
    agent.off('boundaryViolation', onBoundary)
    agent.off('fatal', onFatal)
  }

  agent.on('notification', onNotification)
  agent.on('toolCall', onToolCall)
  agent.on('generation', onGeneration)
  agent.on('boundaryViolation', onBoundary)
  agent.on('fatal', onFatal)

  try {
    turnId = await agent.startTurn({ threadId, model: selected.model, effort: selected.effort, prompt })
    if (!turnId) throw new Error('Codex did not start the local run.')
    activeTurns.set(turnId, { threadId })
    write({ type: 'run-started', turnId })
    for (const event of queued) write(event)
  } catch {
    cleanup()
    write({ type: 'error', code: 'turn-start-failed', message: 'The local AI run could not start.' })
    res.end()
    return
  }

  const abort = () => {
    if (!completed && turnId) agent.interrupt(threadId, turnId).catch(() => {})
    if (!completed) activeTurns.delete(turnId)
    cleanup()
  }
  req.once('aborted', abort)
  res.once('close', abort)
}

async function serveStatic(res, requestPath, distDir, token) {
  let relative = decodeURIComponent(requestPath).replace(/^\/+/, '')
  if (!relative || relative.endsWith('/')) relative += 'index.html'
  let filePath = path.resolve(distDir, relative)
  const root = path.resolve(distDir)
  if (!filePath.startsWith(`${root}${path.sep}`) && filePath !== root) {
    json(res, 403, { message: 'Rejected path.' })
    return
  }
  let bytes
  try {
    bytes = await fs.readFile(filePath)
  } catch {
    filePath = path.join(root, 'index.html')
    bytes = await fs.readFile(filePath)
  }
  res.writeHead(200, {
    'Content-Type': contentTypeFor(filePath),
    'Content-Length': bytes.length,
    'Cache-Control': path.basename(filePath) === 'index.html' ? 'no-store' : 'public, max-age=3600',
    'Set-Cookie': `${COMPANION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/`,
    'Content-Security-Policy': "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'",
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  })
  res.end(bytes)
}

export async function startCompanion(options = {}) {
  const port = Number(options.port ?? process.env.SCROLLSPLICE_COMPANION_PORT ?? 43117)
  const token = options.token || process.env.SCROLLSPLICE_COMPANION_TOKEN || randomBytes(32).toString('base64url')
  const allowedOrigins = options.allowedOrigins || String(process.env.SCROLLSPLICE_ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  allowedOrigins.push(`http://127.0.0.1:${port}`, `http://localhost:${port}`)
  const agent = options.agent || new AppServerClient()
  await agent.start()
  const server = createCompanionServer({
    agent,
    token,
    allowedOrigins,
    serveDist: options.serveDist ?? process.argv.includes('--serve-dist'),
    distDir: options.distDir || path.resolve('dist'),
  })
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, '127.0.0.1', resolve)
  })
  return { server, agent, port, token }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
if (isMain) {
  startCompanion()
    .then(({ server, agent, port }) => {
      process.stdout.write(`SCROLLSPLICE_COMPANION_READY http://127.0.0.1:${port}\n`)
      const stop = async () => {
        server.close()
        await agent.stop()
      }
      process.once('SIGINT', stop)
      process.once('SIGTERM', stop)
    })
    .catch((error) => {
      process.stderr.write(`ScrollSplice companion failed: ${error instanceof Error ? error.message : String(error)}\n`)
      process.exitCode = 1
    })
}
