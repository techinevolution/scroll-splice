import assert from 'node:assert/strict'
import { EventEmitter, once } from 'node:events'
import { promises as fs } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { PassThrough } from 'node:stream'
import test from 'node:test'

import {
  AGENT_DEVELOPER_INSTRUCTIONS,
  AppServerClient,
  EDITOR_TOOL_NUMERIC_LIMITS,
  REQUIRED_CODEX_VERSION,
  SCROLLSPLICE_DYNAMIC_TOOLS,
  buildCodexArgs,
  buildCodexSpawnEnvironment,
  messagesToPrompt,
  normalizeAllowedModels,
  selectModelAndEffort,
} from './app-server-client.mjs'

test('dynamic editor schema bounds every model-writable numeric field', () => {
  const namespace = SCROLLSPLICE_DYNAMIC_TOOLS[0]
  const applyTool = namespace.tools.find(({ name }) => name === 'apply_editor_command')
  const placeTool = namespace.tools.find(({ name }) => name === 'place_generated_asset')
  assert.ok(applyTool)
  assert.ok(placeTool)

  const commandVariants = applyTool.inputSchema.properties.command.oneOf
  const commandNames = commandVariants.map(({ properties }) => properties.type.const)
  assert.equal(new Set(commandNames).size, commandNames.length)
  assert.ok(commandNames.includes('resize-episode'))
  assert.ok(commandNames.includes('create-positioned-text'))
  assert.ok(commandNames.includes('create-positioned-shape'))
  const positionedText = commandVariants.find(
    ({ properties }) => properties.type.const === 'create-positioned-text',
  )
  assert.deepEqual(positionedText.required.sort(), [
    'bounds', 'planeId', 'style', 'text', 'type',
  ])
  assert.deepEqual(positionedText.properties.style.required.sort(), [
    'color', 'fontSize', 'fontWeight', 'textAlign',
  ])
  assert.ok(commandNames.includes('update-speech-balloon'))
  assert.ok(commandNames.includes('set-image-frame'))
  assert.ok(!commandNames.includes('save'))

  const resizeEpisode = commandVariants.find(
    ({ properties }) => properties.type.const === 'resize-episode',
  )
  assert.deepEqual(resizeEpisode.properties.logicalHeight, {
    type: 'number',
    minimum: EDITOR_TOOL_NUMERIC_LIMITS.minEpisodeLogicalHeight,
    maximum: EDITOR_TOOL_NUMERIC_LIMITS.maxEpisodeLogicalHeight,
  })
  assert.deepEqual(
    placeTool.inputSchema.properties.bounds,
    commandVariants.find(({ properties }) =>
      properties.type.const === 'resize-element').properties.bounds,
  )

  assertEveryNumericSchemaIsBounded(namespace)
  assert.match(AGENT_DEVELOPER_INSTRUCTIONS, /episode height is 1,280-1,000,000/)
  assert.match(AGENT_DEVELOPER_INSTRUCTIONS, /Do not stop after placing blank balloons/)
  assert.match(AGENT_DEVELOPER_INSTRUCTIONS, /revise existing lettering in place/)
})

function assertEveryNumericSchemaIsBounded(value, path = 'schema') {
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      assertEveryNumericSchemaIsBounded(entry, `${path}[${index}]`))
    return
  }
  if (!value || typeof value !== 'object') return

  if (value.type === 'number') {
    const hasMinimum = Object.hasOwn(value, 'minimum') ||
      Object.hasOwn(value, 'exclusiveMinimum')
    const hasMaximum = Object.hasOwn(value, 'maximum') ||
      Object.hasOwn(value, 'exclusiveMaximum')
    assert.ok(hasMinimum, `${path} is missing a numeric minimum`)
    assert.ok(hasMaximum, `${path} is missing a numeric maximum`)
  }
  if (value.type === 'integer') {
    const boundedByEnum = Array.isArray(value.enum) && value.enum.length > 0
    const boundedByRange = Object.hasOwn(value, 'minimum') &&
      Object.hasOwn(value, 'maximum')
    assert.ok(boundedByEnum || boundedByRange, `${path} is an unbounded integer`)
  }

  for (const [key, entry] of Object.entries(value)) {
    assertEveryNumericSchemaIsBounded(entry, `${path}.${key}`)
  }
}

test('Codex launch environment contains only the runtime allowlist', () => {
  const environment = buildCodexSpawnEnvironment('/private/app/codex', {
    PATH: '/safe/bin',
    HOME: '/safe/home',
    LANG: 'en_US.UTF-8',
    TMPDIR: '/safe/tmp',
    GITHUB_TOKEN: 'github-secret',
    AWS_ACCESS_KEY_ID: 'aws-secret',
    DATABASE_URL: 'postgres://secret',
    SSH_AUTH_SOCK: '/private/ssh-agent.sock',
    OPENAI_API_KEY: 'openai-secret',
    SCROLLSPLICE_COMPANION_TOKEN: 'launch-secret',
    NODE_OPTIONS: '--require=/private/unsafe.cjs',
  })

  assert.deepEqual(environment, {
    PATH: '/safe/bin',
    HOME: '/safe/home',
    LANG: 'en_US.UTF-8',
    TMPDIR: '/safe/tmp',
    CODEX_HOME: '/private/app/codex',
  })
})

test('Codex arguments fail closed around the intended App Server', () => {
  const args = buildCodexArgs()
  assert.equal(args[0], 'app-server')
  assert.ok(args.includes('--strict-config'))
  assert.ok(args.includes('--stdio'))
  for (const setting of [
    'features.shell_tool=false',
    'features.shell_snapshot=false',
    'features.multi_agent=false',
    'features.apps=false',
    'features.plugins=false',
    'features.browser_use=false',
    'features.computer_use=false',
    'features.image_generation=true',
    'web_search="disabled"',
    'sandbox_mode="read-only"',
    'approval_policy="never"',
  ]) assert.ok(args.includes(setting), `missing ${setting}`)
})

test('model catalog allows only live GPT-5.5/5.6 models and prefers Terra', () => {
  const models = normalizeAllowedModels([
    model('gpt-5.5'),
    model('gpt-5.6-sol'),
    model('gpt-5.6-terra'),
    model('gpt-5.4'),
    model('other-gpt-5.6'),
  ])
  assert.deepEqual(models.map(({ model: name }) => name), [
    'gpt-5.6-terra',
    'gpt-5.6-sol',
    'gpt-5.5',
  ])
  assert.deepEqual(selectModelAndEffort(models, 'gpt-5.6-terra', 'medium'), {
    model: 'gpt-5.6-terra',
    effort: 'medium',
  })
  assert.throws(() => selectModelAndEffort(models, 'gpt-5.4', 'medium'))
  assert.throws(() => selectModelAndEffort(models, 'gpt-5.6-terra', 'impossible'))
})

test('conversation prompt is bounded and must end with the current user message', () => {
  assert.match(messagesToPrompt([
    { role: 'user', text: 'Make a panel.' },
    { role: 'assistant', text: 'Where should it go?' },
    { role: 'user', text: 'At the top.' },
  ]), /USER:\nAt the top\./)
  assert.throws(() => messagesToPrompt([{ role: 'assistant', text: 'No user request.' }]))
  assert.throws(() => messagesToPrompt([]))
})

test('client initializes experimental API, starts locked-down thread/turn, and stages images', async (t) => {
  const appDataRoot = await fs.mkdtemp(path.join(tmpdir(), 'scrollsplice-companion-test-'))
  t.after(() => fs.rm(appDataRoot, { recursive: true, force: true }))
  const transcript = []
  const child = fakeAppServer(transcript)
  let spawnOptions
  const priorLaunchToken = process.env.SCROLLSPLICE_COMPANION_TOKEN
  process.env.SCROLLSPLICE_COMPANION_TOKEN = 'must-not-reach-codex'
  t.after(() => {
    if (priorLaunchToken === undefined) delete process.env.SCROLLSPLICE_COMPANION_TOKEN
    else process.env.SCROLLSPLICE_COMPANION_TOKEN = priorLaunchToken
  })
  const client = new AppServerClient({
    appDataRoot,
    spawnImpl: (_file, _args, options) => {
      spawnOptions = options
      return child
    },
    execFileImpl: (_file, _args, callback) => callback(null, { stdout: `codex-cli ${REQUIRED_CODEX_VERSION}\n`, stderr: '' }),
    rpcTimeoutMs: 2_000,
  })
  t.after(() => client.stop())

  await client.start()
  assert.equal(spawnOptions.env.SCROLLSPLICE_COMPANION_TOKEN, undefined)
  assert.equal(spawnOptions.env.CODEX_HOME, path.join(appDataRoot, 'codex'))
  const initialize = transcript.find(({ method }) => method === 'initialize')
  assert.equal(initialize.params.capabilities.experimentalApi, true)
  assert.ok(transcript.some(({ method }) => method === 'initialized'))

  const threadId = await client.startThread('gpt-5.6-terra')
  assert.equal(threadId, 'thread-1')
  const thread = transcript.find(({ method }) => method === 'thread/start')
  assert.equal(thread.params.approvalPolicy, 'never')
  assert.equal(thread.params.sandbox, 'read-only')
  assert.deepEqual(thread.params.environments, [])
  assert.deepEqual(thread.params.runtimeWorkspaceRoots, [])
  assert.deepEqual(thread.params.selectedCapabilityRoots, [])
  assert.equal(thread.params.dynamicTools[0].name, 'scrollsplice')

  const turnId = await client.startTurn({
    threadId,
    model: 'gpt-5.6-terra',
    effort: 'medium',
    prompt: 'Inspect the editor.',
  })
  assert.equal(turnId, 'turn-1')
  const turn = transcript.find(({ method }) => method === 'turn/start')
  assert.deepEqual(turn.params.sandboxPolicy, { type: 'readOnly', networkAccess: false })
  assert.deepEqual(turn.params.environments, [])
  assert.deepEqual(turn.params.runtimeWorkspaceRoots, [])
  assert.deepEqual(turn.params.input[0].text_elements, [])

  const disconnectedStatus = await client.getStatus()
  assert.equal(disconnectedStatus.connected, false)
  child.account = { type: 'chatgpt', email: 'not-forwarded@example.invalid', planType: 'pro' }
  const connectedStatus = await client.getStatus()
  assert.equal(connectedStatus.connected, true)
  assert.equal(Object.hasOwn(connectedStatus, 'account'), false)
  assert.equal(
    transcript.filter(({ method }) => method === 'model/list').length,
    2,
    'the signed-in transition must refresh the live model catalog',
  )

  const generationPromise = once(client, 'generation')
  child.stdout.write(`${JSON.stringify({
    method: 'item/completed',
    params: {
      threadId,
      turnId,
      completedAtMs: Date.now(),
      item: {
        id: 'image-1',
        type: 'imageGeneration',
        status: 'completed',
        result: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB',
        revisedPrompt: 'A tiny safe test image',
      },
    },
  })}\n`)
  const [generation] = await generationPromise
  assert.match(generation.generationRef, /^[A-Za-z0-9_-]+$/)
  assert.equal(client.getLatestGenerationRef(turnId), generation.generationRef)
  const staged = client.getGeneration(generation.generationRef)
  assert.equal(staged.mediaType, 'image/png')
  assert.equal((await fs.stat(staged.filePath)).isFile(), true)

  const toolPromise = once(client, 'toolCall')
  child.stdout.write(`${JSON.stringify({
    id: 700,
    method: 'item/tool/call',
    params: {
      threadId,
      turnId,
      callId: 'call-1',
      namespace: 'scrollsplice',
      tool: 'inspect_editor',
      arguments: {},
    },
  })}\n`)
  await toolPromise
  client.respondToolCall('call-1', { success: true, result: { ok: true } })
  await new Promise((resolve) => setImmediate(resolve))
  const toolResponse = transcript.find(({ id, result }) => id === 700 && result)
  assert.equal(toolResponse.result.success, true)
  assert.deepEqual(JSON.parse(toolResponse.result.contentItems[0].text), { ok: true })

  const modes = await Promise.all([
    fs.stat(appDataRoot),
    fs.stat(path.join(appDataRoot, 'codex')),
    fs.stat(path.join(appDataRoot, 'agent-workspace')),
    fs.stat(path.join(appDataRoot, 'generated')),
  ])
  for (const stat of modes) assert.equal(stat.mode & 0o777, 0o700)

  await client.stop()
  await assert.rejects(fs.access(staged.filePath), { code: 'ENOENT' })
  assert.equal(client.getGeneration(generation.generationRef), null)
})

test('startup removes orphaned generated files without sweeping outside the generated directory', async (t) => {
  const appDataRoot = await fs.mkdtemp(path.join(tmpdir(), 'scrollsplice-orphan-test-'))
  t.after(() => fs.rm(appDataRoot, { recursive: true, force: true }))
  const generatedDir = path.join(appDataRoot, 'generated')
  const nestedDir = path.join(generatedDir, 'not-a-staged-file')
  const orphanPath = path.join(generatedDir, 'orphaned-generation.png')
  const siblingPath = path.join(appDataRoot, 'must-remain.txt')
  const nestedPath = path.join(nestedDir, 'must-remain.txt')
  await fs.mkdir(nestedDir, { recursive: true })
  await Promise.all([
    fs.writeFile(orphanPath, 'orphan'),
    fs.writeFile(siblingPath, 'sibling'),
    fs.writeFile(nestedPath, 'nested'),
  ])

  const child = fakeAppServer([])
  const client = new AppServerClient({
    appDataRoot,
    spawnImpl: () => child,
    execFileImpl: (_file, _args, callback) => callback(null, { stdout: `codex-cli ${REQUIRED_CODEX_VERSION}\n`, stderr: '' }),
    rpcTimeoutMs: 2_000,
  })
  t.after(() => client.stop())

  await client.start()
  await assert.rejects(fs.access(orphanPath), { code: 'ENOENT' })
  assert.equal(await fs.readFile(siblingPath, 'utf8'), 'sibling')
  assert.equal(await fs.readFile(nestedPath, 'utf8'), 'nested')
})

function model(name) {
  return {
    id: name,
    model: name,
    displayName: name,
    description: '',
    hidden: false,
    isDefault: false,
    defaultReasoningEffort: 'medium',
    supportedReasoningEfforts: [
      { reasoningEffort: 'low', description: '' },
      { reasoningEffort: 'medium', description: '' },
    ],
  }
}

function fakeAppServer(transcript) {
  const child = new EventEmitter()
  child.stdout = new PassThrough()
  child.stderr = new PassThrough()
  child.stdin = new PassThrough()
  child.kill = () => true
  child.account = null
  let buffer = ''
  child.stdin.setEncoding('utf8')
  child.stdin.on('data', (chunk) => {
    buffer += chunk
    let newline = buffer.indexOf('\n')
    while (newline >= 0) {
      const message = JSON.parse(buffer.slice(0, newline))
      transcript.push(message)
      buffer = buffer.slice(newline + 1)
      respond(message)
      newline = buffer.indexOf('\n')
    }
  })
  const respond = (message) => {
    if (!Object.hasOwn(message, 'id')) return
    let result = {}
    if (message.method === 'account/read') result = { account: child.account, requiresOpenaiAuth: true }
    if (message.method === 'model/list') result = { data: [model('gpt-5.6-terra'), model('gpt-5.5')], nextCursor: null }
    if (message.method === 'thread/start') result = { thread: { id: 'thread-1' } }
    if (message.method === 'turn/start') result = { turn: { id: 'turn-1' } }
    queueMicrotask(() => child.stdout.write(`${JSON.stringify({ id: message.id, result })}\n`))
  }
  return child
}
