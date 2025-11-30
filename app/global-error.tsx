'use client'

// Next.js 16 global error boundary
// Uses inline styles to avoid any CSS/context dependencies during prerendering
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1c1917',
        color: '#fafaf9',
        fontFamily: 'system-ui, sans-serif',
        margin: 0,
        padding: '1rem'
      }}>
        <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>Something went wrong!</h2>
        <button
          onClick={() => reset()}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#f97316',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          Try again
        </button>
      </body>
    </html>
  )
}
