import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from 'react'

export interface AppMenuBarProps {
  readonly canUndo: boolean
  readonly canRedo: boolean
  readonly canReopen: boolean
  readonly isInspectorOpen: boolean
  readonly theme: 'light' | 'dark'
  readonly showDetailsBar: boolean
  readonly onNewEpisode: () => void
  readonly onOpenLocalProject: () => void
  readonly onSave: () => void
  readonly onSaveAs: () => void
  readonly onReopen: () => void
  readonly onImportProject: () => void
  readonly onExportProject: () => void
  readonly onExportEpisodeImages: () => void
  readonly onUndo: () => void
  readonly onRedo: () => void
  readonly onReaderPreview: () => void
  readonly onSetTheme: (theme: 'light' | 'dark') => void
  readonly onToggleDetailsBar: () => void
  readonly onToggleInspector: () => void
  readonly onOpenHelp: () => void
}

type MenuName = 'file' | 'edit' | 'view' | 'window' | 'help'
type MenuFocusTarget = 'first' | 'last'

const MENU_NAMES: readonly MenuName[] = [
  'file',
  'edit',
  'view',
  'window',
  'help',
]

interface MenuItemDefinition {
  readonly label: string
  readonly disabled?: boolean
  readonly action: () => void
}

function getEnabledMenuItems(menu: HTMLElement | null) {
  if (!menu) {
    return []
  }

  return Array.from(
    menu.querySelectorAll<HTMLButtonElement>(
      'button[role="menuitem"]:not(:disabled)',
    ),
  )
}

export function AppMenuBar({
  canUndo,
  canRedo,
  canReopen,
  isInspectorOpen,
  theme,
  showDetailsBar,
  onNewEpisode,
  onOpenLocalProject,
  onSave,
  onSaveAs,
  onReopen,
  onImportProject,
  onExportProject,
  onExportEpisodeImages,
  onUndo,
  onRedo,
  onReaderPreview,
  onSetTheme,
  onToggleDetailsBar,
  onToggleInspector,
  onOpenHelp,
}: AppMenuBarProps) {
  const componentId = useId()
  const rootRef = useRef<HTMLElement>(null)
  const fileTriggerRef = useRef<HTMLButtonElement>(null)
  const editTriggerRef = useRef<HTMLButtonElement>(null)
  const viewTriggerRef = useRef<HTMLButtonElement>(null)
  const windowTriggerRef = useRef<HTMLButtonElement>(null)
  const helpTriggerRef = useRef<HTMLButtonElement>(null)
  const fileMenuRef = useRef<HTMLDivElement>(null)
  const editMenuRef = useRef<HTMLDivElement>(null)
  const viewMenuRef = useRef<HTMLDivElement>(null)
  const windowMenuRef = useRef<HTMLDivElement>(null)
  const helpMenuRef = useRef<HTMLDivElement>(null)
  const requestedFocusRef = useRef<MenuFocusTarget>('first')
  const [openMenu, setOpenMenu] = useState<MenuName | null>(null)

  const fileTriggerId = `${componentId}-file-trigger`
  const editTriggerId = `${componentId}-edit-trigger`
  const fileMenuId = `${componentId}-file-menu`
  const editMenuId = `${componentId}-edit-menu`
  const viewTriggerId = `${componentId}-view-trigger`
  const viewMenuId = `${componentId}-view-menu`
  const windowTriggerId = `${componentId}-window-trigger`
  const windowMenuId = `${componentId}-window-menu`
  const helpTriggerId = `${componentId}-help-trigger`
  const helpMenuId = `${componentId}-help-menu`

  const getTrigger = (menu: MenuName) => {
    if (menu === 'file') return fileTriggerRef.current
    if (menu === 'edit') return editTriggerRef.current
    if (menu === 'view') return viewTriggerRef.current
    if (menu === 'window') return windowTriggerRef.current
    return helpTriggerRef.current
  }

  const getMenu = (menu: MenuName) => {
    if (menu === 'file') return fileMenuRef.current
    if (menu === 'edit') return editMenuRef.current
    if (menu === 'view') return viewMenuRef.current
    if (menu === 'window') return windowMenuRef.current
    return helpMenuRef.current
  }

  useEffect(() => {
    if (!openMenu) {
      return
    }

    const menu = getMenu(openMenu)
    const enabledItems = getEnabledMenuItems(menu)
    const target =
      requestedFocusRef.current === 'last'
        ? enabledItems.at(-1)
        : enabledItems[0]

    target?.focus()
  }, [openMenu])

  useEffect(() => {
    if (!openMenu) {
      return
    }

    const handleOutsidePointer = (event: PointerEvent) => {
      const target = event.target

      if (target instanceof Node && !rootRef.current?.contains(target)) {
        setOpenMenu(null)
      }
    }

    document.addEventListener('pointerdown', handleOutsidePointer)
    return () => document.removeEventListener('pointerdown', handleOutsidePointer)
  }, [openMenu])

  const openMenuAndFocus = (
    menu: MenuName,
    focusTarget: MenuFocusTarget,
  ) => {
    requestedFocusRef.current = focusTarget
    setOpenMenu(menu)
  }

  const closeMenu = (menu: MenuName, returnFocus: boolean) => {
    setOpenMenu(null)

    if (returnFocus) {
      getTrigger(menu)?.focus()
    }
  }

  const getAdjacentMenu = (menu: MenuName, direction: -1 | 1) => {
    const currentIndex = MENU_NAMES.indexOf(menu)
    return MENU_NAMES[
      (currentIndex + direction + MENU_NAMES.length) % MENU_NAMES.length
    ] ?? menu
  }

  const switchMenu = (menu: MenuName, direction: -1 | 1) => {
    const nextMenu = getAdjacentMenu(menu, direction)
    getTrigger(nextMenu)?.focus()
    openMenuAndFocus(nextMenu, 'first')
  }

  const handleTriggerKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    menu: MenuName,
  ) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      openMenuAndFocus(menu, 'first')
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      openMenuAndFocus(menu, 'last')
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      const direction = event.key === 'ArrowLeft' ? -1 : 1
      const nextMenu = getAdjacentMenu(menu, direction)

      if (openMenu) {
        getTrigger(nextMenu)?.focus()
        openMenuAndFocus(nextMenu, 'first')
      } else {
        getTrigger(nextMenu)?.focus()
      }
    } else if (event.key === 'Escape' && openMenu) {
      event.preventDefault()
      closeMenu(menu, true)
    }
  }

  const handleMenuKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
    menu: MenuName,
  ) => {
    const enabledItems = getEnabledMenuItems(event.currentTarget)
    const currentIndex = enabledItems.findIndex(
      (item) => item === document.activeElement,
    )

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()

      if (enabledItems.length === 0) {
        return
      }

      const direction = event.key === 'ArrowDown' ? 1 : -1
      const nextIndex =
        currentIndex < 0
          ? direction > 0
            ? 0
            : enabledItems.length - 1
          : (currentIndex + direction + enabledItems.length) %
            enabledItems.length

      enabledItems[nextIndex]?.focus()
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      const target =
        event.key === 'Home' ? enabledItems[0] : enabledItems.at(-1)
      target?.focus()
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      switchMenu(menu, event.key === 'ArrowLeft' ? -1 : 1)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      closeMenu(menu, true)
    } else if (event.key === 'Tab') {
      setOpenMenu(null)
    }
  }

  const runAction = (menu: MenuName, action: () => void) => {
    closeMenu(menu, true)
    action()
  }

  const fileItems: readonly MenuItemDefinition[] = [
    { label: 'New Episode', action: onNewEpisode },
    { label: 'Open Local Project…', action: onOpenLocalProject },
    { label: 'Save', action: onSave },
    { label: 'Save As…', action: onSaveAs },
    { label: 'Reopen Current', disabled: !canReopen, action: onReopen },
    { label: 'Import Project…', action: onImportProject },
    { label: 'Export Project File…', action: onExportProject },
    { label: 'Export Episode Images…', action: onExportEpisodeImages },
  ]
  const editItems: readonly MenuItemDefinition[] = [
    { label: 'Undo', disabled: !canUndo, action: onUndo },
    { label: 'Redo', disabled: !canRedo, action: onRedo },
  ]
  const viewItems: readonly MenuItemDefinition[] = [
    { label: 'Reader Preview', action: onReaderPreview },
    {
      label: 'Use Light Mode',
      disabled: theme === 'light',
      action: () => onSetTheme('light'),
    },
    {
      label: 'Use Dark Mode',
      disabled: theme === 'dark',
      action: () => onSetTheme('dark'),
    },
    {
      label: showDetailsBar ? 'Hide Details Bar' : 'Show Details Bar',
      action: onToggleDetailsBar,
    },
  ]
  const windowItems: readonly MenuItemDefinition[] = [
    {
      label: isInspectorOpen ? 'Hide Inspector' : 'Show Inspector',
      action: onToggleInspector,
    },
  ]
  const helpItems: readonly MenuItemDefinition[] = [
    { label: 'Shortcuts & About', action: onOpenHelp },
  ]

  const renderMenu = (
    menu: MenuName,
    triggerId: string,
    menuId: string,
    menuRef: RefObject<HTMLDivElement | null>,
    items: readonly MenuItemDefinition[],
  ) =>
    openMenu === menu ? (
      <div
        ref={menuRef}
        className="app-menu-popover"
        id={menuId}
        role="menu"
        aria-labelledby={triggerId}
        onKeyDown={(event) => handleMenuKeyDown(event, menu)}
      >
        {items.map((item) => (
          <button
            key={item.label}
            className="app-menu-item"
            type="button"
            role="menuitem"
            disabled={item.disabled}
            onClick={() => runAction(menu, item.action)}
          >
            {item.label}
          </button>
        ))}
      </div>
    ) : null

  return (
    <nav
      ref={rootRef}
      className="app-menu-bar"
      aria-label="Application menu"
      onBlur={(event) => {
        const nextTarget = event.relatedTarget

        if (
          nextTarget instanceof Node &&
          event.currentTarget.contains(nextTarget)
        ) {
          return
        }

        setOpenMenu(null)
      }}
    >
      <div className="app-menu-group">
        <button
          ref={fileTriggerRef}
          className="app-menu-trigger"
          id={fileTriggerId}
          type="button"
          aria-haspopup="menu"
          aria-expanded={openMenu === 'file'}
          aria-controls={fileMenuId}
          onClick={() =>
            openMenu === 'file'
              ? setOpenMenu(null)
              : openMenuAndFocus('file', 'first')
          }
          onKeyDown={(event) => handleTriggerKeyDown(event, 'file')}
        >
          File
        </button>
        {renderMenu(
          'file',
          fileTriggerId,
          fileMenuId,
          fileMenuRef,
          fileItems,
        )}
      </div>

      <div className="app-menu-group">
        <button
          ref={editTriggerRef}
          className="app-menu-trigger"
          id={editTriggerId}
          type="button"
          aria-haspopup="menu"
          aria-expanded={openMenu === 'edit'}
          aria-controls={editMenuId}
          onClick={() =>
            openMenu === 'edit'
              ? setOpenMenu(null)
              : openMenuAndFocus('edit', 'first')
          }
          onKeyDown={(event) => handleTriggerKeyDown(event, 'edit')}
        >
          Edit
        </button>
        {renderMenu(
          'edit',
          editTriggerId,
          editMenuId,
          editMenuRef,
          editItems,
        )}
      </div>

      <div className="app-menu-group">
        <button
          ref={viewTriggerRef}
          className="app-menu-trigger"
          id={viewTriggerId}
          type="button"
          aria-haspopup="menu"
          aria-expanded={openMenu === 'view'}
          aria-controls={viewMenuId}
          onClick={() =>
            openMenu === 'view'
              ? setOpenMenu(null)
              : openMenuAndFocus('view', 'first')
          }
          onKeyDown={(event) => handleTriggerKeyDown(event, 'view')}
        >
          View
        </button>
        {renderMenu(
          'view',
          viewTriggerId,
          viewMenuId,
          viewMenuRef,
          viewItems,
        )}
      </div>

      <div className="app-menu-group">
        <button
          ref={windowTriggerRef}
          className="app-menu-trigger"
          id={windowTriggerId}
          type="button"
          aria-haspopup="menu"
          aria-expanded={openMenu === 'window'}
          aria-controls={windowMenuId}
          onClick={() =>
            openMenu === 'window'
              ? setOpenMenu(null)
              : openMenuAndFocus('window', 'first')
          }
          onKeyDown={(event) => handleTriggerKeyDown(event, 'window')}
        >
          Window
        </button>
        {renderMenu(
          'window',
          windowTriggerId,
          windowMenuId,
          windowMenuRef,
          windowItems,
        )}
      </div>

      <div className="app-menu-group">
        <button
          ref={helpTriggerRef}
          className="app-menu-trigger"
          id={helpTriggerId}
          type="button"
          aria-haspopup="menu"
          aria-expanded={openMenu === 'help'}
          aria-controls={helpMenuId}
          onClick={() =>
            openMenu === 'help'
              ? setOpenMenu(null)
              : openMenuAndFocus('help', 'first')
          }
          onKeyDown={(event) => handleTriggerKeyDown(event, 'help')}
        >
          Help
        </button>
        {renderMenu(
          'help',
          helpTriggerId,
          helpMenuId,
          helpMenuRef,
          helpItems,
        )}
      </div>
    </nav>
  )
}
