import type { NormalizedPoint, SpeechBalloonElement } from './episode'

export const SPEECH_BALLOON_GENERATOR_ID =
  'scrollsplice-editable-speech-balloon-v1'

export const SPEECH_BALLOON_PRESETS = [
  { id: 'standard', label: 'Standard', description: 'Clean everyday dialogue' },
  { id: 'rounded', label: 'Rounded', description: 'Soft rounded dialogue' },
  { id: 'thought', label: 'Thought', description: 'Cloud-shaped inner thought' },
  { id: 'whisper', label: 'Whisper', description: 'Quiet dashed outline' },
  { id: 'shout', label: 'Shout', description: 'Strong burst outline' },
  { id: 'electric', label: 'Electric', description: 'Sharp energetic outline' },
  { id: 'rough', label: 'Rough', description: 'Uneven distressed outline' },
  { id: 'wavy', label: 'Wavy', description: 'Soft wavering outline' },
  { id: 'telepathic', label: 'Telepathic', description: 'Psychic ripple outline' },
  { id: 'double-outline', label: 'Double Outline', description: 'Emphasized double border' },
] as const

export type SpeechBalloonPresetId =
  (typeof SPEECH_BALLOON_PRESETS)[number]['id']

const PRESET_IDS = new Set<string>(
  SPEECH_BALLOON_PRESETS.map(({ id }) => id),
)

export function getSpeechBalloonPreset(
  presetId: SpeechBalloonPresetId,
) {
  return SPEECH_BALLOON_PRESETS.find(({ id }) => id === presetId) ??
    SPEECH_BALLOON_PRESETS[0]
}

export function getSpeechBalloonGeneratorId(
  presetId: SpeechBalloonPresetId,
): string {
  return presetId === 'standard'
    ? SPEECH_BALLOON_GENERATOR_ID
    : `${SPEECH_BALLOON_GENERATOR_ID}:${presetId}`
}

export function parseSpeechBalloonPresetId(
  generatorId: string,
): SpeechBalloonPresetId | undefined {
  if (generatorId === SPEECH_BALLOON_GENERATOR_ID) return 'standard'
  const prefix = `${SPEECH_BALLOON_GENERATOR_ID}:`
  if (!generatorId.startsWith(prefix)) return undefined
  const presetId = generatorId.slice(prefix.length)
  return PRESET_IDS.has(presetId)
    ? (presetId as SpeechBalloonPresetId)
    : undefined
}

export function getSpeechBalloonPresetId(
  element: Pick<SpeechBalloonElement, 'assetReference'>,
): SpeechBalloonPresetId {
  return element.assetReference.kind === 'synthetic'
    ? parseSpeechBalloonPresetId(element.assetReference.generatorId) ?? 'standard'
    : 'standard'
}

export function getDefaultSpeechBalloonBodyControlPoints(
  presetId: SpeechBalloonPresetId,
): readonly NormalizedPoint[] {
  const scales =
    presetId === 'shout'
      ? [1, 0.72, 1, 0.68, 1, 0.74, 1, 0.7, 1, 0.72, 1, 0.68]
      : presetId === 'electric'
        ? [1, 0.8, 1, 0.8, 1, 0.8, 1, 0.8, 1, 0.8, 1, 0.8]
        : presetId === 'thought'
          ? [1, 0.9, 1, 0.9, 1, 0.9, 1, 0.9, 1, 0.9, 1, 0.9]
          : presetId === 'wavy'
            ? [1, 0.94, 1, 0.94, 1, 0.94, 1, 0.94, 1, 0.94, 1, 0.94]
            : [1, 1, 1, 1, 1, 1, 1, 1]
  return scales.map((scale, index) => {
    const angle = -Math.PI / 2 + (index / scales.length) * Math.PI * 2
    return {
      x: 0.5 + Math.cos(angle) * 0.5 * scale,
      y: 0.5 + Math.sin(angle) * 0.5 * scale,
    }
  })
}

export function normalizeSpeechBalloonBodyControlPoints(
  value: unknown,
): readonly NormalizedPoint[] | undefined {
  if (!Array.isArray(value) || value.length < 6 || value.length > 32) {
    return undefined
  }
  const points = value.map((point) => {
    if (
      typeof point !== 'object' ||
      point === null ||
      !('x' in point) ||
      !('y' in point) ||
      typeof point.x !== 'number' ||
      typeof point.y !== 'number' ||
      !Number.isFinite(point.x) ||
      !Number.isFinite(point.y)
    ) {
      return undefined
    }
    return {
      x: Math.max(0, Math.min(1, point.x)),
      y: Math.max(0, Math.min(1, point.y)),
    }
  })
  return points.every(Boolean) ? (points as readonly NormalizedPoint[]) : undefined
}
