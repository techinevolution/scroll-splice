import { describe, expect, it } from 'vitest'

import {
  createAgentConversationRepository,
  type AgentConversationMessage,
} from './conversationRepository'

function createStorage() {
  const values = new Map<string, string>()

  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  }
}

describe('agent conversation repository', () => {
  it('keeps messages scoped to their project and reloads them', () => {
    const storage = createStorage()
    const repository = createAgentConversationRepository(storage)
    const message: AgentConversationMessage = {
      id: 'message-1',
      role: 'user',
      text: 'Add a quiet rooftop panel.',
      createdAt: '2026-07-20T12:00:00.000Z',
    }

    repository.append('project-a', message)

    expect(repository.load('project-a')).toEqual([message])
    expect(repository.load('project-b')).toEqual([])
  })

  it('treats malformed stored data as an empty conversation', () => {
    const storage = createStorage()
    storage.setItem('scrollsplice-agent-conversation:project-a', '{broken')

    expect(createAgentConversationRepository(storage).load('project-a')).toEqual([])
  })

  it('clears only the requested project conversation', () => {
    const storage = createStorage()
    const repository = createAgentConversationRepository(storage)
    const message: AgentConversationMessage = {
      id: 'message-1',
      role: 'user',
      text: 'Keep this note.',
      createdAt: '2026-07-20T12:00:00.000Z',
    }

    repository.append('project-a', message)
    repository.append('project-b', message)
    repository.clear('project-a')

    expect(repository.load('project-a')).toEqual([])
    expect(repository.load('project-b')).toEqual([message])
  })
})
