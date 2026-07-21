import type { AgentConversationMessage } from './conversationRepository'

const AGENT_API_BASE = '/agent-api'

export interface CompanionReasoningEffort {
  readonly reasoningEffort: string
  readonly description: string
}

export interface CompanionModel {
  readonly id: string
  readonly model: string
  readonly displayName: string
  readonly description: string
  readonly supportedReasoningEfforts: readonly CompanionReasoningEffort[]
  readonly defaultReasoningEffort: string
}

export type CompanionStatus =
  | { readonly available: false }
  | {
      readonly available: true
      readonly connected: boolean
      readonly models: readonly CompanionModel[]
      readonly defaultModel: string | null
      readonly defaultEffort: string
    }

export interface CompanionLoginStart {
  readonly loginId: string
  readonly authUrl: string
}

export type CompanionTurnEvent =
  | { readonly type: 'run-started'; readonly turnId: string }
  | { readonly type: 'assistant-delta'; readonly delta: string }
  | { readonly type: 'assistant-completed'; readonly text: string | null }
  | {
      readonly type: 'tool-call'
      readonly callId: string
      readonly name: string
      readonly arguments: unknown
    }
  | {
      readonly type: 'image-generated'
      readonly status: string
      readonly generationRef: string | null
    }
  | {
      readonly type: 'turn-completed'
      readonly turnId: string | null
      readonly status: string
    }
  | { readonly type: 'error'; readonly message: string; readonly code: string | null }

export interface StartCompanionTurnInput {
  readonly projectKey: string
  readonly model: string
  readonly effort: string
  readonly messages: readonly AgentConversationMessage[]
}

export interface CompanionClient {
  readonly getStatus: (signal?: AbortSignal) => Promise<CompanionStatus>
  readonly startLogin: (signal?: AbortSignal) => Promise<CompanionLoginStart>
  readonly cancelLogin: (
    loginId: string,
    signal?: AbortSignal,
  ) => Promise<void>
  readonly logout: (signal?: AbortSignal) => Promise<void>
  readonly startTurn: (
    input: StartCompanionTurnInput,
    onEvent: (event: CompanionTurnEvent) => void | Promise<void>,
    signal?: AbortSignal,
  ) => Promise<void>
  readonly postToolResult: (
    callId: string,
    result: unknown,
    signal?: AbortSignal,
  ) => Promise<void>
  readonly getGeneratedImage: (
    generationRef: string,
    signal?: AbortSignal,
  ) => Promise<Blob>
  readonly cancelTurn: (turnId: string, signal?: AbortSignal) => Promise<void>
}

export class CompanionRequestError extends Error {
  readonly status: number | null

  constructor(message: string, status: number | null = null) {
    super(message)
    this.name = 'CompanionRequestError'
    this.status = status
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

function parseReasoningEffort(value: unknown): CompanionReasoningEffort | null {
  if (typeof value === 'string' && value.trim()) {
    return { reasoningEffort: value, description: '' }
  }

  if (!isRecord(value)) return null
  const reasoningEffort = optionalString(
    value.reasoningEffort ?? value.effort,
  )
  if (!reasoningEffort) return null

  return {
    reasoningEffort,
    description: optionalString(value.description) ?? '',
  }
}

function parseModel(value: unknown): CompanionModel | null {
  if (!isRecord(value)) return null
  const id = optionalString(value.id ?? value.model)
  if (!id) return null

  const supportedReasoningEfforts = Array.isArray(
    value.supportedReasoningEfforts,
  )
    ? value.supportedReasoningEfforts
        .map(parseReasoningEffort)
        .filter((effort): effort is CompanionReasoningEffort => Boolean(effort))
    : []
  const defaultReasoningEffort =
    optionalString(value.defaultReasoningEffort ?? value.defaultEffort) ??
    supportedReasoningEfforts[0]?.reasoningEffort ??
    'medium'

  return {
    id,
    model: optionalString(value.model) ?? id,
    displayName: optionalString(value.displayName) ?? id,
    description: optionalString(value.description) ?? '',
    supportedReasoningEfforts,
    defaultReasoningEffort,
  }
}

export function parseCompanionStatus(value: unknown): CompanionStatus {
  if (!isRecord(value) || value.available !== true) {
    throw new CompanionRequestError('The local AI companion returned an invalid status.')
  }

  const models = Array.isArray(value.models)
    ? value.models
        .map(parseModel)
        .filter((model): model is CompanionModel => Boolean(model))
    : []

  return {
    available: true,
    connected: value.connected === true,
    models,
    defaultModel: optionalString(value.defaultModel),
    defaultEffort: optionalString(value.defaultEffort) ?? 'medium',
  }
}

export function parseCompanionTurnEvent(
  value: unknown,
): CompanionTurnEvent | null {
  if (!isRecord(value)) return null
  const type = optionalString(value.type)
  if (!type) return null

  if (type === 'run-started' || type === 'thread') {
    const turnId = optionalString(value.turnId)
    return turnId ? { type: 'run-started', turnId } : null
  }

  if (type === 'assistant-delta' || type === 'delta') {
    const delta = typeof value.delta === 'string' ? value.delta : null
    return delta === null ? null : { type: 'assistant-delta', delta }
  }

  if (type === 'assistant-completed') {
    return {
      type: 'assistant-completed',
      text: typeof value.text === 'string' ? value.text : null,
    }
  }

  if (type === 'tool-call') {
    const callId = optionalString(value.callId ?? value.requestId)
    const name = optionalString(value.name ?? value.tool)
    if (!callId || !name) return null
    return {
      type: 'tool-call',
      callId,
      name:
        optionalString(value.namespace) && !name.includes('.')
          ? `${String(value.namespace)}.${name}`
          : name,
      arguments: value.arguments,
    }
  }

  if (type === 'image-generated' || type === 'generation') {
    return {
      type: 'image-generated',
      status: optionalString(value.status) ?? 'generated',
      generationRef: optionalString(value.generationRef),
    }
  }

  if (type === 'turn-completed' || type === 'completed') {
    return {
      type: 'turn-completed',
      turnId: optionalString(value.turnId),
      status: optionalString(value.status) ?? 'completed',
    }
  }

  if (type === 'error') {
    return {
      type: 'error',
      message: optionalString(value.message) ?? 'The local AI run failed.',
      code: optionalString(value.code),
    }
  }

  return null
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    throw new CompanionRequestError(
      'The local AI companion returned an unreadable response.',
      response.status,
    )
  }
}

async function requestJson(
  fetcher: typeof fetch,
  path: string,
  init: RequestInit,
): Promise<unknown> {
  const response = await fetcher(`${AGENT_API_BASE}${path}`, {
    credentials: 'same-origin',
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  })

  if (!response.ok) {
    const value = await readJson(response).catch(() => null)
    const message =
      isRecord(value) && optionalString(value.message)
        ? String(value.message)
        : `The local AI companion returned ${response.status}.`
    throw new CompanionRequestError(message, response.status)
  }

  return response.status === 204 ? null : readJson(response)
}

async function readNdjson(
  response: Response,
  onEvent: (event: CompanionTurnEvent) => void | Promise<void>,
) {
  if (!response.body) {
    throw new CompanionRequestError(
      'The local AI companion did not provide a response stream.',
      response.status,
    )
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  const handleLine = async (line: string) => {
    const trimmed = line.trim()
    if (!trimmed) return

    let parsed: unknown
    try {
      parsed = JSON.parse(trimmed)
    } catch {
      throw new CompanionRequestError(
        'The local AI companion sent malformed streaming data.',
        response.status,
      )
    }

    const event = parseCompanionTurnEvent(parsed)
    if (event) await onEvent(event)
  }

  while (true) {
    const { done, value } = await reader.read()
    buffer += decoder.decode(value, { stream: !done })

    let newline = buffer.indexOf('\n')
    while (newline >= 0) {
      await handleLine(buffer.slice(0, newline))
      buffer = buffer.slice(newline + 1)
      newline = buffer.indexOf('\n')
    }

    if (done) break
  }

  await handleLine(buffer)
}

export function createCompanionClient(
  fetcher: typeof fetch = globalThis.fetch.bind(globalThis),
): CompanionClient {
  return {
    getStatus: async (signal) => {
      let response: Response
      try {
        response = await fetcher(`${AGENT_API_BASE}/status`, {
          method: 'GET',
          credentials: 'same-origin',
          headers: { Accept: 'application/json' },
          signal,
        })
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw error
        }
        return { available: false }
      }

      if (response.status === 404) return { available: false }
      if (!response.ok) {
        throw new CompanionRequestError(
          `The local AI companion returned ${response.status}.`,
          response.status,
        )
      }

      if (!response.headers.get('content-type')?.includes('application/json')) {
        return { available: false }
      }

      return parseCompanionStatus(await readJson(response))
    },

    startLogin: async (signal) => {
      const value = await requestJson(fetcher, '/login/start', {
        method: 'POST',
        signal,
      })
      if (!isRecord(value)) {
        throw new CompanionRequestError('The OpenAI login could not be started.')
      }
      const loginId = optionalString(value.loginId)
      const authUrl = optionalString(value.authUrl)
      if (!loginId || !authUrl) {
        throw new CompanionRequestError('The OpenAI login could not be started.')
      }
      return { loginId, authUrl }
    },

    cancelLogin: async (loginId, signal) => {
      await requestJson(fetcher, '/login/cancel', {
        method: 'POST',
        body: JSON.stringify({ loginId }),
        signal,
      })
    },

    logout: async (signal) => {
      await requestJson(fetcher, '/logout', { method: 'POST', signal })
    },

    startTurn: async (input, onEvent, signal) => {
      const response = await fetcher(`${AGENT_API_BASE}/turn`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          Accept: 'application/x-ndjson',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
        signal,
      })
      if (!response.ok) {
        const value = await readJson(response).catch(() => null)
        throw new CompanionRequestError(
          isRecord(value) && optionalString(value.message)
            ? String(value.message)
            : `The local AI companion returned ${response.status}.`,
          response.status,
        )
      }
      await readNdjson(response, onEvent)
    },

    postToolResult: async (callId, result, signal) => {
      await requestJson(fetcher, `/tool-results/${encodeURIComponent(callId)}`, {
        method: 'POST',
        body: JSON.stringify(result),
        signal,
      })
    },

    getGeneratedImage: async (generationRef, signal) => {
      const response = await fetcher(
        `${AGENT_API_BASE}/generations/${encodeURIComponent(generationRef)}`,
        {
          method: 'GET',
          credentials: 'same-origin',
          headers: { Accept: 'image/png,image/jpeg,image/webp' },
          signal,
        },
      )
      if (!response.ok) {
        throw new CompanionRequestError(
          `The generated image could not be retrieved (${response.status}).`,
          response.status,
        )
      }

      const mediaType = response.headers.get('content-type')?.split(';')[0]
      if (
        mediaType !== 'image/png' &&
        mediaType !== 'image/jpeg' &&
        mediaType !== 'image/webp'
      ) {
        throw new CompanionRequestError(
          'The generated image used an unsupported format.',
          response.status,
        )
      }

      const blob = await response.blob()
      return blob.type === mediaType
        ? blob
        : new Blob([blob], { type: mediaType })
    },

    cancelTurn: async (turnId, signal) => {
      await requestJson(fetcher, `/turns/${encodeURIComponent(turnId)}/cancel`, {
        method: 'POST',
        signal,
      })
    },
  }
}
