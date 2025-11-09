export default function Page() {
  return (
    <main style={{
      display: 'flex',
      minHeight: '100vh',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: 16,
      fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, "Helvetica Neue", Arial, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"'
    }}>
      <h1 style={{ fontSize: 28, margin: 0 }}>Agentic Forex Bot</h1>
      <p style={{ opacity: 0.8, margin: 0 }}>Deployed and ready. Serverless cron will run analysis and trading.</p>
      <div style={{ marginTop: 12, fontSize: 12, opacity: 0.7 }}>
        <code>API: /api/run</code>
      </div>
    </main>
  );
}
