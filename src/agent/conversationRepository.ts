export type AgentConversationRole = 'user' | 'assistant'

export interface AgentConversationMessage {
  readonly id: string
  readonly role: AgentConversationRole
  readonly text: string
  readonly createdAt: string
}

interface StoredConversation {
  readonly version: 1
  readonly messages: readonly AgentConversationMessage[]
}

export interface AgentConversationRepository {
  readonly load: (projectKey: string) => readonly AgentConversationMessage[]
  readonly append: (
    projectKey: string,
    message: AgentConversationMessage,
  ) => readonly AgentConversationMessage[]
  readonly clear: (projectKey: string) => void
}

const STORAGE_PREFIX = 'scrollsplice-agent-conversation:'

function isConversationMessage(value: unknown): value is AgentConversationMessage {
  if (!value || typeof value !== 'object') return false

  const message = value as Partial<AgentConversationMessage>
  return (
    typeof message.id === 'string' &&
    (message.role === 'user' || message.role === 'assistant') &&
    typeof message.text === 'string' &&
    typeof message.createdAt === 'string'
  )
}

function parseConversation(rawValue: string | null) {
  if (!rawValue) return []

  try {
    const parsed = JSON.parse(rawValue) as Partial<StoredConversation>

    if (
      parsed.version !== 1 ||
      !Array.isArray(parsed.messages) ||
      !parsed.messages.every(isConversationMessage)
    ) {
      return []
    }

    return parsed.messages
  } catch {
    return []
  }
}

export function createAgentConversationRepository(
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>,
): AgentConversationRepository {
  const storageKey = (projectKey: string) => `${STORAGE_PREFIX}${projectKey}`

  return {
    load: (projectKey) => parseConversation(storage.getItem(storageKey(projectKey))),
    append: (projectKey, message) => {
      const messages = [
        ...parseConversation(storage.getItem(storageKey(projectKey))),
        message,
      ]
      const conversation: StoredConversation = { version: 1, messages }
      storage.setItem(storageKey(projectKey), JSON.stringify(conversation))
      return messages
    },
    clear: (projectKey) => storage.removeItem(storageKey(projectKey)),
  }
}

export function createBrowserAgentConversationRepository() {
  return createAgentConversationRepository(window.localStorage)
}
