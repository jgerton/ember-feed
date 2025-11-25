'use client'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  disabled?: boolean
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  disabled = false
}: PaginationProps) {
  if (totalPages <= 1) return null

  const isFirstPage = currentPage === 1
  const isLastPage = currentPage === totalPages

  const buttonClass = (isDisabled: boolean) => `
    px-3 py-1.5 text-sm rounded-lg transition-all duration-200
    ${isDisabled || disabled
      ? 'bg-neutral-800/30 text-neutral-600 cursor-not-allowed'
      : 'bg-neutral-800/50 text-neutral-300 hover:bg-neutral-700/50 hover:text-neutral-100'
    }
  `

  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {/* First */}
      <button
        onClick={() => onPageChange(1)}
        disabled={isFirstPage || disabled}
        className={buttonClass(isFirstPage)}
        title="First page"
      >
        First
      </button>

      {/* Previous */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={isFirstPage || disabled}
        className={buttonClass(isFirstPage)}
        title="Previous page"
      >
        Prev
      </button>

      {/* Page indicator */}
      <span className="px-4 py-1.5 text-sm text-neutral-300 bg-neutral-800/30 rounded-lg">
        Page <span className="font-semibold text-ember-400">{currentPage}</span> of{' '}
        <span className="font-semibold text-ember-400">{totalPages}</span>
      </span>

      {/* Next */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={isLastPage || disabled}
        className={buttonClass(isLastPage)}
        title="Next page"
      >
        Next
      </button>

      {/* Last */}
      <button
        onClick={() => onPageChange(totalPages)}
        disabled={isLastPage || disabled}
        className={buttonClass(isLastPage)}
        title="Last page"
      >
        Last
      </button>
    </div>
  )
}
