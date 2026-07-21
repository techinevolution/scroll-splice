import {
  createEditorAdapter,
  type EditorAdapterCommand,
  type EditorAdapterResult,
  type EditorAdapterSnapshot,
  type GeneratedAssetImportMetadata,
  type ScrollSpliceEditorAdapter,
} from '../automation/editorAdapter'
import { SPEECH_BALLOON_PRESETS } from '../core/speechBalloonPresets'

const SPEECH_BALLOON_PRESET_IDS = new Set<string>(
  SPEECH_BALLOON_PRESETS.map(({ id }) => id),
)
import type { GeneratedImageSource } from '../automation/generatedImageSource'

export const EDITOR_TOOL_NUMERIC_LIMITS = Object.freeze({
  maxRevision: Number.MAX_SAFE_INTEGER,
  maxOrderIndex: 10_000,
  minZoomFactor: 0.5,
  maxZoomFactor: 2,
  minEpisodeLogicalHeight: 1_280,
  maxEpisodeLogicalHeight: 1_000_000,
  minElementSize: 24,
  maxLogicalCoordinate: 1_000_000,
  maxLogicalLength: 1_000_000,
  maxStrokeWidth: 100,
  maxCornerRadius: 500_000,
  minTextFontSize: 8,
  maxTextFontSize: 200,
  minLineHeight: 0.8,
  maxLineHeight: 2.5,
  maxPadding: 500_000,
  minRotationDegrees: -180,
  maxRotationDegrees: 180,
  minCropZoom: 1,
  maxCropZoom: 4,
  minTailAnchor: 0.1,
  maxTailAnchor: 0.9,
  minTailWidth: 0.04,
  maxTailWidth: 0.5,
  minTailTip: -1,
  maxTailTip: 2,
})

export const EDITOR_TOOL_NAMES = [
  'scrollsplice.inspect_editor',
  'scrollsplice.apply_editor_command',
  'scrollsplice.import_latest_generated_asset',
  'scrollsplice.place_generated_asset',
] as const

export type EditorToolName = (typeof EDITOR_TOOL_NAMES)[number]

export interface EditorToolCall {
  readonly name: string
  readonly arguments: unknown
}

export type EditorToolFailureCode =
  | 'unknown-tool'
  | 'invalid-arguments'
  | 'forbidden-command'
  | 'wrong-episode'
  | 'stale-revision'
  | 'stale-context'
  | 'adapter-error'

export type EditorToolDispatchResult =
  | {
      readonly ok: true
      readonly tool: EditorToolName
      readonly snapshot: EditorAdapterSnapshot
      readonly command?: string
      readonly changed?: boolean
      readonly createdId?: string
    }
  | {
      readonly ok: false
      readonly tool: string
      readonly code: EditorToolFailureCode | string
      readonly message: string
      readonly snapshot: EditorAdapterSnapshot
      readonly command?: string
    }

export type EditorToolDispatcher = (
  call: EditorToolCall,
) => Promise<EditorToolDispatchResult>

const FORBIDDEN_LIFECYCLE_COMMANDS = new Set([
  'save',
  'save-as',
  'reopen',
  'new-episode',
  'reset-demo',
])

const NO_ARGUMENT_COMMANDS = new Set([
  'clear-selection',
  'select-all-in-plane',
  'extend-episode',
  'group-selection',
  'ungroup-selection',
  'undo',
  'redo',
])

const SELECTION_DEPENDENT_COMMANDS = new Set([
  'nudge-selection',
  'group-selection',
  'ungroup-selection',
  'align-selection',
  'move-story-beat',
])

const ACTIVE_PLANE_DEPENDENT_COMMANDS = new Set(['select-all-in-plane'])

const COMPOSITION_GROUPS = new Set(['background', 'content', 'foreground'])
const BLEND_MODES = new Set([
  'normal',
  'multiply',
  'screen',
  'overlay',
  'soft-light',
])
const IMAGE_MEDIA_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])

export function createEditorToolDispatcher(
  adapter: ScrollSpliceEditorAdapter = createEditorAdapter(),
): EditorToolDispatcher {
  return async (call) => {
    const snapshot = adapter.inspect()

    if (!isRecord(call) || typeof call.name !== 'string') {
      return failure(
        'unknown',
        'invalid-arguments',
        'The editor tool call is malformed.',
        snapshot,
      )
    }

    if (!isEditorToolName(call.name)) {
      return failure(
        call.name,
        'unknown-tool',
        `Unknown editor tool “${call.name}”.`,
        snapshot,
      )
    }

    if (call.name === 'scrollsplice.inspect_editor') {
      if (!isRecordWithKeys(call.arguments, [])) {
        return failure(
          call.name,
          'invalid-arguments',
          'Inspect editor does not accept arguments.',
          adapter.inspect(),
        )
      }

      return { ok: true, tool: call.name, snapshot: adapter.inspect() }
    }

    const binding = parseMutationBinding(call.arguments)
    if (!binding.ok) {
      return failure(
        call.name,
        'invalid-arguments',
        binding.message,
        adapter.inspect(),
      )
    }

    const bindingFailure = checkMutationBinding(
      call.name,
      binding.episodeId,
      binding.expectedRevision,
      adapter.inspect(),
    )
    if (bindingFailure) return bindingFailure

    if (call.name === 'scrollsplice.apply_editor_command') {
      const input = call.arguments
      if (!isRecord(input) || !exactOptional(
        input,
        ['episodeId', 'expectedRevision', 'command'],
        ['expectedSelection', 'expectedActive'],
      )) {
        return failure(
          call.name,
          'invalid-arguments',
          'Apply editor command received unsupported fields.',
          adapter.inspect(),
        )
      }

      const commandType = isRecord(input.command) ? input.command.type : undefined
      if (
        typeof commandType === 'string' &&
        FORBIDDEN_LIFECYCLE_COMMANDS.has(commandType)
      ) {
        return failure(
          call.name,
          'forbidden-command',
          `The ${commandType} project lifecycle action is not available to the agent.`,
          adapter.inspect(),
          commandType,
        )
      }

      const command = parseEditorCommand(input.command)
      if (!command) {
        return failure(
          call.name,
          'invalid-arguments',
          'The editor command is unknown or malformed.',
          adapter.inspect(),
          typeof commandType === 'string' ? commandType : undefined,
        )
      }

      if (SELECTION_DEPENDENT_COMMANDS.has(command.type)) {
        const expectedSelection = parseExpectedSelection(input.expectedSelection)
        const currentSelection = adapter.inspect().selection
        if (
          !expectedSelection ||
          expectedSelection.primaryElementId !== currentSelection.primaryElementId ||
          !sameIds(expectedSelection.elementIds, currentSelection.elementIds)
        ) {
          return failure(
            call.name,
            'stale-context',
            'The editor selection changed after inspection. Inspect again and include the exact expectedSelection before using a selection-based command.',
            adapter.inspect(),
            command.type,
          )
        }
      }

      if (ACTIVE_PLANE_DEPENDENT_COMMANDS.has(command.type)) {
        const expectedActive = parseExpectedActive(input.expectedActive)
        const currentActive = adapter.inspect().active
        if (
          !expectedActive ||
          expectedActive.group !== currentActive.group ||
          expectedActive.planeId !== currentActive.planeId
        ) {
          return failure(
            call.name,
            'stale-context',
            'The active layer plane changed after inspection. Inspect again and include the exact expectedActive before using this command.',
            adapter.inspect(),
            command.type,
          )
        }
      }

      try {
        return fromAdapterResult(call.name, adapter.execute(command))
      } catch {
        return failure(
          call.name,
          'adapter-error',
          'The editor rejected the command before it could be completed.',
          adapter.inspect(),
          command.type,
        )
      }
    }

    if (call.name === 'scrollsplice.import_latest_generated_asset') {
      const input = parseGeneratedImport(call.arguments)
      if (!input) {
        return failure(
          call.name,
          'invalid-arguments',
          'The generated image source or provenance metadata is malformed.',
          adapter.inspect(),
        )
      }

      try {
        return fromAdapterResult(
          call.name,
          await adapter.executeAsync({
            type: 'import-generated-asset',
            source: input.source,
            metadata: input.metadata,
          }),
        )
      } catch {
        return failure(
          call.name,
          'adapter-error',
          'The generated image could not be imported.',
          adapter.inspect(),
          'import-generated-asset',
        )
      }
    }

    const placement = parseGeneratedPlacement(call.arguments)
    if (!placement) {
      return failure(
        call.name,
        'invalid-arguments',
        'Generated image placement requires stable asset and plane IDs plus finite positive bounds.',
        adapter.inspect(),
      )
    }

    try {
      return fromAdapterResult(
        call.name,
        await adapter.executeAsync({
          type: 'place-generated-asset',
          assetId: placement.assetId,
          planeId: placement.planeId,
          bounds: placement.bounds,
        }),
      )
    } catch {
      return failure(
        call.name,
        'adapter-error',
        'The generated image could not be placed.',
        adapter.inspect(),
        'place-generated-asset',
      )
    }
  }
}

const defaultDispatcher = createEditorToolDispatcher()

export function dispatchEditorToolCall(
  call: EditorToolCall,
): Promise<EditorToolDispatchResult> {
  return defaultDispatcher(call)
}

function isEditorToolName(name: string): name is EditorToolName {
  return EDITOR_TOOL_NAMES.some((candidate) => candidate === name)
}

function parseMutationBinding(value: unknown):
  | { readonly ok: true; readonly episodeId: string; readonly expectedRevision: number }
  | { readonly ok: false; readonly message: string } {
  if (
    !isRecord(value) ||
    !isSafeId(value.episodeId) ||
    !isBoundedInteger(
      value.expectedRevision,
      0,
      EDITOR_TOOL_NUMERIC_LIMITS.maxRevision,
    )
  ) {
    return {
      ok: false,
      message: 'Mutating editor tools require a stable episodeId and non-negative expectedRevision from inspect.',
    }
  }

  return {
    ok: true,
    episodeId: value.episodeId,
    expectedRevision: value.expectedRevision as number,
  }
}

function checkMutationBinding(
  tool: EditorToolName,
  episodeId: string,
  expectedRevision: number,
  snapshot: EditorAdapterSnapshot,
): EditorToolDispatchResult | undefined {
  if (snapshot.episode.id !== episodeId) {
    return failure(
      tool,
      'wrong-episode',
      'The active episode changed. Inspect the editor again before editing.',
      snapshot,
    )
  }

  if (snapshot.editor.currentRevision !== expectedRevision) {
    return failure(
      tool,
      'stale-revision',
      'The episode changed after the last inspection. Inspect it again before editing.',
      snapshot,
    )
  }

  return undefined
}

function parseEditorCommand(value: unknown): EditorAdapterCommand | undefined {
  if (!isRecord(value) || typeof value.type !== 'string') return undefined
  if (FORBIDDEN_LIFECYCLE_COMMANDS.has(value.type)) return undefined

  if (value.type === 'create-positioned-text') {
    const normalized = normalizePositionedTextCommand(value)
    if (normalized) return normalized
  }

  if (NO_ARGUMENT_COMMANDS.has(value.type)) {
    return isRecordWithKeys(value, ['type'])
      ? (value as unknown as EditorAdapterCommand)
      : undefined
  }

  const valid = (() => {
    switch (value.type) {
      case 'set-active-group':
      case 'create-plane':
        return exact(value, ['type', 'group']) && COMPOSITION_GROUPS.has(value.group as string)
      case 'set-active-plane':
      case 'delete-plane':
        return exact(value, ['type', 'planeId']) && isSafeId(value.planeId)
      case 'set-viewport':
        return exact(value, ['type', 'position']) &&
          isPosition(value.position, 0, EDITOR_TOOL_NUMERIC_LIMITS.maxLogicalCoordinate)
      case 'pan-viewport':
      case 'nudge-selection':
        return exact(value, ['type', 'delta']) && isPosition(value.delta)
      case 'set-zoom':
        return exact(value, ['type', 'zoomFactor']) &&
          isBoundedNumber(
            value.zoomFactor,
            EDITOR_TOOL_NUMERIC_LIMITS.minZoomFactor,
            EDITOR_TOOL_NUMERIC_LIMITS.maxZoomFactor,
          )
      case 'select-element':
        return exactOptional(value, ['type', 'elementId'], ['reveal', 'toggle']) &&
          isSafeId(value.elementId) && optionalBoolean(value.reveal) && optionalBoolean(value.toggle)
      case 'set-episode-name':
        return exact(value, ['type', 'name']) && isSafeText(value.name, 60, true)
      case 'resize-episode':
        return exactOptional(value, ['type', 'logicalHeight'], ['pinViewportToEnd']) &&
          isBoundedNumber(
            value.logicalHeight,
            EDITOR_TOOL_NUMERIC_LIMITS.minEpisodeLogicalHeight,
            EDITOR_TOOL_NUMERIC_LIMITS.maxEpisodeLogicalHeight,
          ) && optionalBoolean(value.pinViewportToEnd)
      case 'rename-plane':
        return exact(value, ['type', 'planeId', 'name']) && isSafeId(value.planeId) && isSafeText(value.name, 32, false)
      case 'reorder-plane':
        return exact(value, ['type', 'planeId', 'targetIndex']) && isSafeId(value.planeId) &&
          isBoundedInteger(value.targetIndex, 0, EDITOR_TOOL_NUMERIC_LIMITS.maxOrderIndex)
      case 'set-plane-visibility':
        return exact(value, ['type', 'planeId', 'visible']) && isSafeId(value.planeId) && typeof value.visible === 'boolean'
      case 'set-group-visibility':
        return exact(value, ['type', 'group', 'visible']) && COMPOSITION_GROUPS.has(value.group as string) && typeof value.visible === 'boolean'
      case 'set-base-color':
        return exact(value, ['type', 'color']) && isSafeText(value.color, 128, true)
      case 'rename-element':
        return exact(value, ['type', 'elementId', 'name']) && isSafeId(value.elementId) && isSafeText(value.name, 80, true)
      case 'set-element-visibility':
      case 'set-element-lock':
        return exact(value, ['type', 'elementId', value.type === 'set-element-lock' ? 'locked' : 'visible']) &&
          isSafeId(value.elementId) &&
          typeof value[value.type === 'set-element-lock' ? 'locked' : 'visible'] === 'boolean'
      case 'delete-element':
        return exact(value, ['type', 'elementId']) && isSafeId(value.elementId)
      case 'duplicate-element':
        return exactOptional(value, ['type', 'elementId'], ['offset']) && isSafeId(value.elementId) &&
          (value.offset === undefined || isPosition(value.offset))
      case 'move-element':
        return exact(value, ['type', 'elementId', 'position']) && isSafeId(value.elementId) && isPosition(value.position)
      case 'resize-element':
        return exact(value, ['type', 'elementId', 'bounds']) && isSafeId(value.elementId) && isElementBounds(value.bounds)
      case 'align-selection':
        return exact(value, ['type', 'alignment']) && isAlignment(value.alignment)
      case 'move-element-in-stack':
        return exact(value, ['type', 'elementId', 'direction']) && isSafeId(value.elementId) &&
          (value.direction === 'backward' || value.direction === 'forward')
      case 'reorder-element-in-stack':
        return exact(value, ['type', 'elementId', 'targetIndex']) && isSafeId(value.elementId) &&
          isBoundedInteger(value.targetIndex, 0, EDITOR_TOOL_NUMERIC_LIMITS.maxOrderIndex)
      case 'move-element-to-plane':
        return exact(value, ['type', 'elementId', 'planeId']) && isSafeId(value.elementId) && isSafeId(value.planeId)
      case 'set-element-opacity':
        return exact(value, ['type', 'elementId', 'opacity']) && isSafeId(value.elementId) &&
          isBoundedNumber(value.opacity, 0, 1)
      case 'set-element-blend-mode':
        return exact(value, ['type', 'elementId', 'blendMode']) && isSafeId(value.elementId) && BLEND_MODES.has(value.blendMode as string)
      case 'set-element-transform':
        return exact(value, ['type', 'elementId', 'transform']) && isSafeId(value.elementId) && isTransform(value.transform)
      case 'flip-element':
        return exact(value, ['type', 'elementId', 'axis']) && isSafeId(value.elementId) &&
          (value.axis === 'horizontal' || value.axis === 'vertical')
      case 'set-element-overflow':
        return exact(value, ['type', 'elementId', 'overflow']) && isSafeId(value.elementId) &&
          (value.overflow === 'constrained' || value.overflow === 'bleed')
      case 'create-text':
        return exact(value, ['type', 'planeId']) && isSafeId(value.planeId)
      case 'create-positioned-text':
        return exact(value, ['type', 'planeId', 'bounds', 'input']) &&
          isSafeId(value.planeId) && isElementBounds(value.bounds) &&
          isTextUpdate(value.input)
      case 'create-positioned-shape':
        return exact(value, [
          'type', 'planeId', 'name', 'bounds', 'shape', 'fill', 'stroke',
          'strokeWidth', 'cornerRadius',
        ]) && isSafeId(value.planeId) && isSafeText(value.name, 80, true) &&
          isElementBounds(value.bounds) &&
          (value.shape === 'rectangle' || value.shape === 'ellipse') &&
          isSafeText(value.fill, 128, true) &&
          (value.stroke === null || isSafeText(value.stroke, 128, true)) &&
          isBoundedNumber(value.strokeWidth, 0, EDITOR_TOOL_NUMERIC_LIMITS.maxStrokeWidth) &&
          isBoundedNumber(value.cornerRadius, 0, EDITOR_TOOL_NUMERIC_LIMITS.maxCornerRadius)
      case 'create-speech-balloon':
        return exactOptional(value, ['type', 'planeId'], ['presetId']) &&
          isSafeId(value.planeId) &&
          (value.presetId === undefined ||
            SPEECH_BALLOON_PRESET_IDS.has(value.presetId as string))
      case 'create-background-region':
        return exact(value, ['type', 'planeId', 'fill', 'startY', 'height']) && isSafeId(value.planeId) &&
          isSafeText(value.fill, 128, true) &&
          isBoundedNumber(value.startY, 0, EDITOR_TOOL_NUMERIC_LIMITS.maxEpisodeLogicalHeight) &&
          isBoundedNumber(value.height, Number.MIN_VALUE, EDITOR_TOOL_NUMERIC_LIMITS.maxLogicalLength)
      case 'place-built-in-asset':
      case 'place-imported-asset':
        return exact(value, ['type', 'planeId', 'assetId']) && isSafeId(value.planeId) && isSafeId(value.assetId)
      case 'set-shape-fill':
        return exact(value, ['type', 'elementId', 'fill']) && isSafeId(value.elementId) && isShapeFill(value.fill)
      case 'update-shape-style':
        return exact(value, ['type', 'elementId', 'input']) && isSafeId(value.elementId) && isShapeStyle(value.input)
      case 'update-text':
        return exact(value, ['type', 'elementId', 'input']) && isSafeId(value.elementId) && isTextUpdate(value.input)
      case 'update-speech-balloon':
        return exact(value, ['type', 'elementId', 'input']) && isSafeId(value.elementId) && isBalloonUpdate(value.input)
      case 'set-image-presentation':
        return exact(value, ['type', 'elementId', 'presentation']) && isSafeId(value.elementId) &&
          ['single', 'tile', 'cover'].includes(value.presentation as string)
      case 'set-image-frame':
        return exact(value, ['type', 'elementId', 'frame']) && isSafeId(value.elementId) && isImageFrame(value.frame)
      case 'set-image-crop':
        return exact(value, ['type', 'elementId', 'crop']) && isSafeId(value.elementId) && isImageCrop(value.crop)
      case 'move-story-beat':
        return exact(value, ['type', 'direction']) && (value.direction === 'up' || value.direction === 'down')
      case 'set-magnet':
        return exact(value, ['type', 'enabled']) && typeof value.enabled === 'boolean'
      case 'set-slice-guides':
        return exact(value, ['type', 'visible']) && typeof value.visible === 'boolean'
      default:
        return false
    }
  })()

  return valid ? (value as unknown as EditorAdapterCommand) : undefined
}

function normalizePositionedTextCommand(
  value: Record<string, unknown>,
): Extract<EditorAdapterCommand, { readonly type: 'create-positioned-text' }> | undefined {
  if (!isSafeId(value.planeId) || !isElementBounds(value.bounds)) return undefined

  if (
    exact(value, ['type', 'planeId', 'bounds', 'input']) &&
    isTextUpdate(value.input)
  ) {
    return value as unknown as Extract<
      EditorAdapterCommand,
      { readonly type: 'create-positioned-text' }
    >
  }

  if (
    !exact(value, ['type', 'planeId', 'bounds', 'text', 'style']) ||
    !isSafeText(value.text, 2_000, true) ||
    !isRecord(value.style) ||
    !exactOptional(
      value.style,
      ['fontSize', 'fontWeight', 'color', 'textAlign'],
      ['fontFamily'],
    ) ||
    !isBoundedNumber(
      value.style.fontSize,
      EDITOR_TOOL_NUMERIC_LIMITS.minTextFontSize,
      EDITOR_TOOL_NUMERIC_LIMITS.maxTextFontSize,
    ) ||
    ![400, 600, 700].includes(value.style.fontWeight as number) ||
    !isSafeText(value.style.color, 128, true) ||
    !['left', 'center', 'right'].includes(value.style.textAlign as string) ||
    (value.style.fontFamily !== undefined &&
      !isSafeText(value.style.fontFamily, 128, true))
  ) {
    return undefined
  }

  return {
    type: 'create-positioned-text',
    planeId: value.planeId,
    bounds: value.bounds,
    input: {
      text: value.text,
      fill: value.style.color,
      fontSize: value.style.fontSize,
      fontWeight: value.style.fontWeight as 400 | 600 | 700,
      align: value.style.textAlign as 'left' | 'center' | 'right',
    },
  }
}

function parseGeneratedImport(value: unknown):
  | { readonly source: GeneratedImageSource; readonly metadata: GeneratedAssetImportMetadata }
  | undefined {
  if (
    !isRecordWithKeys(value, [
      'episodeId',
      'expectedRevision',
      'source',
      'metadata',
    ]) ||
    !isGeneratedSource(value.source) ||
    !isGeneratedMetadata(value.metadata)
  ) {
    return undefined
  }

  return {
    source: value.source,
    metadata: value.metadata,
  }
}

function parseGeneratedPlacement(value: unknown):
  | {
      readonly assetId: string
      readonly planeId: string
      readonly bounds: { readonly x: number; readonly y: number; readonly width: number; readonly height: number }
    }
  | undefined {
  if (
    !isRecordWithKeys(value, [
      'episodeId',
      'expectedRevision',
      'assetId',
      'planeId',
      'bounds',
    ]) ||
    !isSafeId(value.assetId) ||
    !isSafeId(value.planeId) ||
    !isElementBounds(value.bounds)
  ) {
    return undefined
  }

  return { assetId: value.assetId, planeId: value.planeId, bounds: value.bounds }
}

function parseExpectedSelection(value: unknown):
  | {
      readonly primaryElementId: string | null
      readonly elementIds: readonly string[]
    }
  | undefined {
  if (
    !isRecordWithKeys(value, ['primaryElementId', 'elementIds']) ||
    (value.primaryElementId !== null && !isSafeId(value.primaryElementId)) ||
    !Array.isArray(value.elementIds) ||
    value.elementIds.length > 1_000 ||
    !value.elementIds.every(isSafeId) ||
    new Set(value.elementIds).size !== value.elementIds.length ||
    (value.primaryElementId !== null && !value.elementIds.includes(value.primaryElementId))
  ) {
    return undefined
  }

  return {
    primaryElementId: value.primaryElementId,
    elementIds: value.elementIds,
  }
}

function parseExpectedActive(value: unknown):
  | { readonly group: 'background' | 'content' | 'foreground'; readonly planeId: string }
  | undefined {
  if (
    !isRecordWithKeys(value, ['group', 'planeId']) ||
    !COMPOSITION_GROUPS.has(value.group as string) ||
    !isSafeId(value.planeId)
  ) {
    return undefined
  }
  return {
    group: value.group as 'background' | 'content' | 'foreground',
    planeId: value.planeId,
  }
}

function sameIds(left: readonly string[], right: readonly string[]) {
  if (left.length !== right.length) return false
  const rightIds = new Set(right)
  return left.every((id) => rightIds.has(id))
}

function isGeneratedSource(value: unknown): value is GeneratedImageSource {
  if (typeof Blob !== 'undefined' && value instanceof Blob) return true
  if (!isRecord(value) || typeof value.kind !== 'string') return false

  if (value.kind === 'blob') {
    return exactOptional(value, ['kind', 'blob'], ['mediaType']) &&
      typeof Blob !== 'undefined' && value.blob instanceof Blob &&
      (value.mediaType === undefined || IMAGE_MEDIA_TYPES.has(value.mediaType as string))
  }

  if (value.kind === 'data-url') {
    return exact(value, ['kind', 'dataUrl']) && typeof value.dataUrl === 'string' &&
      value.dataUrl.length > 0
  }

  return value.kind === 'base64' && exact(value, ['kind', 'base64', 'mediaType']) &&
    typeof value.base64 === 'string' && value.base64.length > 0 &&
    IMAGE_MEDIA_TYPES.has(value.mediaType as string)
}

function isGeneratedMetadata(value: unknown): value is GeneratedAssetImportMetadata {
  return isRecord(value) &&
    exactOptional(value, ['displayName', 'provider'], [
      'creatorCategoryId',
      'model',
      'prompt',
      'generatedAt',
    ]) &&
    isSafeText(value.displayName, 120, true) &&
    isSafeText(value.provider, 120, true) &&
    optionalNullableText(value.model, 160) &&
    optionalNullableText(value.prompt, 8_000) &&
    (value.generatedAt === undefined ||
      (typeof value.generatedAt === 'string' && Number.isFinite(Date.parse(value.generatedAt)))) &&
    (value.creatorCategoryId === undefined || value.creatorCategoryId === null || isSafeId(value.creatorCategoryId))
}

function isShapeFill(value: unknown): boolean {
  if (!isRecord(value)) return false
  if (value.kind === 'solid') {
    return exact(value, ['kind', 'color']) && isSafeText(value.color, 128, true)
  }
  return value.kind === 'vertical-gradient' && exact(value, ['kind', 'top', 'bottom']) &&
    isFillStop(value.top) && isFillStop(value.bottom)
}

function isFillStop(value: unknown): boolean {
  return isRecordWithKeys(value, ['color', 'opacity']) && isSafeText(value.color, 128, true) &&
    isBoundedNumber(value.opacity, 0, 1)
}

function isShapeStyle(value: unknown): boolean {
  return isRecordWithKeys(value, ['shape', 'stroke', 'strokeWidth', 'cornerRadius']) &&
    (value.shape === 'rectangle' || value.shape === 'ellipse') &&
    (value.stroke === null || isSafeText(value.stroke, 128, true)) &&
    isBoundedNumber(value.strokeWidth, 0, EDITOR_TOOL_NUMERIC_LIMITS.maxStrokeWidth) &&
    isBoundedNumber(value.cornerRadius, 0, EDITOR_TOOL_NUMERIC_LIMITS.maxCornerRadius)
}

function isTextUpdate(value: unknown): boolean {
  return isRecordWithKeys(value, ['text', 'fill', 'fontSize', 'fontWeight', 'align']) &&
    isSafeText(value.text, 2_000, true) && isSafeText(value.fill, 128, true) &&
    isBoundedNumber(
      value.fontSize,
      EDITOR_TOOL_NUMERIC_LIMITS.minTextFontSize,
      EDITOR_TOOL_NUMERIC_LIMITS.maxTextFontSize,
    ) && [400, 600, 700].includes(value.fontWeight as number) &&
    ['left', 'center', 'right'].includes(value.align as string)
}

function isBalloonUpdate(value: unknown): boolean {
  return isRecord(value) && exactOptional(value, [
    'text', 'fill', 'stroke', 'strokeWidth', 'cornerRadius', 'textFill',
    'fontFamily', 'fontWeight', 'lineHeight', 'align', 'padding',
    'minFontSize', 'maxFontSize', 'tail',
  ], ['presetId', 'bodyControlPoints']) &&
    (value.presetId === undefined || SPEECH_BALLOON_PRESET_IDS.has(value.presetId as string)) &&
    (value.bodyControlPoints === undefined || isBalloonControlPoints(value.bodyControlPoints)) &&
    isSafeText(value.text, 2_000, true) && isSafeText(value.fill, 128, true) &&
    isSafeText(value.stroke, 128, true) &&
    isBoundedNumber(value.strokeWidth, 0, EDITOR_TOOL_NUMERIC_LIMITS.maxStrokeWidth) &&
    isBoundedNumber(value.cornerRadius, 0, EDITOR_TOOL_NUMERIC_LIMITS.maxCornerRadius) &&
    isSafeText(value.textFill, 128, true) &&
    isSafeText(value.fontFamily, 256, true) && [400, 600, 700].includes(value.fontWeight as number) &&
    isBoundedNumber(
      value.lineHeight,
      EDITOR_TOOL_NUMERIC_LIMITS.minLineHeight,
      EDITOR_TOOL_NUMERIC_LIMITS.maxLineHeight,
    ) && ['left', 'center', 'right'].includes(value.align as string) &&
    isBoundedNumber(value.padding, 0, EDITOR_TOOL_NUMERIC_LIMITS.maxPadding) &&
    isBoundedNumber(
      value.minFontSize,
      EDITOR_TOOL_NUMERIC_LIMITS.minTextFontSize,
      EDITOR_TOOL_NUMERIC_LIMITS.maxTextFontSize,
    ) &&
    isBoundedNumber(
      value.maxFontSize,
      EDITOR_TOOL_NUMERIC_LIMITS.minTextFontSize,
      EDITOR_TOOL_NUMERIC_LIMITS.maxTextFontSize,
    ) && value.maxFontSize >= value.minFontSize && isBalloonTail(value.tail)
}

function isBalloonControlPoints(value: unknown): boolean {
  return Array.isArray(value) && value.length >= 6 && value.length <= 32 &&
    value.every((point) =>
      isRecordWithKeys(point, ['x', 'y']) &&
      isBoundedNumber(point.x, 0, 1) &&
      isBoundedNumber(point.y, 0, 1),
    )
}

function isBalloonTail(value: unknown): boolean {
  return isRecordWithKeys(value, ['enabled', 'side', 'anchor', 'width', 'tip']) &&
    typeof value.enabled === 'boolean' && ['top', 'right', 'bottom', 'left'].includes(value.side as string) &&
    isBoundedNumber(
      value.anchor,
      EDITOR_TOOL_NUMERIC_LIMITS.minTailAnchor,
      EDITOR_TOOL_NUMERIC_LIMITS.maxTailAnchor,
    ) &&
    isBoundedNumber(
      value.width,
      EDITOR_TOOL_NUMERIC_LIMITS.minTailWidth,
      EDITOR_TOOL_NUMERIC_LIMITS.maxTailWidth,
    ) &&
    isPosition(
      value.tip,
      EDITOR_TOOL_NUMERIC_LIMITS.minTailTip,
      EDITOR_TOOL_NUMERIC_LIMITS.maxTailTip,
    )
}

function isImageCrop(value: unknown): value is { readonly focusX: number; readonly focusY: number; readonly zoom: number } {
  return isRecordWithKeys(value, ['focusX', 'focusY', 'zoom']) &&
    isBoundedNumber(value.focusX, 0, 1) &&
    isBoundedNumber(value.focusY, 0, 1) &&
    isBoundedNumber(
      value.zoom,
      EDITOR_TOOL_NUMERIC_LIMITS.minCropZoom,
      EDITOR_TOOL_NUMERIC_LIMITS.maxCropZoom,
    )
}

function isImageFrame(value: unknown): boolean {
  return isRecord(value) && exactOptional(value, ['mask', 'crop'], ['border']) &&
    isImageMask(value.mask) && isImageCrop(value.crop) &&
    (value.border === undefined ||
      (isRecordWithKeys(value.border, ['color', 'width']) &&
        isSafeText(value.border.color, 128, true) &&
        isBoundedNumber(value.border.width, 0, EDITOR_TOOL_NUMERIC_LIMITS.maxStrokeWidth)))
}

function isImageMask(value: unknown): boolean {
  if (!isRecord(value)) return false
  if (value.kind === 'rectangle') {
    return exact(value, ['kind', 'cornerRadius']) &&
      isBoundedNumber(value.cornerRadius, 0, EDITOR_TOOL_NUMERIC_LIMITS.maxCornerRadius)
  }
  return value.kind === 'polygon' && exact(value, ['kind', 'points']) &&
    Array.isArray(value.points) && value.points.length >= 3 && value.points.length <= 8 &&
    value.points.every((point) => isPosition(point, 0, 1))
}

function isTransform(value: unknown): boolean {
  return isRecordWithKeys(value, ['rotationDegrees', 'flipX', 'flipY']) &&
    isBoundedNumber(
      value.rotationDegrees,
      EDITOR_TOOL_NUMERIC_LIMITS.minRotationDegrees,
      EDITOR_TOOL_NUMERIC_LIMITS.maxRotationDegrees,
    ) && typeof value.flipX === 'boolean' && typeof value.flipY === 'boolean'
}

function isAlignment(value: unknown): boolean {
  if (!isRecord(value) || !exactOptional(value, [], ['horizontal', 'vertical'])) return false
  const horizontal = value.horizontal
  const vertical = value.vertical
  return (horizontal !== undefined || vertical !== undefined) &&
    (horizontal === undefined || ['left', 'center', 'right'].includes(horizontal as string)) &&
    (vertical === undefined || ['top', 'middle', 'bottom'].includes(vertical as string))
}

function isPosition(
  value: unknown,
  minimum: number = -EDITOR_TOOL_NUMERIC_LIMITS.maxLogicalCoordinate,
  maximum: number = EDITOR_TOOL_NUMERIC_LIMITS.maxLogicalCoordinate,
): value is { readonly x: number; readonly y: number } {
  return isRecordWithKeys(value, ['x', 'y']) &&
    isBoundedNumber(value.x, minimum, maximum) &&
    isBoundedNumber(value.y, minimum, maximum)
}

function isElementBounds(value: unknown): value is { readonly x: number; readonly y: number; readonly width: number; readonly height: number } {
  return isRecordWithKeys(value, ['x', 'y', 'width', 'height']) &&
    isBoundedNumber(
      value.x,
      -EDITOR_TOOL_NUMERIC_LIMITS.maxLogicalCoordinate,
      EDITOR_TOOL_NUMERIC_LIMITS.maxLogicalCoordinate,
    ) &&
    isBoundedNumber(
      value.y,
      -EDITOR_TOOL_NUMERIC_LIMITS.maxLogicalCoordinate,
      EDITOR_TOOL_NUMERIC_LIMITS.maxLogicalCoordinate,
    ) &&
    isBoundedNumber(
      value.width,
      EDITOR_TOOL_NUMERIC_LIMITS.minElementSize,
      EDITOR_TOOL_NUMERIC_LIMITS.maxLogicalLength,
    ) &&
    isBoundedNumber(
      value.height,
      EDITOR_TOOL_NUMERIC_LIMITS.minElementSize,
      EDITOR_TOOL_NUMERIC_LIMITS.maxLogicalLength,
    )
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isBoundedNumber(
  value: unknown,
  minimum: number,
  maximum: number,
): value is number {
  return isFiniteNumber(value) && value >= minimum && value <= maximum
}

function isBoundedInteger(
  value: unknown,
  minimum: number,
  maximum: number,
): value is number {
  return Number.isSafeInteger(value) &&
    (value as number) >= minimum &&
    (value as number) <= maximum
}

function isSafeId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 160 && !hasControlCharacters(value)
}

function isSafeText(value: unknown, maximumLength: number, requireContent: boolean): value is string {
  return typeof value === 'string' && value.length <= maximumLength &&
    (!requireContent || value.trim().length > 0) && !hasControlCharacters(value)
}

function hasControlCharacters(value: string): boolean {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0
    return codePoint <= 31 || codePoint === 127
  })
}

function optionalBoolean(value: unknown): boolean {
  return value === undefined || typeof value === 'boolean'
}

function optionalNullableText(value: unknown, maximumLength: number): boolean {
  return value === undefined || value === null || isSafeText(value, maximumLength, true)
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isRecordWithKeys(value: unknown, keys: readonly string[]): value is Readonly<Record<string, unknown>> {
  return isRecord(value) && exact(value, keys)
}

function exact(value: Readonly<Record<string, unknown>>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key))
}

function exactOptional(
  value: Readonly<Record<string, unknown>>,
  required: readonly string[],
  optional: readonly string[],
): boolean {
  const keys = Object.keys(value)
  return required.every((key) => Object.hasOwn(value, key)) &&
    keys.every((key) => required.includes(key) || optional.includes(key))
}

function fromAdapterResult(
  tool: EditorToolName,
  result: EditorAdapterResult,
): EditorToolDispatchResult {
  return result.ok
    ? {
        ok: true,
        tool,
        snapshot: result.snapshot,
        command: result.command,
        changed: result.changed,
        ...(result.createdId ? { createdId: result.createdId } : {}),
      }
    : {
        ok: false,
        tool,
        code: result.code,
        message: result.message,
        snapshot: result.snapshot,
        command: result.command,
      }
}

function failure(
  tool: string,
  code: EditorToolFailureCode,
  message: string,
  snapshot: EditorAdapterSnapshot,
  command?: string,
): EditorToolDispatchResult {
  return {
    ok: false,
    tool,
    code,
    message,
    snapshot,
    ...(command ? { command } : {}),
  }
}
