import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { promises as fs } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  COMPANION_TOKEN_HEADER,
  createCompanionServer,
} from './server.mjs'

const TOKEN = 'test-token-with-at-least-twenty-four-characters'
const UI_ORIGIN = 'http://127.0.0.1:4173'

test('HTTP boundary requires the launch capability and a trusted mutation origin', async (t) => {
  const agent = new FakeAgent()
  const target = await listen(t, agent)

  const noToken = await fetch(`${target}/agent-api/status`)
  assert.equal(noToken.status, 401)

  const badOrigin = await fetch(`${target}/agent-api/login/start`, {
    method: 'POST',
    headers: authHeaders('http://malicious.invalid'),
  })
  assert.equal(badOrigin.status, 403)

  const noOrigin = await fetch(`${target}/agent-api/login/start`, {
    method: 'POST',
    headers: { [COMPANION_TOKEN_HEADER]: TOKEN },
  })
  assert.equal(noOrigin.status, 403)
})

test('status and ChatGPT login transport expose no account identity', async (t) => {
  const agent = new FakeAgent()
  const target = await listen(t, agent)

  const statusResponse = await fetch(`${target}/agent-api/status`, {
    headers: { [COMPANION_TOKEN_HEADER]: TOKEN },
  })
  assert.equal(statusResponse.status, 200)
  const status = await statusResponse.json()
  assert.equal(status.connected, false)
  assert.equal(status.defaultModel, 'gpt-5.6-terra')
  assert.equal(Object.hasOwn(status, 'account'), false)

  const loginResponse = await fetch(`${target}/agent-api/login/start`, {
    method: 'POST',
    headers: authHeaders(),
  })
  assert.equal(loginResponse.status, 200)
  assert.deepEqual(await loginResponse.json(), {
    loginId: 'login-1',
    authUrl: 'https://auth.example.invalid/openai',
  })

  const cancelResponse = await fetch(`${target}/agent-api/login/cancel`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ loginId: 'login-1' }),
  })
  assert.equal(cancelResponse.status, 200)
  assert.deepEqual(await cancelResponse.json(), { status: 'canceled' })

  const logoutResponse = await fetch(`${target}/agent-api/logout`, {
    method: 'POST',
    headers: authHeaders(),
  })
  assert.equal(logoutResponse.status, 200)
  assert.equal(agent.loggedOut, true)
})

test('turn streams exact browser events and waits for a browser tool result', async (t) => {
  const agent = new FakeAgent()
  const target = await listen(t, agent)
  const response = await fetch(`${target}/agent-api/turn`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({
      projectKey: 'project-1',
      model: 'gpt-5.6-terra',
      effort: 'medium',
      messages: [{ role: 'user', text: 'Inspect this episode.' }],
    }),
  })
  assert.equal(response.status, 200)

  const eventsPromise = collectNdjson(response)
  await agent.waitForToolCall()
  const toolResult = await fetch(`${target}/agent-api/tool-results/call-1`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ success: true, result: { ok: true, snapshot: { revision: 1 } } }),
  })
  assert.equal(toolResult.status, 200)

  const events = await eventsPromise
  assert.deepEqual(events.map(({ type }) => type), [
    'run-started',
    'assistant-delta',
    'tool-call',
    'assistant-completed',
    'turn-completed',
  ])
  assert.equal(events[0].turnId, 'turn-1')
  assert.equal(events[2].name, 'scrollsplice.inspect_editor')
  assert.deepEqual(events[2].arguments, {})
  assert.equal(agent.toolResults[0].callId, 'call-1')
  assert.match(agent.lastPrompt, /USER:\nInspect this episode\./)
})

test('generated import tool retrieves staged bytes out of band, never a filesystem path', async (t) => {
  const directory = await fs.mkdtemp(path.join(tmpdir(), 'scrollsplice-generation-test-'))
  t.after(() => fs.rm(directory, { recursive: true, force: true }))
  const filePath = path.join(directory, 'private-generated.png')
  await fs.writeFile(filePath, Buffer.from('89504e470d0a1a0a', 'hex'))
  const agent = new FakeAgent({ importFilePath: filePath })
  const target = await listen(t, agent)
  const response = await fetch(`${target}/agent-api/turn`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({
      projectKey: 'project-1',
      model: 'gpt-5.6-terra',
      effort: 'medium',
      messages: [{ role: 'user', text: 'Import the generated image.' }],
    }),
  })
  const events = await collectNdjson(response)
  const call = events.find(({ type }) => type === 'tool-call')
  assert.equal(call.name, 'scrollsplice.import_latest_generated_asset')
  assert.equal(call.arguments.generationRef, 'opaque-ref')
  assert.equal(Object.hasOwn(call.arguments, 'source'), false)
  assert.equal(call.arguments.metadata.provider, 'OpenAI')
  assert.equal(call.arguments.metadata.model, 'gpt-5.6-terra')
  assert.equal(call.arguments.metadata.prompt, 'A safer generated panel')
  assert.equal(JSON.stringify(call).includes(filePath), false)
  assert.equal(JSON.stringify(call).includes('savedPath'), false)

  const generatedResponse = await fetch(
    `${target}/agent-api/generations/${call.arguments.generationRef}`,
    { headers: { [COMPANION_TOKEN_HEADER]: TOKEN } },
  )
  assert.equal(generatedResponse.status, 200)
  assert.equal(generatedResponse.headers.get('content-type'), 'image/png')
  assert.deepEqual(
    Buffer.from(await generatedResponse.arrayBuffer()),
    Buffer.from('89504e470d0a1a0a', 'hex'),
  )

  const noToken = await fetch(
    `${target}/agent-api/generations/${call.arguments.generationRef}`,
  )
  assert.equal(noToken.status, 401)
})

async function listen(t, agent) {
  const server = createCompanionServer({
    agent,
    token: TOKEN,
    allowedOrigins: [UI_ORIGIN],
  })
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  t.after(() => new Promise((resolve) => server.close(resolve)))
  const { port } = server.address()
  return `http://127.0.0.1:${port}`
}

function authHeaders(origin = UI_ORIGIN) {
  return {
    [COMPANION_TOKEN_HEADER]: TOKEN,
    Origin: origin,
  }
}

function jsonHeaders() {
  return {
    ...authHeaders(),
    'Content-Type': 'application/json',
  }
}

async function collectNdjson(response) {
  const text = await response.text()
  return text.trim().split('\n').filter(Boolean).map((line) => JSON.parse(line))
}

class FakeAgent extends EventEmitter {
  constructor(options = {}) {
    super()
    this.models = [model('gpt-5.6-terra'), model('gpt-5.5')]
    this.toolResults = []
    this.importFilePath = options.importFilePath || null
    this.loggedOut = false
    this.toolCallPromise = new Promise((resolve) => { this.resolveToolCall = resolve })
  }

  async getStatus() {
    return {
      available: true,
      connected: false,
      models: this.models,
      defaultModel: 'gpt-5.6-terra',
      defaultEffort: 'medium',
      codexVersion: '0.144.5',
    }
  }

  async loginStart() {
    return { type: 'chatgpt', loginId: 'login-1', authUrl: 'https://auth.example.invalid/openai' }
  }

  async loginCancel() {
    return { status: 'canceled' }
  }

  async logout() {
    this.loggedOut = true
  }

  async startThread() {
    return 'thread-1'
  }

  async startTurn({ prompt }) {
    this.lastPrompt = prompt
    setTimeout(() => {
      this.emit('notification', {
        method: 'item/agentMessage/delta',
        params: { threadId: 'thread-1', turnId: 'turn-1', itemId: 'message-1', delta: 'I inspected it.' },
      })
      const tool = this.importFilePath ? 'import_latest_generated_asset' : 'inspect_editor'
      const args = this.importFilePath
        ? { episodeId: 'episode-1', expectedRevision: 0, metadata: { displayName: 'Generated panel', provider: 'OpenAI' } }
        : {}
      this.emit('toolCall', {
        threadId: 'thread-1',
        turnId: 'turn-1',
        callId: 'call-1',
        namespace: 'scrollsplice',
        tool,
        arguments: args,
      })
      this.resolveToolCall()
      if (this.importFilePath) {
        setTimeout(() => this.finish(), 10)
      }
    }, 10)
    return 'turn-1'
  }

  respondToolCall(callId, envelope) {
    this.toolResults.push({ callId, envelope })
    this.finish()
  }

  finish() {
    this.emit('notification', {
      method: 'item/completed',
      params: { threadId: 'thread-1', turnId: 'turn-1', item: { id: 'message-1', type: 'agentMessage', text: 'I inspected it.' } },
    })
    this.emit('notification', {
      method: 'turn/completed',
      params: { threadId: 'thread-1', turn: { id: 'turn-1', status: 'completed' } },
    })
  }

  async interrupt() {}

  getLatestGenerationRef() {
    return this.importFilePath ? 'opaque-ref' : null
  }

  getGeneration() {
    return this.importFilePath
      ? {
          filePath: this.importFilePath,
          mediaType: 'image/png',
          revisedPrompt: 'A safer generated panel',
          generatedAt: '2026-07-20T12:00:00.000Z',
        }
      : null
  }

  waitForToolCall() {
    return this.toolCallPromise
  }
}

function model(name) {
  return {
    id: name,
    model: name,
    displayName: name,
    description: '',
    defaultReasoningEffort: 'medium',
    supportedReasoningEfforts: [
      { reasoningEffort: 'low', description: '' },
      { reasoningEffort: 'medium', description: '' },
    ],
  }
}
