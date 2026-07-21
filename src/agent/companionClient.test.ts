import { describe, expect, it, vi } from 'vitest'

import {
  createCompanionClient,
  parseCompanionStatus,
  parseCompanionTurnEvent,
  type CompanionTurnEvent,
} from './companionClient'

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('local agent companion client', () => {
  it('treats a missing companion and the Vite fallback page as unavailable', async () => {
    const unreachable = createCompanionClient(
      vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      }) as typeof fetch,
    )
    const viteFallback = createCompanionClient(
      vi.fn(async () =>
        new Response('<!doctype html><title>ScrollSplice</title>', {
          headers: { 'Content-Type': 'text/html' },
        })) as typeof fetch,
    )

    await expect(unreachable.getStatus()).resolves.toEqual({ available: false })
    await expect(viteFallback.getStatus()).resolves.toEqual({ available: false })
  })

  it('parses connected model capabilities without retaining account details', () => {
    expect(
      parseCompanionStatus({
        available: true,
        connected: true,
        account: {
          type: 'chatgpt',
          email: 'not-retained@example.invalid',
          accessToken: 'never-retained',
        },
        models: [
          {
            id: 'gpt-5.6-terra',
            model: 'gpt-5.6-terra',
            displayName: 'GPT-5.6 Terra',
            description: 'Fast and capable',
            supportedReasoningEfforts: [
              { reasoningEffort: 'low', description: 'Fast' },
              { reasoningEffort: 'medium', description: 'Balanced' },
            ],
            defaultReasoningEffort: 'medium',
          },
        ],
        defaultModel: 'gpt-5.6-terra',
        defaultEffort: 'medium',
      }),
    ).toEqual({
      available: true,
      connected: true,
      models: [
        {
          id: 'gpt-5.6-terra',
          model: 'gpt-5.6-terra',
          displayName: 'GPT-5.6 Terra',
          description: 'Fast and capable',
          supportedReasoningEfforts: [
            { reasoningEffort: 'low', description: 'Fast' },
            { reasoningEffort: 'medium', description: 'Balanced' },
          ],
          defaultReasoningEffort: 'medium',
        },
      ],
      defaultModel: 'gpt-5.6-terra',
      defaultEffort: 'medium',
    })
  })

  it('starts and cancels login without exposing credentials in requests', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({ loginId: 'login-1', authUrl: 'https://example.test/login' }),
      )
      .mockResolvedValueOnce(jsonResponse({ status: 'canceled' }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }))
    const client = createCompanionClient(fetcher)

    await expect(client.startLogin()).resolves.toEqual({
      loginId: 'login-1',
      authUrl: 'https://example.test/login',
    })
    await client.cancelLogin('login-1')
    await client.logout()

    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      '/agent-api/login/cancel',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ loginId: 'login-1' }),
      }),
    )
    expect(JSON.stringify(fetcher.mock.calls)).not.toContain('accessToken')
  })

  it('streams normalized turn events and sends the bounded conversation body', async () => {
    const lines = [
      { type: 'run-started', turnId: 'turn-1' },
      { type: 'assistant-delta', delta: 'Hello ' },
      { type: 'delta', delta: 'creator.' },
      {
        type: 'tool-call',
        callId: 'call-1',
        name: 'scrollsplice.inspect_editor',
        arguments: {},
      },
      { type: 'assistant-completed', text: 'Hello creator.' },
      { type: 'turn-completed', turnId: 'turn-1', status: 'completed' },
    ]
    const response = new Response(
      `${lines.map((line) => JSON.stringify(line)).join('\n')}\n`,
      { headers: { 'Content-Type': 'application/x-ndjson' } },
    )
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response)
    const events: CompanionTurnEvent[] = []
    const client = createCompanionClient(fetcher)
    const messages = [
      {
        id: 'message-1',
        role: 'user' as const,
        text: 'Inspect the title.',
        createdAt: '2026-07-20T12:00:00.000Z',
      },
    ]

    await client.startTurn(
      {
        projectKey: 'episode:sample',
        model: 'gpt-5.6-terra',
        effort: 'medium',
        messages,
      },
      (event) => {
        events.push(event)
      },
    )

    expect(events.map(({ type }) => type)).toEqual([
      'run-started',
      'assistant-delta',
      'assistant-delta',
      'tool-call',
      'assistant-completed',
      'turn-completed',
    ])
    expect(fetcher).toHaveBeenCalledWith(
      '/agent-api/turn',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          projectKey: 'episode:sample',
          model: 'gpt-5.6-terra',
          effort: 'medium',
          messages,
        }),
      }),
    )
  })

  it('normalizes namespaced companion tool events', () => {
    expect(
      parseCompanionTurnEvent({
        type: 'tool-call',
        callId: 'call-2',
        namespace: 'scrollsplice',
        tool: 'apply_editor_command',
        arguments: { command: { type: 'undo' } },
      }),
    ).toEqual({
      type: 'tool-call',
      callId: 'call-2',
      name: 'scrollsplice.apply_editor_command',
      arguments: { command: { type: 'undo' } },
    })
  })

  it('posts tool results, retrieves generated image bytes, and cancels a turn', async () => {
    const image = new Uint8Array([137, 80, 78, 71])
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ ok: true }))
      .mockResolvedValueOnce(
        new Response(image, { headers: { 'Content-Type': 'image/png' } }),
      )
      .mockResolvedValueOnce(jsonResponse({ ok: true }))
    const client = createCompanionClient(fetcher)

    await client.postToolResult('call/1', { success: true, result: { ok: true } })
    const blob = await client.getGeneratedImage('generation/1')
    await client.cancelTurn('turn/1')

    expect(blob.type).toBe('image/png')
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(image)
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
      '/agent-api/tool-results/call%2F1',
      '/agent-api/generations/generation%2F1',
      '/agent-api/turns/turn%2F1/cancel',
    ])
  })
})
