import { describe, expect, it } from 'vitest'

import type { CompanionModel } from './companionClient'
import {
  chooseAgentModelSelection,
  finalizeAssistantTurn,
} from './useAgentSession'

function model(
  id: string,
  efforts: readonly string[],
  defaultReasoningEffort = efforts[0] ?? 'medium',
): CompanionModel {
  return {
    id,
    model: id,
    displayName: id.toUpperCase(),
    description: '',
    supportedReasoningEfforts: efforts.map((reasoningEffort) => ({
      reasoningEffort,
      description: '',
    })),
    defaultReasoningEffort,
  }
}

describe('agent model selection', () => {
  it('offers only GPT-5.5 and GPT-5.6 and respects an allowed live default', () => {
    expect(
      chooseAgentModelSelection({
        available: true,
        connected: true,
        models: [
          model('gpt-5.4', ['medium']),
          model('gpt-5.5', ['low', 'medium', 'high']),
          model('gpt-5.6-terra', ['low', 'medium']),
        ],
        defaultModel: 'gpt-5.6-terra',
        defaultEffort: 'high',
      }),
    ).toMatchObject({
      modelId: 'gpt-5.6-terra',
      effort: 'medium',
      models: [{ id: 'gpt-5.5' }, { id: 'gpt-5.6-terra' }],
    })
  })

  it('defaults to Medium when available and otherwise uses the model default', () => {
    expect(
      chooseAgentModelSelection({
        available: true,
        connected: true,
        models: [model('gpt-5.5', ['low', 'medium', 'high'], 'high')],
        defaultModel: null,
        defaultEffort: 'low',
      }).effort,
    ).toBe('medium')

    expect(
      chooseAgentModelSelection({
        available: true,
        connected: true,
        models: [model('gpt-5.6-sol', ['high', 'xhigh'], 'xhigh')],
        defaultModel: null,
        defaultEffort: 'medium',
      }).effort,
    ).toBe('xhigh')
  })
})

describe('assistant turn finalization', () => {
  it('refuses to persist partial text when the stream ends without a terminal event', () => {
    expect(
      finalizeAssistantTurn({
        sawTerminalEvent: false,
        completedStatus: 'completed',
        cancelled: false,
        completedText: null,
        streamedText: 'A partial answer that must not be saved',
      }),
    ).toMatchObject({
      ok: false,
      message: expect.stringContaining('No partial reply was saved'),
    })
  })

  it('persists one finalized reply only for a completed terminal turn', () => {
    expect(
      finalizeAssistantTurn({
        sawTerminalEvent: true,
        completedStatus: 'completed',
        cancelled: false,
        completedText: ' Final answer. ',
        streamedText: 'Partial',
      }),
    ).toEqual({ ok: true, text: 'Final answer.' })

    expect(
      finalizeAssistantTurn({
        sawTerminalEvent: true,
        completedStatus: 'interrupted',
        cancelled: true,
        completedText: null,
        streamedText: 'Cancelled partial text',
      }),
    ).toEqual({ ok: true, text: null })
  })

  it('rejects a failed terminal turn without persisting partial text', () => {
    expect(
      finalizeAssistantTurn({
        sawTerminalEvent: true,
        completedStatus: 'failed',
        cancelled: false,
        completedText: null,
        streamedText: 'Partial reply',
      }),
    ).toEqual({
      ok: false,
      message:
        'The local AI turn ended with status failed. No partial reply was saved.',
    })
  })
})
