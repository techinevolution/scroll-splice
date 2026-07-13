interface VisibilityIconProps {
  readonly visible: boolean
}

export function VisibilityIcon({ visible }: VisibilityIconProps) {
  return (
    <span
      className={`visibility-icon${visible ? '' : ' is-hidden'}`}
      aria-hidden="true"
    />
  )
}
