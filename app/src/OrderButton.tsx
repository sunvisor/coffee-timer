type Props = {
  direction: 'up' | 'down'
  label: string
  disabled: boolean
  onClick: () => void
}

export function OrderButton({ direction, label, disabled, onClick }: Props) {
  return (
    <button
      type="button"
      className="order-button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={direction === 'up' ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6'} />
      </svg>
    </button>
  )
}
