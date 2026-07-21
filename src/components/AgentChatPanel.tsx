import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react'

import { useAgentSession } from '../agent/useAgentSession'

interface AgentChatPanelProps {
  readonly projectKey: string
}

export function AgentChatPanel({ projectKey }: AgentChatPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const session = useAgentSession(projectKey)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const transcriptEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    if (session.phase === 'connected') inputRef.current?.focus()
    transcriptEndRef.current?.scrollIntoView({ block: 'end' })
  }, [
    isOpen,
    session.messages.length,
    session.phase,
    session.streamingText,
  ])

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

  const sendMessage = (event: FormEvent) => {
    event.preventDefault()
    const text = draft.trim()
    if (!text || session.phase !== 'connected') return

    setDraft('')
    void session.sendMessage(text)
  }

  const connected =
    session.phase === 'connected' || session.phase === 'running'
  const hasPermittedModel = session.models.length > 0

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
          className={`agent-chat-panel is-${session.phase}`}
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

          {session.phase === 'checking' ? (
            <div className="agent-chat-empty" role="status">
              <span className="agent-chat-progress" aria-hidden="true" />
              <p>Checking the local AI companion…</p>
            </div>
          ) : null}

          {session.phase === 'unavailable' ? (
            <div className="agent-chat-empty">
              <p>
                AI needs the local ScrollSplice build. The hosted human editor
                remains fully available without it.
              </p>
              <button type="button" onClick={() => void session.refreshStatus()}>
                Check again
              </button>
            </div>
          ) : null}

          {session.phase === 'disconnected' ? (
            <div className="agent-chat-empty is-connect">
              <button
                className="agent-chat-connect"
                type="button"
                onClick={() => void session.startLogin()}
              >
                Click here to connect your OpenAI account.
              </button>
            </div>
          ) : null}

          {session.phase === 'authorizing' ? (
            <div className="agent-chat-empty is-authorizing" role="status">
              <span className="agent-chat-progress" aria-hidden="true" />
              <p>{session.activityMessage ?? 'Waiting for OpenAI sign-in…'}</p>
              {session.authUrl ? (
                <a
                  className="agent-chat-authorize-link"
                  href={session.authUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Continue to OpenAI
                </a>
              ) : null}
              <button
                className="agent-chat-secondary-action"
                type="button"
                onClick={() => void session.cancelLogin()}
              >
                Cancel
              </button>
            </div>
          ) : null}

          {session.phase === 'error' ? (
            <div className="agent-chat-empty is-error" role="alert">
              <p>{session.errorMessage}</p>
              <button type="button" onClick={() => void session.refreshStatus()}>
                Try again
              </button>
            </div>
          ) : null}

          {connected ? (
            <>
              <div className="agent-chat-connection" role="status">
                <span aria-hidden="true" />
                <strong>
                  {session.phase === 'running'
                    ? session.activityMessage ?? 'Working…'
                    : 'OpenAI connected'}
                </strong>
                <button
                  type="button"
                  disabled={session.phase === 'running'}
                  onClick={() => void session.logout()}
                >
                  Disconnect
                </button>
              </div>

              <div className="agent-chat-model-controls">
                <label>
                  <span>Model</span>
                  <select
                    aria-label="OpenAI model"
                    value={session.selectedModelId}
                    disabled={session.phase === 'running'}
                    onChange={(event) =>
                      session.selectModel(event.currentTarget.value)
                    }
                  >
                    {session.models.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.displayName}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Reasoning</span>
                  <select
                    aria-label="Reasoning effort"
                    value={session.selectedEffort}
                    disabled={session.phase === 'running'}
                    onChange={(event) =>
                      session.setSelectedEffort(event.currentTarget.value)
                    }
                  >
                    {session.supportedEfforts.map((effort) => (
                      <option
                        key={effort.reasoningEffort}
                        value={effort.reasoningEffort}
                      >
                        {effort.reasoningEffort.charAt(0).toUpperCase() +
                          effort.reasoningEffort.slice(1)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="agent-chat-transcript" aria-live="polite">
                {session.messages.length === 0 && !session.streamingText ? (
                  <div className="agent-chat-transcript-empty">
                    Ask ScrollSplice to inspect the current episode or make a
                    precise edit.
                  </div>
                ) : null}

                {session.messages.map((message) => (
                  <article
                    className={`agent-chat-message is-${message.role}`}
                    key={message.id}
                  >
                    <span>{message.role === 'user' ? 'You' : 'ScrollSplice'}</span>
                    <p>{message.text}</p>
                  </article>
                ))}

                {session.streamingText ? (
                  <article className="agent-chat-message is-assistant is-streaming">
                    <span>ScrollSplice</span>
                    <p>{session.streamingText}</p>
                  </article>
                ) : null}
                <div ref={transcriptEndRef} />
              </div>

              <form className="agent-chat-composer" onSubmit={sendMessage}>
                {!hasPermittedModel ? (
                  <p className="agent-chat-model-warning" role="alert">
                    This account does not currently offer GPT-5.5 or GPT-5.6 in
                    Codex.
                  </p>
                ) : null}
                <label htmlFor="agent-chat-message">Message about this episode</label>
                <textarea
                  ref={inputRef}
                  id="agent-chat-message"
                  rows={3}
                  value={draft}
                  disabled={session.phase === 'running' || !hasPermittedModel}
                  placeholder="Ask the agent to inspect or change the episode…"
                  onChange={(event) => setDraft(event.currentTarget.value)}
                />
                <div className="agent-chat-composer-actions">
                  <button
                    className="agent-chat-clear"
                    type="button"
                    disabled={
                      session.phase === 'running' || session.messages.length === 0
                    }
                    onClick={session.clearConversation}
                  >
                    Clear
                  </button>
                  {session.phase === 'running' ? (
                    <button
                      className="agent-chat-stop"
                      type="button"
                      onClick={session.cancelTurn}
                    >
                      Stop
                    </button>
                  ) : (
                    <button
                      className="agent-chat-send"
                      type="submit"
                      disabled={!draft.trim() || !hasPermittedModel}
                    >
                      Send
                    </button>
                  )}
                </div>
              </form>
            </>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
