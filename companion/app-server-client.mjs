import { spawn as nodeSpawn, execFile as nodeExecFile } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { EventEmitter } from 'node:events'
import { promises as fs } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import readline from 'node:readline'
import { promisify } from 'node:util'

export const REQUIRED_CODEX_VERSION = '0.144.5'
export const TOOL_NAMESPACE = 'scrollsplice'

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

const MAX_IMAGE_BYTES = 20 * 1024 * 1024
const GENERATION_TTL_MS = 15 * 60 * 1_000
const RPC_TIMEOUT_MS = 30_000
const TOOL_TIMEOUT_MS = 90_000

const APP_SERVER_ENV_ALLOWLIST = new Set([
  'COMSPEC',
  'HOME',
  'LANG',
  'LC_ALL',
  'LC_CTYPE',
  'LOGNAME',
  'PATH',
  'PATHEXT',
  'SYSTEMROOT',
  'TEMP',
  'TMP',
  'TMPDIR',
  'TZ',
  'USER',
  'USERPROFILE',
  'WINDIR',
])

const DANGEROUS_ITEM_TYPES = new Set([
  'commandExecution',
  'fileChange',
  'mcpToolCall',
  'collabAgentToolCall',
  'webSearch',
  'imageView',
  'sleep',
  'enteredReviewMode',
  'exitedReviewMode',
])

const SAFE_ITEM_TYPES = new Set([
  'userMessage',
  'agentMessage',
  'reasoning',
  'plan',
  'dynamicToolCall',
  'imageGeneration',
  'error',
  'contextCompaction',
])

const ALLOWED_TOOL_NAMES = new Set([
  'inspect_editor',
  'preview_editor',
  'apply_editor_command',
  'import_latest_generated_asset',
  'place_generated_asset',
])

const idSchema = { type: 'string', minLength: 1, maxLength: 160 }
const colorSchema = { type: 'string', minLength: 1, maxLength: 128 }
const groupSchema = { type: 'string', enum: ['background', 'content', 'foreground'] }
const logicalNumberSchema = {
  type: 'number',
  minimum: -EDITOR_TOOL_NUMERIC_LIMITS.maxLogicalCoordinate,
  maximum: EDITOR_TOOL_NUMERIC_LIMITS.maxLogicalCoordinate,
}
const nonNegativeLogicalNumberSchema = {
  type: 'number',
  minimum: 0,
  maximum: EDITOR_TOOL_NUMERIC_LIMITS.maxLogicalCoordinate,
}

function strictObject(properties, required = Object.keys(properties)) {
  return { type: 'object', required, properties, additionalProperties: false }
}

function commandSchema(type, properties = {}, required = Object.keys(properties)) {
  return strictObject(
    {
      type: { type: 'string', const: type },
      ...properties,
    },
    ['type', ...required],
  )
}

function positionSchema(
  minimum = -EDITOR_TOOL_NUMERIC_LIMITS.maxLogicalCoordinate,
  maximum = EDITOR_TOOL_NUMERIC_LIMITS.maxLogicalCoordinate,
) {
  const coordinate = { type: 'number', minimum, maximum }
  return strictObject({ x: coordinate, y: coordinate })
}

const elementBoundsSchema = strictObject({
  x: logicalNumberSchema,
  y: logicalNumberSchema,
  width: {
    type: 'number',
    minimum: EDITOR_TOOL_NUMERIC_LIMITS.minElementSize,
    maximum: EDITOR_TOOL_NUMERIC_LIMITS.maxLogicalLength,
  },
  height: {
    type: 'number',
    minimum: EDITOR_TOOL_NUMERIC_LIMITS.minElementSize,
    maximum: EDITOR_TOOL_NUMERIC_LIMITS.maxLogicalLength,
  },
})

const imageCropSchema = strictObject({
  focusX: { type: 'number', minimum: 0, maximum: 1 },
  focusY: { type: 'number', minimum: 0, maximum: 1 },
  zoom: {
    type: 'number',
    minimum: EDITOR_TOOL_NUMERIC_LIMITS.minCropZoom,
    maximum: EDITOR_TOOL_NUMERIC_LIMITS.maxCropZoom,
  },
})

const shapeFillSchema = {
  oneOf: [
    strictObject({
      kind: { type: 'string', const: 'solid' },
      color: colorSchema,
    }),
    strictObject({
      kind: { type: 'string', const: 'vertical-gradient' },
      top: strictObject({
        color: colorSchema,
        opacity: { type: 'number', minimum: 0, maximum: 1 },
      }),
      bottom: strictObject({
        color: colorSchema,
        opacity: { type: 'number', minimum: 0, maximum: 1 },
      }),
    }),
  ],
}

const balloonTailSchema = strictObject({
  enabled: { type: 'boolean' },
  side: { type: 'string', enum: ['top', 'right', 'bottom', 'left'] },
  anchor: {
    type: 'number',
    minimum: EDITOR_TOOL_NUMERIC_LIMITS.minTailAnchor,
    maximum: EDITOR_TOOL_NUMERIC_LIMITS.maxTailAnchor,
  },
  width: {
    type: 'number',
    minimum: EDITOR_TOOL_NUMERIC_LIMITS.minTailWidth,
    maximum: EDITOR_TOOL_NUMERIC_LIMITS.maxTailWidth,
  },
  tip: positionSchema(
    EDITOR_TOOL_NUMERIC_LIMITS.minTailTip,
    EDITOR_TOOL_NUMERIC_LIMITS.maxTailTip,
  ),
})

const imageMaskSchema = {
  oneOf: [
    strictObject({
      kind: { type: 'string', const: 'rectangle' },
      cornerRadius: {
        type: 'number',
        minimum: 0,
        maximum: EDITOR_TOOL_NUMERIC_LIMITS.maxCornerRadius,
      },
    }),
    strictObject({
      kind: { type: 'string', const: 'polygon' },
      points: {
        type: 'array',
        minItems: 3,
        maxItems: 8,
        items: positionSchema(0, 1),
      },
    }),
  ],
}

const imageFrameSchema = strictObject(
  {
    mask: imageMaskSchema,
    crop: imageCropSchema,
    border: strictObject({
      color: colorSchema,
      width: {
        type: 'number',
        minimum: 0,
        maximum: EDITOR_TOOL_NUMERIC_LIMITS.maxStrokeWidth,
      },
    }),
  },
  ['mask', 'crop'],
)

const editorCommandSchema = {
  oneOf: [
    commandSchema('set-active-group', { group: groupSchema }),
    commandSchema('set-active-plane', { planeId: idSchema }),
    commandSchema('set-viewport', {
      position: positionSchema(0, EDITOR_TOOL_NUMERIC_LIMITS.maxLogicalCoordinate),
    }),
    commandSchema('pan-viewport', { delta: positionSchema() }),
    commandSchema('set-zoom', {
      zoomFactor: {
        type: 'number',
        minimum: EDITOR_TOOL_NUMERIC_LIMITS.minZoomFactor,
        maximum: EDITOR_TOOL_NUMERIC_LIMITS.maxZoomFactor,
      },
    }),
    commandSchema(
      'select-element',
      { elementId: idSchema, reveal: { type: 'boolean' }, toggle: { type: 'boolean' } },
      ['elementId'],
    ),
    ...['clear-selection', 'select-all-in-plane'].map((type) => commandSchema(type)),
    commandSchema('set-episode-name', {
      name: { type: 'string', minLength: 1, maxLength: 60 },
    }),
    commandSchema('extend-episode'),
    commandSchema(
      'resize-episode',
      {
        logicalHeight: {
          type: 'number',
          minimum: EDITOR_TOOL_NUMERIC_LIMITS.minEpisodeLogicalHeight,
          maximum: EDITOR_TOOL_NUMERIC_LIMITS.maxEpisodeLogicalHeight,
        },
        pinViewportToEnd: { type: 'boolean' },
      },
      ['logicalHeight'],
    ),
    commandSchema('create-plane', { group: groupSchema }),
    commandSchema('delete-plane', { planeId: idSchema }),
    commandSchema('rename-plane', {
      planeId: idSchema,
      name: { type: 'string', maxLength: 32 },
    }),
    commandSchema('reorder-plane', {
      planeId: idSchema,
      targetIndex: {
        type: 'integer',
        minimum: 0,
        maximum: EDITOR_TOOL_NUMERIC_LIMITS.maxOrderIndex,
      },
    }),
    commandSchema('set-plane-visibility', { planeId: idSchema, visible: { type: 'boolean' } }),
    commandSchema('set-group-visibility', { group: groupSchema, visible: { type: 'boolean' } }),
    commandSchema('set-base-color', { color: colorSchema }),
    commandSchema('rename-element', {
      elementId: idSchema,
      name: { type: 'string', minLength: 1, maxLength: 80 },
    }),
    commandSchema('set-element-visibility', { elementId: idSchema, visible: { type: 'boolean' } }),
    commandSchema('set-element-lock', { elementId: idSchema, locked: { type: 'boolean' } }),
    commandSchema('delete-element', { elementId: idSchema }),
    commandSchema(
      'duplicate-element',
      { elementId: idSchema, offset: positionSchema() },
      ['elementId'],
    ),
    commandSchema('move-element', { elementId: idSchema, position: positionSchema() }),
    commandSchema('resize-element', { elementId: idSchema, bounds: elementBoundsSchema }),
    commandSchema('nudge-selection', { delta: positionSchema() }),
    commandSchema(
      'align-selection',
      {
        alignment: {
          ...strictObject(
            {
              horizontal: { type: 'string', enum: ['left', 'center', 'right'] },
              vertical: { type: 'string', enum: ['top', 'middle', 'bottom'] },
            },
            [],
          ),
          anyOf: [{ required: ['horizontal'] }, { required: ['vertical'] }],
        },
      },
    ),
    commandSchema('move-element-in-stack', {
      elementId: idSchema,
      direction: { type: 'string', enum: ['backward', 'forward'] },
    }),
    commandSchema('reorder-element-in-stack', {
      elementId: idSchema,
      targetIndex: {
        type: 'integer',
        minimum: 0,
        maximum: EDITOR_TOOL_NUMERIC_LIMITS.maxOrderIndex,
      },
    }),
    commandSchema('move-element-to-plane', { elementId: idSchema, planeId: idSchema }),
    commandSchema('set-element-opacity', {
      elementId: idSchema,
      opacity: { type: 'number', minimum: 0, maximum: 1 },
    }),
    commandSchema('set-element-blend-mode', {
      elementId: idSchema,
      blendMode: { type: 'string', enum: ['normal', 'multiply', 'screen', 'overlay', 'soft-light'] },
    }),
    commandSchema('set-element-transform', {
      elementId: idSchema,
      transform: strictObject({
        rotationDegrees: {
          type: 'number',
          minimum: EDITOR_TOOL_NUMERIC_LIMITS.minRotationDegrees,
          maximum: EDITOR_TOOL_NUMERIC_LIMITS.maxRotationDegrees,
        },
        flipX: { type: 'boolean' },
        flipY: { type: 'boolean' },
      }),
    }),
    commandSchema('flip-element', {
      elementId: idSchema,
      axis: { type: 'string', enum: ['horizontal', 'vertical'] },
    }),
    commandSchema('set-element-overflow', {
      elementId: idSchema,
      overflow: { type: 'string', enum: ['constrained', 'bleed'] },
    }),
    ...['create-text', 'create-speech-balloon'].map((type) =>
      commandSchema(type, { planeId: idSchema })),
    commandSchema('create-positioned-text', {
      planeId: idSchema,
      bounds: elementBoundsSchema,
      text: { type: 'string', minLength: 1, maxLength: 2_000 },
      style: strictObject({
        fontSize: {
          type: 'number',
          minimum: EDITOR_TOOL_NUMERIC_LIMITS.minTextFontSize,
          maximum: EDITOR_TOOL_NUMERIC_LIMITS.maxTextFontSize,
        },
        fontWeight: { type: 'integer', enum: [400, 600, 700] },
        color: colorSchema,
        textAlign: { type: 'string', enum: ['left', 'center', 'right'] },
      }),
    }),
    commandSchema('create-positioned-shape', {
      planeId: idSchema,
      name: { type: 'string', minLength: 1, maxLength: 80 },
      bounds: elementBoundsSchema,
      shape: { type: 'string', enum: ['rectangle', 'ellipse'] },
      fill: colorSchema,
      stroke: { type: ['string', 'null'], maxLength: 128 },
      strokeWidth: {
        type: 'number',
        minimum: 0,
        maximum: EDITOR_TOOL_NUMERIC_LIMITS.maxStrokeWidth,
      },
      cornerRadius: {
        type: 'number',
        minimum: 0,
        maximum: EDITOR_TOOL_NUMERIC_LIMITS.maxCornerRadius,
      },
    }),
    commandSchema('create-background-region', {
      planeId: idSchema,
      fill: colorSchema,
      startY: nonNegativeLogicalNumberSchema,
      height: {
        type: 'number',
        exclusiveMinimum: 0,
        maximum: EDITOR_TOOL_NUMERIC_LIMITS.maxLogicalLength,
      },
    }),
    ...['place-built-in-asset', 'place-imported-asset'].map((type) =>
      commandSchema(type, { planeId: idSchema, assetId: idSchema })),
    commandSchema('set-shape-fill', { elementId: idSchema, fill: shapeFillSchema }),
    commandSchema('update-shape-style', {
      elementId: idSchema,
      input: strictObject({
        shape: { type: 'string', enum: ['rectangle', 'ellipse'] },
        stroke: { type: ['string', 'null'], maxLength: 128 },
        strokeWidth: {
          type: 'number',
          minimum: 0,
          maximum: EDITOR_TOOL_NUMERIC_LIMITS.maxStrokeWidth,
        },
        cornerRadius: {
          type: 'number',
          minimum: 0,
          maximum: EDITOR_TOOL_NUMERIC_LIMITS.maxCornerRadius,
        },
      }),
    }),
    commandSchema('update-text', {
      elementId: idSchema,
      input: strictObject({
        text: { type: 'string', minLength: 1, maxLength: 2_000 },
        fill: colorSchema,
        fontSize: {
          type: 'number',
          minimum: EDITOR_TOOL_NUMERIC_LIMITS.minTextFontSize,
          maximum: EDITOR_TOOL_NUMERIC_LIMITS.maxTextFontSize,
        },
        fontWeight: { type: 'integer', enum: [400, 600, 700] },
        align: { type: 'string', enum: ['left', 'center', 'right'] },
      }),
    }),
    commandSchema('update-speech-balloon', {
      elementId: idSchema,
      input: strictObject({
        text: { type: 'string', minLength: 1, maxLength: 2_000 },
        fill: colorSchema,
        stroke: colorSchema,
        strokeWidth: {
          type: 'number', minimum: 0, maximum: EDITOR_TOOL_NUMERIC_LIMITS.maxStrokeWidth,
        },
        cornerRadius: {
          type: 'number', minimum: 0, maximum: EDITOR_TOOL_NUMERIC_LIMITS.maxCornerRadius,
        },
        textFill: colorSchema,
        fontFamily: { type: 'string', minLength: 1, maxLength: 256 },
        fontWeight: { type: 'integer', enum: [400, 600, 700] },
        lineHeight: {
          type: 'number',
          minimum: EDITOR_TOOL_NUMERIC_LIMITS.minLineHeight,
          maximum: EDITOR_TOOL_NUMERIC_LIMITS.maxLineHeight,
        },
        align: { type: 'string', enum: ['left', 'center', 'right'] },
        padding: {
          type: 'number', minimum: 0, maximum: EDITOR_TOOL_NUMERIC_LIMITS.maxPadding,
        },
        minFontSize: {
          type: 'number',
          minimum: EDITOR_TOOL_NUMERIC_LIMITS.minTextFontSize,
          maximum: EDITOR_TOOL_NUMERIC_LIMITS.maxTextFontSize,
        },
        maxFontSize: {
          type: 'number',
          minimum: EDITOR_TOOL_NUMERIC_LIMITS.minTextFontSize,
          maximum: EDITOR_TOOL_NUMERIC_LIMITS.maxTextFontSize,
        },
        tail: balloonTailSchema,
      }),
    }),
    commandSchema('set-image-presentation', {
      elementId: idSchema,
      presentation: { type: 'string', enum: ['single', 'tile', 'cover'] },
    }),
    commandSchema('set-image-frame', { elementId: idSchema, frame: imageFrameSchema }),
    commandSchema('set-image-crop', { elementId: idSchema, crop: imageCropSchema }),
    ...['group-selection', 'ungroup-selection'].map((type) => commandSchema(type)),
    commandSchema('move-story-beat', { direction: { type: 'string', enum: ['up', 'down'] } }),
    commandSchema('set-magnet', { enabled: { type: 'boolean' } }),
    commandSchema('set-slice-guides', { visible: { type: 'boolean' } }),
    ...['undo', 'redo'].map((type) => commandSchema(type)),
  ],
}

export const SCROLLSPLICE_DYNAMIC_TOOLS = Object.freeze([
  {
    type: 'namespace',
    name: TOOL_NAMESPACE,
    description: 'Inspect and edit the currently open ScrollSplice episode through its stable, revision-checked editor adapter.',
    tools: [
      {
        type: 'function',
        name: 'inspect_editor',
        description: 'Inspect the current episode, stable IDs, selected plane, elements, asset library, viewport, and current revision. Call this before every mutation.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      },
      {
        type: 'function',
        name: 'preview_editor',
        description: 'Render the authoritative episode as a bounded full-scroll image for visual inspection. Use it after placing generated art and again after positioning text or other overlays.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      },
      {
        type: 'function',
        name: 'apply_editor_command',
        description: 'Apply one supported editor command using the episode ID and revision returned by inspect_editor. Project lifecycle commands are forbidden.',
        inputSchema: {
          type: 'object',
          required: ['episodeId', 'expectedRevision', 'command'],
          properties: {
            episodeId: { type: 'string', minLength: 1, maxLength: 160 },
            expectedRevision: {
              type: 'integer',
              minimum: 0,
              maximum: EDITOR_TOOL_NUMERIC_LIMITS.maxRevision,
            },
            command: editorCommandSchema,
            expectedSelection: {
              type: 'object',
              required: ['primaryElementId', 'elementIds'],
              properties: {
                primaryElementId: { type: ['string', 'null'], maxLength: 160 },
                elementIds: {
                  type: 'array',
                  maxItems: 1000,
                  items: { type: 'string', minLength: 1, maxLength: 160 },
                },
              },
              additionalProperties: false,
            },
            expectedActive: {
              type: 'object',
              required: ['group', 'planeId'],
              properties: {
                group: { type: 'string', enum: ['background', 'content', 'foreground'] },
                planeId: { type: 'string', minLength: 1, maxLength: 160 },
              },
              additionalProperties: false,
            },
          },
          additionalProperties: false,
        },
      },
      {
        type: 'function',
        name: 'import_latest_generated_asset',
        description: 'Import the most recent image generated during this run into the local project asset library. Generate the image first, inspect again, then call this tool.',
        inputSchema: {
          type: 'object',
          required: ['episodeId', 'expectedRevision', 'metadata'],
          properties: {
            episodeId: { type: 'string', minLength: 1, maxLength: 160 },
            expectedRevision: {
              type: 'integer',
              minimum: 0,
              maximum: EDITOR_TOOL_NUMERIC_LIMITS.maxRevision,
            },
            metadata: {
              type: 'object',
              required: ['displayName', 'provider'],
              properties: {
                displayName: { type: 'string', minLength: 1, maxLength: 120 },
                provider: { type: 'string', minLength: 1, maxLength: 120 },
                model: { type: ['string', 'null'], maxLength: 160 },
                prompt: { type: ['string', 'null'], maxLength: 8000 },
                generatedAt: { type: 'string' },
                creatorCategoryId: { type: ['string', 'null'], maxLength: 160 },
              },
              additionalProperties: false,
            },
          },
          additionalProperties: false,
        },
      },
      {
        type: 'function',
        name: 'place_generated_asset',
        description: 'Place a generated asset from the project library on a specified ordinary plane at exact logical-pixel bounds.',
        inputSchema: {
          type: 'object',
          required: ['episodeId', 'expectedRevision', 'assetId', 'planeId', 'bounds'],
          properties: {
            episodeId: { type: 'string', minLength: 1, maxLength: 160 },
            expectedRevision: {
              type: 'integer',
              minimum: 0,
              maximum: EDITOR_TOOL_NUMERIC_LIMITS.maxRevision,
            },
            assetId: { type: 'string', minLength: 1, maxLength: 160 },
            planeId: { type: 'string', minLength: 1, maxLength: 160 },
            bounds: elementBoundsSchema,
          },
          additionalProperties: false,
        },
      },
    ],
  },
])

export const AGENT_DEVELOPER_INSTRUCTIONS = `You are the optional local ScrollSplice episode assistant. The browser editor remains authoritative.

Use only the ScrollSplice tools exposed in this run. Inspect before each mutation, use stable IDs and the exact current revision, make one bounded change at a time, and verify the returned snapshot. Obey every numeric minimum and maximum in the tool schema: episode height is 1,280-1,000,000 logical pixels; element bounds use 24-1,000,000 pixel dimensions and coordinates within +/-1,000,000; opacity and normalized values stay in their declared ranges. Selection-based commands must also copy the complete selection object from the latest inspect result into expectedSelection. select-all-in-plane must copy the latest active object into expectedActive. Never request or attempt shell commands, filesystem access, web search, browser control, MCP, connectors, approvals, project save/reopen/reset, or account actions.

For images: use the native image-generation capability, then call import_latest_generated_asset. The companion attaches the latest generated image without exposing a local path. Use the returned stable asset ID with place_generated_asset. After placing generated art, call preview_editor so you can see the authoritative rendered episode before choosing overlay coordinates. When a creator requests dialogue, captions, labels, or other lettering, use blank generated balloons or clean lettering space and then create each requested line as editable ScrollSplice text with create-positioned-text on the intended ordinary plane. That command takes planeId, bounds, text, and style with fontSize, fontWeight, color, and textAlign. Call preview_editor again after positioning lettering, and correct any text that is not visibly inside its intended balloon before finishing. To revise existing lettering in place, use update-text with the stable elementId and the complete text input copied from the latest snapshot; use move-element or resize-element separately for geometry. Do not replace an existing text element merely to change its properties. Do not stop after placing blank balloons, and do not claim the comic is complete until a final inspect shows the requested text elements and their exact text content and the final preview confirms their visual placement. Do not claim an edit succeeded unless its tool result says it succeeded.`

export function buildCodexArgs() {
  return [
    'app-server',
    '--strict-config',
    '-c', 'features.shell_tool=false',
    '-c', 'features.shell_snapshot=false',
    '-c', 'features.multi_agent=false',
    '-c', 'features.apps=false',
    '-c', 'features.plugins=false',
    '-c', 'features.browser_use=false',
    '-c', 'features.browser_use_external=false',
    '-c', 'features.browser_use_full_cdp_access=false',
    '-c', 'features.computer_use=false',
    '-c', 'features.in_app_browser=false',
    '-c', 'features.tool_suggest=false',
    '-c', 'features.image_generation=true',
    '-c', 'web_search="disabled"',
    '-c', 'sandbox_mode="read-only"',
    '-c', 'approval_policy="never"',
    '--stdio',
  ]
}

export function defaultAppDataRoot() {
  if (process.platform === 'darwin') {
    return path.join(homedir(), 'Library', 'Application Support', 'ScrollSplice')
  }
  if (process.platform === 'win32' && process.env.LOCALAPPDATA) {
    return path.join(process.env.LOCALAPPDATA, 'ScrollSplice')
  }
  return path.join(process.env.XDG_DATA_HOME || path.join(homedir(), '.local', 'share'), 'ScrollSplice')
}

export function normalizeAllowedModels(models) {
  const allowed = (Array.isArray(models) ? models : [])
    .filter((entry) => entry && typeof entry === 'object')
    .filter(({ model }) => typeof model === 'string' && /^gpt-5\.(?:5|6)(?:$|-)/i.test(model))
    .map((entry) => ({
      id: String(entry.id || entry.model),
      model: String(entry.model),
      displayName: String(entry.displayName || entry.model),
      description: String(entry.description || ''),
      supportedReasoningEfforts: Array.isArray(entry.supportedReasoningEfforts)
        ? entry.supportedReasoningEfforts
            .filter((option) => option && typeof option.reasoningEffort === 'string')
            .map((option) => ({
              reasoningEffort: option.reasoningEffort,
              description: String(option.description || ''),
            }))
        : [],
      defaultReasoningEffort: String(entry.defaultReasoningEffort || 'medium'),
    }))

  return allowed.sort((left, right) => {
    const rank = (model) => model.startsWith('gpt-5.6-terra') ? 0 : model.startsWith('gpt-5.6') ? 1 : 2
    return rank(left.model) - rank(right.model)
  })
}

export function selectModelAndEffort(models, requestedModel, requestedEffort) {
  const model = models.find((entry) => entry.id === requestedModel || entry.model === requestedModel)
  if (!model) throw new Error('The selected model is not available for ScrollSplice.')
  const efforts = model.supportedReasoningEfforts.map(({ reasoningEffort }) => reasoningEffort)
  const effort = efforts.find((value) => value === requestedEffort)
  if (!effort) throw new Error('The selected reasoning effort is not supported by this model.')
  return { model: model.model, effort }
}

export function messagesToPrompt(messages) {
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 40) {
    throw new Error('A recent conversation ending with a user message is required.')
  }
  let total = 0
  const lines = messages.map((message) => {
    if (!message || (message.role !== 'user' && message.role !== 'assistant') || typeof message.text !== 'string') {
      throw new Error('The conversation contains an invalid message.')
    }
    const text = message.text.trim()
    if (!text || text.length > 20_000) throw new Error('A conversation message is empty or too long.')
    total += text.length
    return `${message.role === 'user' ? 'USER' : 'ASSISTANT'}:\n${text}`
  })
  if (messages.at(-1)?.role !== 'user' || total > 80_000) {
    throw new Error('The recent conversation must end with a user message and stay within the local context limit.')
  }
  return `Recent ScrollSplice project conversation (the last USER block is the current request):\n\n${lines.join('\n\n')}`
}

export function buildCodexSpawnEnvironment(codexHome, sourceEnvironment = process.env) {
  const env = {}
  for (const [key, value] of Object.entries(sourceEnvironment)) {
    if (value !== undefined && APP_SERVER_ENV_ALLOWLIST.has(key.toUpperCase())) {
      env[key] = value
    }
  }
  env.CODEX_HOME = codexHome
  return env
}

export class AppServerClient extends EventEmitter {
  constructor(options = {}) {
    super()
    this.codexBin = options.codexBin || process.env.SCROLLSPLICE_CODEX_BIN || 'codex'
    this.appDataRoot = options.appDataRoot || defaultAppDataRoot()
    this.codexHome = path.join(this.appDataRoot, 'codex')
    this.workspaceDir = path.join(this.appDataRoot, 'agent-workspace')
    this.generatedDir = path.join(this.appDataRoot, 'generated')
    this.spawnImpl = options.spawnImpl || nodeSpawn
    this.execFileImpl = options.execFileImpl || nodeExecFile
    this.rpcTimeoutMs = options.rpcTimeoutMs || RPC_TIMEOUT_MS
    this.toolTimeoutMs = options.toolTimeoutMs || TOOL_TIMEOUT_MS
    this.process = null
    this.nextId = 1
    this.pending = new Map()
    this.pendingTools = new Map()
    this.generations = new Map()
    this.latestGenerationByTurn = new Map()
    this.generationCleanupTimers = new Map()
    this.models = []
    this.lastConnected = null
    this.started = false
    this.stderrTail = ''
    this.lineQueue = Promise.resolve()
  }

  async start() {
    if (this.started) return
    const execFile = promisify(this.execFileImpl)
    const { stdout } = await execFile(this.codexBin, ['--version'])
    const match = String(stdout).match(/codex-cli\s+(\d+\.\d+\.\d+)/)
    if (match?.[1] !== REQUIRED_CODEX_VERSION) {
      throw new Error(`ScrollSplice requires codex-cli ${REQUIRED_CODEX_VERSION}; found ${match?.[1] || 'an unknown version'}.`)
    }

    await Promise.all([
      fs.mkdir(this.appDataRoot, { recursive: true, mode: 0o700 }),
      fs.mkdir(this.codexHome, { recursive: true, mode: 0o700 }),
      fs.mkdir(this.workspaceDir, { recursive: true, mode: 0o700 }),
      fs.mkdir(this.generatedDir, { recursive: true, mode: 0o700 }),
    ])
    await Promise.all([
      fs.chmod(this.appDataRoot, 0o700),
      fs.chmod(this.codexHome, 0o700),
      fs.chmod(this.workspaceDir, 0o700),
      fs.chmod(this.generatedDir, 0o700),
    ])
    await this.sweepGeneratedFiles()

    const child = this.spawnImpl(this.codexBin, buildCodexArgs(), {
      cwd: this.workspaceDir,
      env: buildCodexSpawnEnvironment(this.codexHome),
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    this.process = child

    const lines = readline.createInterface({ input: child.stdout, crlfDelay: Infinity })
    lines.on('line', (line) => {
      this.lineQueue = this.lineQueue
        .then(() => this.handleLine(line))
        .catch((error) => this.failClosed(error))
    })
    child.stderr.setEncoding('utf8')
    child.stderr.on('data', (chunk) => {
      this.stderrTail = `${this.stderrTail}${chunk}`.slice(-4_000)
    })
    child.once('error', (error) => this.handleExit(error))
    child.once('exit', (code, signal) => this.handleExit(new Error(`Codex App Server exited (${code ?? signal ?? 'unknown'}).`)))

    try {
      await this.request('initialize', {
        clientInfo: { name: 'scrollsplice', title: 'ScrollSplice', version: '0.1.0' },
        capabilities: { experimentalApi: true, requestAttestation: false },
      })
      this.notify('initialized')
      this.models = await this.listAllowedModels()
      this.started = true
    } catch (error) {
      child.kill('SIGTERM')
      this.process = null
      throw error
    }
  }

  async stop() {
    this.started = false
    for (const entry of this.pendingTools.values()) {
      clearTimeout(entry.timeout)
      this.respond(entry.requestId, null, { code: -32001, message: 'The local companion stopped.' })
    }
    this.pendingTools.clear()
    this.process?.kill('SIGTERM')
    this.process = null
    for (const timeout of this.generationCleanupTimers.values()) clearTimeout(timeout)
    this.generationCleanupTimers.clear()
    this.generations.clear()
    this.latestGenerationByTurn.clear()
    await this.sweepGeneratedFiles()
  }

  async sweepGeneratedFiles() {
    let entries
    try {
      entries = await fs.readdir(this.generatedDir, { withFileTypes: true })
    } catch (error) {
      if (error?.code === 'ENOENT') return
      throw error
    }
    await Promise.all(entries
      .filter((entry) => entry.isFile() || entry.isSymbolicLink())
      .map((entry) => fs.unlink(path.join(this.generatedDir, entry.name))))
  }

  async accountRead() {
    return this.request('account/read', { refreshToken: false })
  }

  async loginStart() {
    return this.request('account/login/start', { type: 'chatgpt', useHostedLoginSuccessPage: true })
  }

  async loginCancel(loginId) {
    return this.request('account/login/cancel', { loginId })
  }

  async logout() {
    const result = await this.request('account/logout', {})
    this.models = []
    this.lastConnected = null
    return result
  }

  async listAllowedModels() {
    const all = []
    let cursor = null
    do {
      const page = await this.request('model/list', { includeHidden: false, cursor })
      if (Array.isArray(page?.data)) all.push(...page.data)
      cursor = typeof page?.nextCursor === 'string' ? page.nextCursor : null
    } while (cursor)
    this.models = normalizeAllowedModels(all)
    return this.models
  }

  async getStatus() {
    const account = await this.accountRead()
    const connected = account?.account?.type === 'chatgpt'
    if (this.lastConnected !== null && this.lastConnected !== connected) this.models = []
    this.lastConnected = connected
    if (this.models.length === 0) await this.listAllowedModels()
    const defaultModel = this.models.find(({ model }) => model.startsWith('gpt-5.6-terra')) || this.models[0] || null
    const efforts = defaultModel?.supportedReasoningEfforts.map(({ reasoningEffort }) => reasoningEffort) || []
    return {
      available: true,
      connected,
      models: this.models,
      defaultModel: defaultModel?.id ?? null,
      defaultEffort: efforts.includes('medium') ? 'medium' : (defaultModel?.defaultReasoningEffort || efforts[0] || 'medium'),
      codexVersion: REQUIRED_CODEX_VERSION,
    }
  }

  async startThread(model) {
    const result = await this.request('thread/start', {
      model,
      cwd: this.workspaceDir,
      approvalPolicy: 'never',
      sandbox: 'read-only',
      ephemeral: true,
      historyMode: 'paginated',
      environments: [],
      runtimeWorkspaceRoots: [],
      selectedCapabilityRoots: [],
      dynamicTools: SCROLLSPLICE_DYNAMIC_TOOLS,
      developerInstructions: AGENT_DEVELOPER_INSTRUCTIONS,
      experimentalRawEvents: false,
      allowProviderModelFallback: false,
      sessionStartSource: 'startup',
    })
    return result?.thread?.id
  }

  async startTurn({ threadId, model, effort, prompt }) {
    const result = await this.request('turn/start', {
      threadId,
      input: [{ type: 'text', text: prompt, text_elements: [] }],
      model,
      effort,
      environments: [],
      runtimeWorkspaceRoots: [],
      approvalPolicy: 'never',
      sandboxPolicy: { type: 'readOnly', networkAccess: false },
    })
    return result?.turn?.id
  }

  async interrupt(threadId, turnId) {
    return this.request('turn/interrupt', { threadId, turnId })
  }

  respondToolCall(callId, envelope) {
    const pending = this.pendingTools.get(callId)
    if (!pending) throw new Error('That editor tool call is no longer pending.')
    clearTimeout(pending.timeout)
    this.pendingTools.delete(callId)
    const success = envelope?.success === true
    const preview = envelope?.result?.preview
    const imageUrl =
      typeof preview?.imageDataUrl === 'string' &&
      preview.imageDataUrl.length <= 800_000 &&
      /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(preview.imageDataUrl)
        ? preview.imageDataUrl
        : null
    const resultForText = imageUrl
      ? {
          ...envelope.result,
          preview: {
            width: preview.width,
            height: preview.height,
            logicalWidth: preview.logicalWidth,
            logicalHeight: preview.logicalHeight,
          },
        }
      : envelope?.result ?? envelope ?? null
    let text
    try {
      text = JSON.stringify(resultForText)
    } catch {
      text = JSON.stringify({ ok: false, message: 'The browser returned a non-serializable tool result.' })
    }
    if (text.length > 1_000_000) {
      text = JSON.stringify({ ok: false, message: 'The editor tool result was too large.' })
    }
    const contentItems = [{ type: 'inputText', text }]
    if (imageUrl) contentItems.push({ type: 'inputImage', imageUrl })
    this.respond(pending.requestId, { success, contentItems })
  }

  getGeneration(generationRef) {
    const entry = this.generations.get(generationRef)
    if (!entry || entry.expiresAt <= Date.now()) return null
    return entry
  }

  getLatestGenerationRef(turnId) {
    const ref = this.latestGenerationByTurn.get(turnId)
    return ref && this.getGeneration(ref) ? ref : null
  }

  request(method, params) {
    if (!this.process?.stdin?.writable) return Promise.reject(new Error('Codex App Server is not running.'))
    const id = this.nextId++
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`Codex App Server timed out on ${method}.`))
      }, this.rpcTimeoutMs)
      timeout.unref?.()
      this.pending.set(id, { resolve, reject, timeout })
      this.write({ id, method, params })
    })
  }

  notify(method, params) {
    this.write(params === undefined ? { method } : { method, params })
  }

  respond(id, result, error) {
    this.write(error ? { id, error } : { id, result })
  }

  write(message) {
    this.process?.stdin?.write(`${JSON.stringify(message)}\n`)
  }

  async handleLine(line) {
    let message
    try {
      message = JSON.parse(line)
    } catch {
      throw new Error('Codex App Server emitted malformed JSONL.')
    }

    if (Object.hasOwn(message, 'id') && !message.method) {
      const pending = this.pending.get(message.id)
      if (!pending) return
      clearTimeout(pending.timeout)
      this.pending.delete(message.id)
      if (message.error) pending.reject(new Error(String(message.error.message || 'Codex App Server request failed.')))
      else pending.resolve(message.result)
      return
    }

    if (Object.hasOwn(message, 'id') && message.method) {
      await this.handleServerRequest(message)
      return
    }

    if (message.method) await this.handleNotification(message)
  }

  async handleServerRequest(message) {
    if (message.method === 'item/tool/call') {
      const params = message.params || {}
      if (
        params.namespace !== TOOL_NAMESPACE ||
        !ALLOWED_TOOL_NAMES.has(params.tool) ||
        typeof params.callId !== 'string' ||
        typeof params.threadId !== 'string' ||
        typeof params.turnId !== 'string'
      ) {
        this.respond(message.id, null, { code: -32602, message: 'Rejected unrecognized ScrollSplice tool call.' })
        this.emit('boundaryViolation', { threadId: params.threadId, turnId: params.turnId, reason: 'Unrecognized dynamic tool request.' })
        return
      }

      const timeout = setTimeout(() => {
        const pending = this.pendingTools.get(params.callId)
        if (!pending) return
        this.pendingTools.delete(params.callId)
        this.respond(pending.requestId, {
          success: false,
          contentItems: [{ type: 'inputText', text: JSON.stringify({ ok: false, message: 'The editor tool timed out.' }) }],
        })
      }, this.toolTimeoutMs)
      timeout.unref?.()
      this.pendingTools.set(params.callId, { requestId: message.id, timeout, params })
      this.emit('toolCall', params)
      return
    }

    const decline = {
      'item/commandExecution/requestApproval': { decision: 'decline' },
      'item/fileChange/requestApproval': { decision: 'decline' },
      applyPatchApproval: { decision: 'denied' },
      execCommandApproval: { decision: 'denied' },
    }[message.method]
    if (decline) this.respond(message.id, decline)
    else this.respond(message.id, null, { code: -32601, message: 'This capability is disabled in ScrollSplice.' })
    this.emit('boundaryViolation', {
      threadId: message.params?.threadId || message.params?.conversationId,
      turnId: message.params?.turnId,
      reason: `Blocked App Server request: ${message.method}`,
    })
  }

  async handleNotification(message) {
    const { method, params = {} } = message
    if (method === 'account/updated' || method === 'account/login/completed') {
      this.models = []
    }
    if (/^(?:command|process|fs|mcp|permissions|hook)\//.test(method) || method === 'turn/diff/updated') {
      this.emit('boundaryViolation', { threadId: params.threadId, turnId: params.turnId, reason: `Blocked App Server notification: ${method}` })
      return
    }

    if (method === 'item/started' || method === 'item/completed') {
      const item = params.item
      if (DANGEROUS_ITEM_TYPES.has(item?.type) || (item?.type && !SAFE_ITEM_TYPES.has(item.type))) {
        this.emit('boundaryViolation', { threadId: params.threadId, turnId: params.turnId, reason: `Blocked item type: ${item.type}` })
        return
      }
      if (method === 'item/completed' && item?.type === 'imageGeneration' && item.status === 'completed') {
        const generation = await this.stageGeneration(item, params.turnId)
        this.emit('generation', { ...generation, threadId: params.threadId, turnId: params.turnId })
      }
    }
    this.emit('notification', { method, params })
  }

  async stageGeneration(item, turnId) {
    const decoded = await readGeneratedImage(item)
    const generationRef = randomBytes(24).toString('base64url')
    const filePath = path.join(this.generatedDir, `${generationRef}.${decoded.extension}`)
    await fs.writeFile(filePath, decoded.bytes, { mode: 0o600, flag: 'wx' })
    const entry = {
      generationRef,
      filePath,
      mediaType: decoded.mediaType,
      byteLength: decoded.bytes.length,
      revisedPrompt: typeof item.revisedPrompt === 'string' ? item.revisedPrompt : null,
      generatedAt: new Date().toISOString(),
      status: item.status,
      expiresAt: Date.now() + GENERATION_TTL_MS,
    }
    this.generations.set(generationRef, entry)
    this.latestGenerationByTurn.set(turnId, generationRef)
    const timeout = setTimeout(() => {
      this.generations.delete(generationRef)
      this.generationCleanupTimers.delete(generationRef)
      fs.unlink(filePath).catch(() => {})
    }, GENERATION_TTL_MS)
    timeout.unref?.()
    this.generationCleanupTimers.set(generationRef, timeout)
    return entry
  }

  failClosed(error) {
    this.emit('fatal', error)
    this.process?.kill('SIGTERM')
  }

  handleExit(error) {
    if (!this.process && !this.started) return
    this.started = false
    this.process = null
    for (const { reject, timeout } of this.pending.values()) {
      clearTimeout(timeout)
      reject(error)
    }
    this.pending.clear()
    this.emit('exit', error)
  }
}

async function readGeneratedImage(item) {
  let bytes
  if (typeof item.result === 'string' && /^data:image\/(?:png|jpeg|webp);base64,/i.test(item.result)) {
    bytes = Buffer.from(item.result.slice(item.result.indexOf(',') + 1), 'base64')
  } else if (typeof item.savedPath === 'string' && path.isAbsolute(item.savedPath)) {
    const stat = await fs.stat(item.savedPath)
    if (!stat.isFile() || stat.size <= 0 || stat.size > MAX_IMAGE_BYTES) throw new Error('Generated image file is invalid or too large.')
    bytes = await fs.readFile(item.savedPath)
  } else if (typeof item.result === 'string' && /^[A-Za-z0-9+/=\s]+$/.test(item.result)) {
    bytes = Buffer.from(item.result.replace(/\s/g, ''), 'base64')
  } else {
    throw new Error('Codex did not return a supported generated image payload.')
  }
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) throw new Error('Generated image is empty or too large.')
  const type = detectImageType(bytes)
  if (!type) throw new Error('Generated image is not a PNG, JPEG, or WebP file.')
  return { bytes, ...type }
}

function detectImageType(bytes) {
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { extension: 'png', mediaType: 'image/png' }
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { extension: 'jpg', mediaType: 'image/jpeg' }
  }
  if (bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP') {
    return { extension: 'webp', mediaType: 'image/webp' }
  }
  return null
}
