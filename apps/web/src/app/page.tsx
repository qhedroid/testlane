export default function HomePage() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
      <h1>Relay</h1>
      <p>Local development server is running.</p>
      <p>
        <a href="/runs">Test Runs</a> — data-backed integration screen
      </p>
      <p>
        Health check:{' '}
        <a href="/api/health">/api/health</a>
      </p>
    </main>
  )
}
