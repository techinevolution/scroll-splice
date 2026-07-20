import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react'

import {
  createBrowserAgentConversationRepository,
  type AgentConversationMessage,
} from '../agent/conversationRepository'

interface AgentChatPanelProps {
  readonly projectKey: string
}

function createMessageId() {
  return globalThis.crypto?.randomUUID?.() ?? `message-${Date.now()}`
}

export function AgentChatPanel({ projectKey }: AgentChatPanelProps) {
  const [repository] = useState(() =>
    createBrowserAgentConversationRepository(),
  )
  const [isOpen, setIsOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<readonly AgentConversationMessage[]>(
    () => repository.load(projectKey),
  )
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const transcriptEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    inputRef.current?.focus()
    transcriptEndRef.current?.scrollIntoView({ block: 'end' })
  }, [isOpen, messages.length])

  useEffect(() => {
    if (!isOpen) return

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      event.preventDefault()
      setIsOpen(false)
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [isOpen])

  const saveMessage = (event: FormEvent) => {
    event.preventDefault()
    const text = draft.trim()

    if (!text) return

    setMessages(
      repository.append(projectKey, {
        id: createMessageId(),
        role: 'user',
        text,
        createdAt: new Date().toISOString(),
      }),
    )
    setDraft('')
  }

  const clearConversation = () => {
    repository.clear(projectKey)
    setMessages([])
    inputRef.current?.focus()
  }

  return (
    <div className="agent-chat-root">
      <button
        className="agent-chat-trigger"
        type="button"
        aria-label={isOpen ? 'Close ScrollSplice agent chat' : 'Open ScrollSplice agent chat'}
        aria-expanded={isOpen}
        aria-controls="scrollsplice-agent-chat"
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="agent-chat-trigger-icon" aria-hidden="true">✦</span>
        <span>Agent</span>
      </button>

      {isOpen ? (
        <section
          className="agent-chat-panel"
          id="scrollsplice-agent-chat"
          aria-label="ScrollSplice agent chat"
        >
          <header className="agent-chat-heading">
            <div>
              <p>Project assistant</p>
              <h2>ScrollSplice Agent</h2>
            </div>
            <button
              className="agent-chat-close"
              type="button"
              aria-label="Close agent chat"
              onClick={() => setIsOpen(false)}
            >
              ×
            </button>
          </header>

          <div className="agent-chat-connection" role="status">
            <span aria-hidden="true" />
            Local preview · OpenAI not connected
          </div>

          <div className="agent-chat-transcript" aria-live="polite">
            <article className="agent-chat-message is-assistant">
              <span>ScrollSplice</span>
              <p>
                I’ll be able to inspect and edit this episode through the editor
                adapter. Until the OpenAI connection is added, messages you enter
                here are saved only in this browser for this project.
              </p>
            </article>

            {messages.map((message) => (
              <article
                className={`agent-chat-message is-${message.role}`}
                key={message.id}
              >
                <span>{message.role === 'user' ? 'You' : 'ScrollSplice'}</span>
                <p>{message.text}</p>
              </article>
            ))}
            <div ref={transcriptEndRef} />
          </div>

          <form className="agent-chat-composer" onSubmit={saveMessage}>
            <label htmlFor="agent-chat-message">Message about this episode</label>
            <textarea
              ref={inputRef}
              id="agent-chat-message"
              rows={3}
              value={draft}
              placeholder="Ask the agent to inspect or change the episode…"
              onChange={(event) => setDraft(event.currentTarget.value)}
            />
            <div className="agent-chat-composer-actions">
              <button
                className="agent-chat-clear"
                type="button"
                disabled={messages.length === 0}
                onClick={clearConversation}
              >
                Clear
              </button>
              <button
                className="agent-chat-save"
                type="submit"
                disabled={!draft.trim()}
                title="Saves locally until the OpenAI connection is added"
              >
                Save message
              </button>
            </div>
          </form>
        </section>
      ) : null}
    </div>
  )
}
