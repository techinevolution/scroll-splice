import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { dispatchEditorToolCall } from './editorToolDispatcher'
import {
  createCompanionClient,
  type CompanionClient,
  type CompanionModel,
  type CompanionStatus,
  type CompanionTurnEvent,
} from './companionClient'
import {
  createBrowserAgentConversationRepository,
  type AgentConversationMessage,
  type AgentConversationRepository,
} from './conversationRepository'

export type AgentSessionPhase =
  | 'checking'
  | 'unavailable'
  | 'disconnected'
  | 'authorizing'
  | 'connected'
  | 'running'
  | 'error'

interface AgentSessionDependencies {
  readonly client?: CompanionClient
  readonly repository?: AgentConversationRepository
  readonly dispatchToolCall?: typeof dispatchEditorToolCall
}

interface AgentModelSelection {
  readonly models: readonly CompanionModel[]
  readonly modelId: string
  readonly effort: string
}

interface AssistantTurnFinalizationInput {
  readonly sawTerminalEvent: boolean
  readonly completedStatus: string
  readonly cancelled: boolean
  readonly completedText: string | null
  readonly streamedText: string
}

export type AssistantTurnFinalization =
  | { readonly ok: true; readonly text: string | null }
  | { readonly ok: false; readonly message: string }

const LOGIN_POLL_INTERVAL_MS = 1_500

function createMessageId() {
  return globalThis.crypto?.randomUUID?.() ?? `message-${Date.now()}`
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

function readErrorMessage(error: unknown) {
  return error instanceof Error && error.message.trim()
    ? error.message
    : 'The local AI companion could not complete that request.'
}

function isPermittedBuildWeekModel(model: CompanionModel) {
  const searchable = `${model.id} ${model.model} ${model.displayName}`
  return /gpt[\s-]*5\.(5|6)(?:\b|[-_])/i.test(searchable)
}

function chooseEffort(model: CompanionModel, requestedEffort: string) {
  const efforts = model.supportedReasoningEfforts.map(
    ({ reasoningEffort }) => reasoningEffort,
  )
  const medium = efforts.find(
    (effort) => effort.toLocaleLowerCase() === 'medium',
  )
  if (medium) return medium
  if (efforts.includes(requestedEffort)) return requestedEffort
  if (efforts.includes(model.defaultReasoningEffort)) {
    return model.defaultReasoningEffort
  }
  return efforts[0] ?? model.defaultReasoningEffort ?? 'medium'
}

export function chooseAgentModelSelection(
  status: Extract<CompanionStatus, { available: true }>,
): AgentModelSelection {
  const models = status.models.filter(isPermittedBuildWeekModel)
  const model =
    models.find(
      ({ id, model: modelName }) =>
        id === status.defaultModel || modelName === status.defaultModel,
    ) ?? models[0]

  return {
    models,
    modelId: model?.id ?? '',
    effort: model ? chooseEffort(model, status.defaultEffort) : '',
  }
}

export function finalizeAssistantTurn(
  input: AssistantTurnFinalizationInput,
): AssistantTurnFinalization {
  if (!input.sawTerminalEvent) {
    return {
      ok: false,
      message:
        'The local AI response ended before the turn completed. No partial reply was saved.',
    }
  }

  if (input.cancelled || input.completedStatus === 'interrupted') {
    return { ok: true, text: null }
  }

  if (input.completedStatus !== 'completed') {
    return {
      ok: false,
      message: `The local AI turn ended with status ${input.completedStatus}. No partial reply was saved.`,
    }
  }

  const text = (input.completedText ?? input.streamedText).trim()
  return { ok: true, text: text || null }
}

function toolResultEnvelope(result: unknown) {
  const success =
    result !== null &&
    typeof result === 'object' &&
    'ok' in result &&
    (result as { readonly ok?: unknown }).ok === true

  return { success, result }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

async function resolveToolArguments(
  client: CompanionClient,
  event: Extract<CompanionTurnEvent, { type: 'tool-call' }>,
  signal: AbortSignal,
) {
  if (
    event.name !== 'scrollsplice.import_latest_generated_asset' ||
    !isRecord(event.arguments) ||
    typeof event.arguments.generationRef !== 'string'
  ) {
    return event.arguments
  }

  const { generationRef, ...argumentsWithoutReference } = event.arguments
  const source = await client.getGeneratedImage(generationRef, signal)
  return { ...argumentsWithoutReference, source }
}

function failedToolResult(error: unknown) {
  return {
    success: false,
    result: {
      ok: false,
      code: 'tool-dispatch-failed',
      message: readErrorMessage(error),
    },
  }
}

export function useAgentSession(
  projectKey: string,
  dependencies: AgentSessionDependencies = {},
) {
  const [client] = useState(
    () => dependencies.client ?? createCompanionClient(),
  )
  const [repository] = useState(
    () =>
      dependencies.repository ?? createBrowserAgentConversationRepository(),
  )
  const [dispatchToolCall] = useState(
    () => dependencies.dispatchToolCall ?? dispatchEditorToolCall,
  )
  const [phase, setPhase] = useState<AgentSessionPhase>('checking')
  const [messages, setMessages] = useState<
    readonly AgentConversationMessage[]
  >(() => repository.load(projectKey))
  const [models, setModels] = useState<readonly CompanionModel[]>([])
  const [selectedModelId, setSelectedModelId] = useState('')
  const [selectedEffort, setSelectedEffort] = useState('')
  const [authUrl, setAuthUrl] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [activityMessage, setActivityMessage] = useState<string | null>(null)
  const [streamingText, setStreamingText] = useState('')
  const loginIdRef = useRef<string | null>(null)
  const loginAbortRef = useRef<AbortController | null>(null)
  const loginGenerationRef = useRef(0)
  const activeTurnIdRef = useRef<string | null>(null)
  const turnAbortRef = useRef<AbortController | null>(null)
  const cancelRequestedRef = useRef(false)
  const sessionGenerationRef = useRef(0)

  const selectedModel = useMemo(
    () => models.find(({ id }) => id === selectedModelId) ?? null,
    [models, selectedModelId],
  )
  const supportedEfforts =
    selectedModel?.supportedReasoningEfforts ?? []

  const applyConnectedStatus = useCallback(
    (status: Extract<CompanionStatus, { available: true }>) => {
      loginGenerationRef.current += 1
      loginAbortRef.current?.abort()
      loginAbortRef.current = null
      const selection = chooseAgentModelSelection(status)
      setModels(selection.models)
      setSelectedModelId(selection.modelId)
      setSelectedEffort(selection.effort)
      setAuthUrl(null)
      setErrorMessage(null)
      setActivityMessage(null)
      loginIdRef.current = null
      setPhase('connected')
    },
    [],
  )

  const refreshStatus = useCallback(async () => {
    setErrorMessage(null)
    try {
      const status = await client.getStatus()
      if (!status.available) {
        setModels([])
        setSelectedModelId('')
        setSelectedEffort('')
        setPhase('unavailable')
        return
      }

      if (!status.connected) {
        setModels([])
        setSelectedModelId('')
        setSelectedEffort('')
        setPhase('disconnected')
        return
      }

      applyConnectedStatus(status)
    } catch (error) {
      if (isAbortError(error)) return
      setErrorMessage(readErrorMessage(error))
      setPhase('error')
    }
  }, [applyConnectedStatus, client])

  useEffect(() => {
    const controller = new AbortController()

    const checkStatus = async () => {
      try {
        const status = await client.getStatus(controller.signal)
        if (!status.available) {
          setPhase('unavailable')
        } else if (!status.connected) {
          setPhase('disconnected')
        } else {
          applyConnectedStatus(status)
        }
      } catch (error) {
        if (isAbortError(error)) return
        setErrorMessage(readErrorMessage(error))
        setPhase('error')
      }
    }

    void checkStatus()
    return () => controller.abort()
  }, [applyConnectedStatus, client])

  useEffect(() => {
    if (phase !== 'authorizing') return

    let stopped = false
    let timer: number | null = null
    const authorizationGeneration = loginGenerationRef.current

    const poll = async () => {
      try {
        const status = await client.getStatus()
        if (
          stopped ||
          loginGenerationRef.current !== authorizationGeneration
        ) {
          return
        }

        if (status.available && status.connected) {
          applyConnectedStatus(status)
          return
        }
      } catch (error) {
        if (!stopped && !isAbortError(error)) {
          setActivityMessage('Still waiting for OpenAI sign-in…')
        }
      }

      if (!stopped) {
        timer = window.setTimeout(poll, LOGIN_POLL_INTERVAL_MS)
      }
    }

    timer = window.setTimeout(poll, LOGIN_POLL_INTERVAL_MS)
    return () => {
      stopped = true
      if (timer !== null) window.clearTimeout(timer)
    }
  }, [applyConnectedStatus, client, phase])

  useEffect(
    () => () => {
      loginGenerationRef.current += 1
      loginAbortRef.current?.abort()
      const loginId = loginIdRef.current
      if (loginId) void client.cancelLogin(loginId).catch(() => undefined)
      sessionGenerationRef.current += 1
      cancelRequestedRef.current = true
      turnAbortRef.current?.abort()
    },
    [client],
  )

  const startLogin = useCallback(async () => {
    loginGenerationRef.current += 1
    const requestGeneration = loginGenerationRef.current
    loginAbortRef.current?.abort()
    const controller = new AbortController()
    loginAbortRef.current = controller
    setPhase('authorizing')
    setErrorMessage(null)
    setActivityMessage('Preparing a secure OpenAI sign-in link…')
    setAuthUrl(null)

    try {
      const login = await client.startLogin(controller.signal)
      if (
        controller.signal.aborted ||
        loginGenerationRef.current !== requestGeneration
      ) {
        void client.cancelLogin(login.loginId).catch(() => undefined)
        return
      }
      loginIdRef.current = login.loginId
      setAuthUrl(login.authUrl)
      setActivityMessage('Waiting for OpenAI sign-in…')
    } catch (error) {
      if (
        controller.signal.aborted ||
        loginGenerationRef.current !== requestGeneration ||
        isAbortError(error)
      ) {
        return
      }
      setErrorMessage(readErrorMessage(error))
      setPhase('error')
    } finally {
      if (loginAbortRef.current === controller) {
        loginAbortRef.current = null
      }
    }
  }, [client])

  const cancelLogin = useCallback(async () => {
    loginGenerationRef.current += 1
    loginAbortRef.current?.abort()
    loginAbortRef.current = null
    const loginId = loginIdRef.current
    loginIdRef.current = null
    setAuthUrl(null)
    setActivityMessage(null)

    try {
      if (loginId) await client.cancelLogin(loginId)
      setPhase('disconnected')
    } catch (error) {
      setErrorMessage(readErrorMessage(error))
      setPhase('error')
    }
  }, [client])

  const logout = useCallback(async () => {
    sessionGenerationRef.current += 1
    cancelRequestedRef.current = true
    const turnId = activeTurnIdRef.current
    const turnCancellation = turnId
      ? client.cancelTurn(turnId).catch(() => undefined)
      : Promise.resolve()
    turnAbortRef.current?.abort()
    setStreamingText('')
    setActivityMessage(null)

    try {
      await turnCancellation
      await client.logout()
      setModels([])
      setSelectedModelId('')
      setSelectedEffort('')
      setPhase('disconnected')
    } catch (error) {
      setErrorMessage(readErrorMessage(error))
      setPhase('error')
    }
  }, [client])

  const selectModel = useCallback(
    (modelId: string) => {
      const model = models.find(({ id }) => id === modelId)
      if (!model) return
      setSelectedModelId(model.id)
      setSelectedEffort(chooseEffort(model, 'medium'))
    },
    [models],
  )

  const sendMessage = useCallback(
    async (rawText: string) => {
      const text = rawText.trim()
      if (
        !text ||
        phase !== 'connected' ||
        !selectedModelId ||
        !selectedEffort
      ) {
        return false
      }

      const userMessage: AgentConversationMessage = {
        id: createMessageId(),
        role: 'user',
        text,
        createdAt: new Date().toISOString(),
      }
      const nextMessages = repository.append(projectKey, userMessage)
      setMessages(nextMessages)
      setStreamingText('')
      setActivityMessage('Thinking…')
      setErrorMessage(null)
      setPhase('running')

      let assistantBuffer = ''
      let completedText: string | null = null
      let completedStatus = 'completed'
      let sawTerminalEvent = false
      const controller = new AbortController()
      const runGeneration = sessionGenerationRef.current
      turnAbortRef.current = controller
      activeTurnIdRef.current = null
      cancelRequestedRef.current = false

      const handleEvent = async (event: CompanionTurnEvent) => {
        if (sessionGenerationRef.current !== runGeneration) {
          throw new DOMException('The AI session changed.', 'AbortError')
        }

        switch (event.type) {
          case 'run-started':
            activeTurnIdRef.current = event.turnId
            setActivityMessage('Working on this episode…')
            break
          case 'assistant-delta':
            assistantBuffer += event.delta
            setStreamingText(assistantBuffer)
            break
          case 'assistant-completed':
            completedText = event.text ?? assistantBuffer
            setStreamingText(completedText)
            break
          case 'tool-call': {
            setActivityMessage('Updating the episode…')
            let resultEnvelope: unknown
            try {
              const argumentsForDispatcher = await resolveToolArguments(
                client,
                event,
                controller.signal,
              )
              const result = await dispatchToolCall({
                name: event.name,
                arguments: argumentsForDispatcher,
              })
              resultEnvelope = toolResultEnvelope(result)
            } catch (error) {
              resultEnvelope = failedToolResult(error)
            }
            await client.postToolResult(
              event.callId,
              resultEnvelope,
              controller.signal,
            )
            break
          }
          case 'image-generated':
            setActivityMessage(
              event.status === 'completed'
                ? 'Generated image ready…'
                : 'Generating an image…',
            )
            break
          case 'turn-completed':
            sawTerminalEvent = true
            completedStatus = event.status
            break
          case 'error':
            throw new Error(event.message)
        }
      }

      try {
        await client.startTurn(
          {
            projectKey,
            model: selectedModelId,
            effort: selectedEffort,
            messages: nextMessages,
          },
          handleEvent,
          controller.signal,
        )

        if (sessionGenerationRef.current !== runGeneration) return false
        const finalization = finalizeAssistantTurn({
          sawTerminalEvent,
          completedStatus,
          cancelled: cancelRequestedRef.current,
          completedText,
          streamedText: assistantBuffer,
        })
        if (!finalization.ok) throw new Error(finalization.message)

        if (finalization.text) {
          const assistantMessage: AgentConversationMessage = {
            id: createMessageId(),
            role: 'assistant',
            text: finalization.text,
            createdAt: new Date().toISOString(),
          }
          setMessages(repository.append(projectKey, assistantMessage))
        }

        setStreamingText('')
        setActivityMessage(
          cancelRequestedRef.current || completedStatus === 'interrupted'
            ? 'Stopped'
            : null,
        )
        setPhase('connected')
        return true
      } catch (error) {
        if (sessionGenerationRef.current !== runGeneration) return false
        setStreamingText('')
        if (cancelRequestedRef.current || isAbortError(error)) {
          setActivityMessage('Stopped')
          setPhase('connected')
          return false
        }

        setActivityMessage(null)
        setErrorMessage(readErrorMessage(error))
        setPhase('error')
        return false
      } finally {
        if (sessionGenerationRef.current === runGeneration) {
          turnAbortRef.current = null
          activeTurnIdRef.current = null
        }
      }
    },
    [
      client,
      dispatchToolCall,
      phase,
      projectKey,
      repository,
      selectedEffort,
      selectedModelId,
    ],
  )

  const cancelTurn = useCallback(() => {
    if (phase !== 'running') return
    cancelRequestedRef.current = true
    const turnId = activeTurnIdRef.current
    if (turnId) void client.cancelTurn(turnId).catch(() => undefined)
    turnAbortRef.current?.abort()
  }, [client, phase])

  const clearConversation = useCallback(() => {
    if (phase === 'running') return
    repository.clear(projectKey)
    setMessages([])
  }, [phase, projectKey, repository])

  return {
    phase,
    messages,
    models,
    selectedModelId,
    selectedEffort,
    supportedEfforts,
    authUrl,
    errorMessage,
    activityMessage,
    streamingText,
    refreshStatus,
    startLogin,
    cancelLogin,
    logout,
    selectModel,
    setSelectedEffort,
    sendMessage,
    cancelTurn,
    clearConversation,
  }
}
