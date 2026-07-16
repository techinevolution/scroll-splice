import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'

import { useEditorStore } from '../app/store'
import { resolveImageAsset } from '../assets/runtime'
import {
  downloadRenderedFile,
  preflightEpisodeExport,
  renderEpisodeSlices,
  renderTallMaster,
  type EpisodeRenderResult,
  type ExportPreflightResult,
  type RenderedEpisodeFile,
} from '../export/renderEpisode'
import {
  getCandidateLogicalSliceBoundaries,
  WEBTOON_CANVAS_OBSERVED_PROFILE,
  type ExportMediaType,
} from '../export/profiles'

interface ExportDialogProps {
  readonly onClose: () => void
}

type ExportStatus = 'idle' | 'rendering' | 'ready' | 'error'

const backdropStyle: CSSProperties = {
  position: 'fixed',
  zIndex: 10_100,
  inset: 0,
  display: 'grid',
  placeItems: 'center',
  padding: 20,
  overflow: 'auto',
  background: 'rgba(8, 6, 13, 0.78)',
  backdropFilter: 'blur(8px)',
}

const dialogStyle: CSSProperties = {
  width: 'min(720px, 100%)',
  maxHeight: 'min(780px, calc(100vh - 40px))',
  overflow: 'auto',
  boxSizing: 'border-box',
  border: '1px solid rgba(193, 174, 230, 0.28)',
  borderRadius: 14,
  padding: 22,
  background: '#181321',
  color: '#f8f5ff',
  boxShadow: '0 24px 80px rgba(0, 0, 0, 0.48)',
}

const buttonStyle: CSSProperties = {
  minHeight: 36,
  border: '1px solid rgba(205, 188, 238, 0.28)',
  borderRadius: 8,
  padding: '7px 12px',
  background: '#2a2236',
  color: '#fff',
  font: 'inherit',
  fontWeight: 700,
  cursor: 'pointer',
}

function formatBytes(value: number): string {
  if (value < 1000) return `${value} B`
  if (value < 1_000_000) return `${(value / 1000).toFixed(1)} KB`
  return `${(value / 1_000_000).toFixed(2)} MB`
}

function describeFile(file: RenderedEpisodeFile): string {
  return `${file.width} × ${file.height}px · ${formatBytes(file.blob.size)}`
}

export function ExportDialog({ onClose }: ExportDialogProps) {
  const episode = useEditorStore((state) => state.episode)
  const currentRevision = useEditorStore((state) => state.currentRevision)
  const importedImageAssets = useEditorStore(
    (state) => state.importedImageAssets,
  )
  const [mediaType, setMediaType] = useState<ExportMediaType>('image/png')
  const [jpegQuality, setJpegQuality] = useState(0.92)
  const [sliceBoundaries, setSliceBoundaries] = useState<readonly number[]>(
    () =>
      getCandidateLogicalSliceBoundaries(
        WEBTOON_CANVAS_OBSERVED_PROFILE,
        episode.logicalWidth,
        episode.logicalHeight,
      ),
  )
  const [status, setStatus] = useState<ExportStatus>('idle')
  const [result, setResult] = useState<EpisodeRenderResult | null>(null)
  const [preflight, setPreflight] = useState<ExportPreflightResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [tallMaster, setTallMaster] = useState<RenderedEpisodeFile | null>(null)
  const [renderedRevision, setRenderedRevision] = useState<number | null>(null)
  const dialogRef = useRef<HTMLElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  const resolveSource = useMemo(
    () =>
      (reference: Parameters<typeof resolveImageAsset>[0]) =>
        resolveImageAsset(reference, importedImageAssets)?.sourceUrl,
    [importedImageAssets],
  )

  useEffect(() => {
    const previouslyFocused = document.activeElement
    const previousBodyOverflow = document.body.style.overflow

    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    return () => {
      document.body.style.overflow = previousBodyOverflow
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus()
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && status !== 'rendering') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== 'Tab') return

      const dialog = dialogRef.current
      const focusable = Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [href], [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      )

      if (!dialog || focusable.length === 0) {
        event.preventDefault()
        return
      }

      const first = focusable[0]
      const last = focusable.at(-1)
      const activeElement = document.activeElement
      const focusIsInside =
        activeElement instanceof Node && dialog.contains(activeElement)

      if (event.shiftKey && (activeElement === first || !focusIsInside)) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && (activeElement === last || !focusIsInside)) {
        event.preventDefault()
        first?.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose, status])

  const resultIsCurrent = renderedRevision === currentRevision

  const resetRenderedOutput = () => {
    setResult(null)
    setPreflight(null)
    setTallMaster(null)
    setRenderedRevision(null)
    setErrorMessage(null)
    setStatus('idle')
  }

  const createSlices = async () => {
    setStatus('rendering')
    setErrorMessage(null)
    setTallMaster(null)

    try {
      const nextResult = await renderEpisodeSlices({
        episode,
        profile: WEBTOON_CANVAS_OBSERVED_PROFILE,
        mediaType,
        jpegQuality,
        sliceBoundaries,
        resolveImageSource: resolveSource,
      })
      const nextPreflight = preflightEpisodeExport(
        WEBTOON_CANVAS_OBSERVED_PROFILE,
        nextResult.files,
        nextResult.missingSourceElementIds,
      )
      setResult(nextResult)
      setPreflight(nextPreflight)
      setRenderedRevision(currentRevision)
      setStatus('ready')
    } catch (error) {
      setStatus('error')
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'The browser could not render this episode.',
      )
    }
  }

  const createTallMaster = async () => {
    setStatus('rendering')
    setErrorMessage(null)

    try {
      const file = await renderTallMaster({
        episode,
        mediaType,
        jpegQuality,
        resolveImageSource: resolveSource,
      })
      setTallMaster(file)
      setRenderedRevision(currentRevision)
      setStatus('ready')
    } catch (error) {
      setStatus('error')
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'The browser could not render a tall master.',
      )
    }
  }

  const downloadAllSlices = () => {
    if (!resultIsCurrent) return

    result?.files.forEach((file, index) => {
      window.setTimeout(() => downloadRenderedFile(file), index * 120)
    })
  }

  const updateSliceBoundary = (index: number, value: number) => {
    if (!Number.isFinite(value)) return

    resetRenderedOutput()
    setSliceBoundaries((current) =>
      current.map((boundary, boundaryIndex) =>
        boundaryIndex === index ? value : boundary,
      ),
    )
  }

  const restoreProfileCuts = () => {
    resetRenderedOutput()
    setSliceBoundaries(
      getCandidateLogicalSliceBoundaries(
        WEBTOON_CANVAS_OBSERVED_PROFILE,
        episode.logicalWidth,
        episode.logicalHeight,
      ),
    )
  }

  return (
    <div style={backdropStyle} role="presentation">
      <section
        ref={dialogRef}
        data-testid="export-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-dialog-title"
        style={dialogStyle}
      >
        <header
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 18,
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                color: '#bda7e8',
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '0.13em',
                textTransform: 'uppercase',
              }}
            >
              Local render
            </p>
            <h2 id="export-dialog-title" style={{ margin: '4px 0 0' }}>
              Export episode images
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            style={buttonStyle}
            disabled={status === 'rendering'}
            onClick={onClose}
          >
            Close
          </button>
        </header>

        <div
          role="note"
          style={{
            marginTop: 18,
            border: '1px solid rgba(255, 191, 87, 0.42)',
            borderRadius: 10,
            padding: 12,
            background: 'rgba(121, 76, 19, 0.18)',
            color: '#ffe1a8',
            lineHeight: 1.45,
          }}
        >
          <strong>Provisional WEBTOON profile.</strong> These 800 × 1280px
          slices follow the limits observed on the episode form, but they have
          not yet passed the planned unpublished upload verification. Upload
          remains a manual creator step.
        </div>

        <section style={{ marginTop: 18 }} aria-labelledby="slice-cuts-title">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div>
              <h3 id="slice-cuts-title" style={{ margin: 0 }}>
                Review slice cuts
              </h3>
              <p style={{ margin: '4px 0 0', color: '#c8bdd8' }}>
                Move an interior cut away from important artwork. Preflight will
                flag any resulting slice taller than 1,280px.
              </p>
            </div>
            <button type="button" style={buttonStyle} onClick={restoreProfileCuts}>
              Reset cuts
            </button>
          </div>
          {sliceBoundaries.length > 0 ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))',
                gap: 10,
                marginTop: 12,
              }}
            >
              {sliceBoundaries.map((boundary, index) => (
                <label
                  key={index}
                  style={{ display: 'grid', gap: 5, color: '#e7def4' }}
                >
                  Cut {index + 1} position
                  <input
                    type="number"
                    min={Math.ceil((sliceBoundaries[index - 1] ?? 0) + 1)}
                    max={Math.floor(
                      (sliceBoundaries[index + 1] ?? episode.logicalHeight) - 1,
                    )}
                    step="1"
                    value={Math.round(boundary)}
                    disabled={status === 'rendering'}
                    onChange={(event) =>
                      updateSliceBoundary(index, Number(event.currentTarget.value))
                    }
                    style={{ ...buttonStyle, fontWeight: 500 }}
                  />
                </label>
              ))}
            </div>
          ) : (
            <p style={{ color: '#c8bdd8' }}>
              This episode fits in one profile-sized image.
            </p>
          )}
        </section>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 14,
            marginTop: 18,
          }}
        >
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontWeight: 700 }}>Format</span>
            <select
              value={mediaType}
              disabled={status === 'rendering'}
              onChange={(event) => {
                resetRenderedOutput()
                setMediaType(event.currentTarget.value as ExportMediaType)
              }}
              style={{ ...buttonStyle, fontWeight: 500 }}
            >
              <option value="image/png">PNG (keeps transparency)</option>
              <option value="image/jpeg">JPEG (smaller files)</option>
            </select>
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontWeight: 700 }}>
              JPEG quality {Math.round(jpegQuality * 100)}%
            </span>
            <input
              type="range"
              min="50"
              max="100"
              step="1"
              value={Math.round(jpegQuality * 100)}
              disabled={mediaType !== 'image/jpeg' || status === 'rendering'}
              onChange={(event) => {
                resetRenderedOutput()
                setJpegQuality(Number(event.currentTarget.value) / 100)
              }}
            />
          </label>
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            marginTop: 18,
          }}
        >
          <button
            data-testid="render-slices"
            type="button"
            style={{ ...buttonStyle, background: '#5b3e85' }}
            disabled={status === 'rendering'}
            onClick={() => void createSlices()}
          >
            {status === 'rendering' ? 'Rendering…' : 'Render safe slices'}
          </button>
          <button
            type="button"
            style={buttonStyle}
            disabled={status === 'rendering'}
            onClick={() => void createTallMaster()}
          >
            Render tall master
          </button>
        </div>

        {errorMessage ? (
          <p role="alert" style={{ color: '#ff9f9f', fontWeight: 700 }}>
            {errorMessage}
          </p>
        ) : null}

        {!resultIsCurrent && renderedRevision !== null ? (
          <p role="status" style={{ color: '#ffe1a8', fontWeight: 700 }}>
            The episode changed after this render. Render again for current files.
          </p>
        ) : null}

        {resultIsCurrent && preflight ? (
          <section style={{ marginTop: 20 }} aria-labelledby="preflight-title">
            <h3 id="preflight-title" style={{ marginBottom: 8 }}>
              Preflight: {preflight.ready ? 'passes observed limits' : 'needs attention'}
            </h3>
            <p style={{ margin: '0 0 10px', color: '#c8bdd8' }}>
              {result?.files.length ?? 0} file
              {(result?.files.length ?? 0) === 1 ? '' : 's'} ·{' '}
              {formatBytes(preflight.totalBytes)} total
            </p>
            {preflight.issues.length > 0 ? (
              <ul style={{ color: '#ffb3b3', lineHeight: 1.5 }}>
                {preflight.issues.map((issue, index) => (
                  <li key={`${issue.code}-${issue.fileName ?? index}`}>
                    {issue.message}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}

        {resultIsCurrent && result ? (
          <section style={{ marginTop: 18 }} aria-labelledby="slice-files-title">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <h3 id="slice-files-title" style={{ margin: 0 }}>
                Sliced files
              </h3>
              <button
                type="button"
                style={buttonStyle}
                disabled={!preflight?.ready}
                onClick={downloadAllSlices}
              >
                Download all
              </button>
            </div>
            <ol style={{ paddingLeft: 22, lineHeight: 1.45 }}>
              {result.files.map((file) => (
                <li key={file.fileName} style={{ marginTop: 10 }}>
                  <span style={{ overflowWrap: 'anywhere' }}>
                    <strong>{file.fileName}</strong>
                    <br />
                    <small style={{ color: '#c8bdd8' }}>
                      {describeFile(file)}
                    </small>
                  </span>{' '}
                  <button
                    type="button"
                    style={{ ...buttonStyle, minHeight: 30, marginLeft: 8 }}
                    onClick={() => downloadRenderedFile(file)}
                  >
                    Download
                  </button>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {resultIsCurrent && tallMaster ? (
          <section style={{ marginTop: 18 }} aria-labelledby="tall-master-title">
            <h3 id="tall-master-title">Tall master</h3>
            <p style={{ color: '#c8bdd8' }}>
              {tallMaster.fileName} · {describeFile(tallMaster)}
            </p>
            <button
              type="button"
              style={buttonStyle}
              onClick={() => downloadRenderedFile(tallMaster)}
            >
              Download tall master
            </button>
          </section>
        ) : null}
      </section>
    </div>
  )
}
