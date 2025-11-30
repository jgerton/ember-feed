export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      backgroundColor: '#1c1917',
      color: '#fafaf9'
    }}>
      <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#f97316', marginBottom: '1rem' }}>404</h1>
      <h2 style={{ fontSize: '1.25rem', color: '#d4d4d4', marginBottom: '1.5rem' }}>Page Not Found</h2>
      <p style={{ color: '#a3a3a3', marginBottom: '2rem', textAlign: 'center', maxWidth: '28rem' }}>
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <a
        href="/"
        style={{
          padding: '0.75rem 1.5rem',
          backgroundColor: '#f97316',
          color: 'white',
          borderRadius: '0.5rem',
          textDecoration: 'none'
        }}
      >
        Return Home
      </a>
    </div>
  )
}
