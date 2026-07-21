import { useEffect, useRef } from 'react'

export interface HelpDialogProps {
  readonly onClose: () => void
}

export function HelpDialog({ onClose }: HelpDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current

    if (dialog && !dialog.open) {
      dialog.showModal()
    }

    return () => {
      if (dialog?.open) {
        dialog.close()
      }
    }
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className="help-dialog"
      aria-labelledby="help-dialog-heading"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <header className="help-dialog-heading">
        <div>
          <p className="panel-kicker">Local Browser Editor</p>
          <h2 id="help-dialog-heading">ScrollSplice Help</h2>
        </div>
        <button type="button" aria-label="Close help" onClick={onClose}>
          ×
        </button>
      </header>

      <section aria-labelledby="help-shortcuts-heading">
        <h3 id="help-shortcuts-heading">Keyboard Shortcuts</h3>
        <dl className="shortcut-list">
          <div>
            <dt>Save</dt>
            <dd>⌘/Ctrl + S</dd>
          </div>
          <div>
            <dt>Save As a New Local Project</dt>
            <dd>⇧ + ⌘/Ctrl + S</dd>
          </div>
          <div>
            <dt>Undo</dt>
            <dd>⌘/Ctrl + Z</dd>
          </div>
          <div>
            <dt>Redo</dt>
            <dd>⇧ + ⌘/Ctrl + Z</dd>
          </div>
          <div>
            <dt>Duplicate Selection</dt>
            <dd>⌘/Ctrl + D</dd>
          </div>
          <div>
            <dt>Nudge Selection</dt>
            <dd>Arrow keys · Shift for 10px</dd>
          </div>
          <div>
            <dt>Delete Selection</dt>
            <dd>Delete / Backspace</dd>
          </div>
          <div>
            <dt>Bypass Snapping While Dragging</dt>
            <dd>Hold Alt/Option</dd>
          </div>
          <div>
            <dt>Close an Overlay</dt>
            <dd>Escape</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="help-about-heading">
        <h3 id="help-about-heading">About</h3>
        <p>
          ScrollSplice is a local-first editor for arranging long vertical
          comics. Your episode and reusable assets stay in this browser unless
          you deliberately export or upload them. A portable .scrollsplice
          project includes the episode and its complete local asset library so
          it can be reopened in another browser.
        </p>
      </section>
    </dialog>
  )
}
