import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const companionPort = Number(process.env.SCROLLSPLICE_COMPANION_PORT || 43117)
const vitePort = Number(process.env.SCROLLSPLICE_VITE_PORT || 4173)
const token = randomBytes(32).toString('base64url')
const origin = `http://127.0.0.1:${vitePort}`
const children = new Set()
let stopping = false

function launch(command, args, env) {
  const child = spawn(command, args, {
    cwd: repoRoot,
    env: { ...process.env, ...env },
    stdio: ['inherit', 'pipe', 'pipe'],
  })
  children.add(child)
  child.once('exit', (code, signal) => {
    children.delete(child)
    if (!stopping && code !== 0) {
      process.stderr.write(`${path.basename(command)} exited (${code ?? signal ?? 'unknown'}).\n`)
      stop(code || 1)
    }
  })
  child.stderr.pipe(process.stderr)
  return child
}

function stop(exitCode = 0) {
  if (stopping) return
  stopping = true
  for (const child of children) child.kill('SIGTERM')
  const timeout = setTimeout(() => {
    for (const child of children) child.kill('SIGKILL')
    process.exit(exitCode)
  }, 3_000)
  timeout.unref?.()
  if (children.size === 0) process.exit(exitCode)
  Promise.all([...children].map((child) => new Promise((resolve) => child.once('exit', resolve))))
    .finally(() => process.exit(exitCode))
}

process.once('SIGINT', () => stop(0))
process.once('SIGTERM', () => stop(0))

const companion = launch(
  process.execPath,
  ['companion/server.mjs'],
  {
    SCROLLSPLICE_COMPANION_PORT: String(companionPort),
    SCROLLSPLICE_COMPANION_TOKEN: token,
    SCROLLSPLICE_ALLOWED_ORIGINS: `${origin},http://localhost:${vitePort}`,
  },
)

let readyBuffer = ''
const ready = new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error('The local companion did not become ready in time.')), 20_000)
  companion.stdout.on('data', (chunk) => {
    const text = chunk.toString()
    process.stdout.write(text)
    readyBuffer = `${readyBuffer}${text}`.slice(-2_000)
    if (readyBuffer.includes('SCROLLSPLICE_COMPANION_READY')) {
      clearTimeout(timeout)
      resolve()
    }
  })
  companion.once('exit', () => reject(new Error('The local companion exited before it became ready.')))
})

try {
  await ready
  const vite = launch(
    'corepack',
    ['pnpm', 'dev', '--host', '127.0.0.1', '--port', String(vitePort)],
    {
      SCROLLSPLICE_COMPANION_PORT: String(companionPort),
      SCROLLSPLICE_COMPANION_TOKEN: token,
    },
  )
  vite.stdout.pipe(process.stdout)
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  stop(1)
}
