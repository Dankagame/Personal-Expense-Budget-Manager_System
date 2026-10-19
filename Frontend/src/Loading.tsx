function Spinner() {
  return <span className="app-spinner" aria-hidden="true" />
}

export function LoadingState({ label, fullPage = false }: { label: string; fullPage?: boolean }) {
  return (
    <div className={`app-loading${fullPage ? ' app-loading-page' : ''}`} role="status" aria-live="polite">
      <Spinner />
      <span>{label}</span>
    </div>
  )
}

export function ButtonLoading({ label }: { label: string }) {
  return <span className="app-button-loading"><Spinner />{label}</span>
}
