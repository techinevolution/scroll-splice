import { useEditorStore } from '../app/store'
import {
  COMPOSITION_GROUP_LABELS,
  COMPOSITION_GROUPS,
} from '../core/episode'
import { VisibilityIcon } from './VisibilityIcon'

export function CompositionGroupControls() {
  const activeCompositionGroup = useEditorStore(
    (state) => state.activeCompositionGroup,
  )
  const compositionGroupVisibility = useEditorStore(
    (state) => state.episode.compositionGroupVisibility,
  )
  const setActiveCompositionGroup = useEditorStore(
    (state) => state.setActiveCompositionGroup,
  )
  const setCompositionGroupVisibility = useEditorStore(
    (state) => state.setCompositionGroupVisibility,
  )

  return (
    <div className="composition-groups" role="group" aria-label="Composition groups">
      {COMPOSITION_GROUPS.map((group) => {
        const label = COMPOSITION_GROUP_LABELS[group]
        const isActive = group === activeCompositionGroup
        const isVisible = compositionGroupVisibility[group]

        return (
          <div
            className={`composition-group-control${isActive ? ' is-active' : ''}${isVisible ? '' : ' is-hidden'}`}
            key={group}
          >
            <button
              className="composition-group-select"
              type="button"
              aria-label={`${label} composition group`}
              aria-pressed={isActive}
              data-composition-group={group}
              onClick={() => setActiveCompositionGroup(group)}
            >
              {label}
            </button>
            <button
              className="composition-group-eye"
              type="button"
              aria-label={`${label} group visibility`}
              aria-pressed={isVisible}
              title={`${isVisible ? 'Hide' : 'Show'} ${label} group`}
              onClick={() => setCompositionGroupVisibility(group, !isVisible)}
            >
              <VisibilityIcon visible={isVisible} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
