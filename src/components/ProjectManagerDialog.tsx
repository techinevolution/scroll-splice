import { useEffect, useRef } from 'react'

import type { LocalProjectSummary } from '../persistence/projectLibraryRepository'

interface ProjectManagerDialogProps {
  readonly projects: readonly LocalProjectSummary[]
  readonly currentProjectId: string | null
  readonly busy: boolean
  readonly onOpen: (projectId: string) => void
  readonly onDelete: (projectId: string, name: string) => void
  readonly onClose: () => void
}

export function ProjectManagerDialog({
  projects,
  currentProjectId,
  busy,
  onOpen,
  onDelete,
  onClose,
}: ProjectManagerDialogProps) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const previouslyFocused = document.activeElement
    const previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      } else if (event.key === 'Tab') {
        const focusable = Array.from(
          dialogRef.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled), [href], input:not(:disabled), [tabindex]:not([tabindex="-1"])',
          ) ?? [],
        )

        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable.at(-1)

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = previousBodyOverflow
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus()
    }
  }, [onClose])

  return (
    <div className="project-dialog-backdrop" role="presentation">
      <section
        ref={dialogRef}
        className="project-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-dialog-title"
      >
        <header>
          <div>
            <p className="panel-kicker">This Browser</p>
            <h2 id="project-dialog-title">Local Projects</h2>
          </div>
          <button
            ref={closeRef}
            className="project-dialog-close"
            type="button"
            aria-label="Close local projects"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        {projects.length === 0 ? (
          <p className="project-dialog-empty">
            No saved local projects yet. Choose File → Save to create one.
          </p>
        ) : (
          <ul className="project-list">
            {projects.map((project) => {
              const current = project.projectId === currentProjectId

              return (
                <li key={project.projectId}>
                  <div className="project-list-copy">
                    <strong>{project.name}</strong>
                    <span>
                      Updated {new Date(project.updatedAt).toLocaleString()}
                      {current ? ' · Current' : ''}
                    </span>
                  </div>
                  <div className="project-list-actions">
                    <button
                      type="button"
                      disabled={busy || current}
                      onClick={() => onOpen(project.projectId)}
                    >
                      {current ? 'Current' : 'Open'}
                    </button>
                    <button
                      className="project-delete-button"
                      type="button"
                      disabled={busy}
                      aria-label={`Delete local project ${project.name}`}
                      onClick={() => onDelete(project.projectId, project.name)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        <footer>
          <p>
            Projects and imported sources stay in this browser unless you export
            a portable <strong>.scrollsplice</strong> file.
          </p>
          <button type="button" onClick={onClose}>
            Done
          </button>
        </footer>
      </section>
    </div>
  )
}
