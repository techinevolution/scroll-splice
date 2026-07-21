import { resolveImageAsset } from '../assets/runtime'
import { useEditorStore } from '../app/store'
import { renderTallMaster } from '../export/renderEpisode'

const PREVIEW_MAX_WIDTH_PX = 400
const PREVIEW_MAX_HEIGHT_PX = 2_000

export interface EditorVisualPreview {
  readonly imageDataUrl: string
  readonly width: number
  readonly height: number
  readonly logicalWidth: number
  readonly logicalHeight: number
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('The editor preview could not be encoded.'))
    reader.onload = () =>
      typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('The editor preview could not be encoded.'))
    reader.readAsDataURL(blob)
  })
}

export async function renderEditorVisualPreview(): Promise<EditorVisualPreview> {
  const state = useEditorStore.getState()
  const episode = state.episode
  const outputWidth = Math.max(
    1,
    Math.min(
      PREVIEW_MAX_WIDTH_PX,
      Math.floor(
        (PREVIEW_MAX_HEIGHT_PX * episode.logicalWidth) /
          episode.logicalHeight,
      ),
    ),
  )
  const file = await renderTallMaster({
    episode,
    mediaType: 'image/jpeg',
    jpegQuality: 0.82,
    outputWidthPx: outputWidth,
    resolveImageSource: (reference) =>
      resolveImageAsset(reference, state.importedImageAssets)?.sourceUrl,
  })

  return {
    imageDataUrl: await blobToDataUrl(file.blob),
    width: file.width,
    height: file.height,
    logicalWidth: episode.logicalWidth,
    logicalHeight: episode.logicalHeight,
  }
}
