export default function AdminLoading() {
  return (
    <div className="min-h-dvh bg-canvas">
      <div className="shell flex gap-6 py-6" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading the dashboard</span>
        <div className="hidden w-[248px] shrink-0 animate-pulse bg-ink/90 lg:block" style={{ height: 480 }} />
        <div className="flex-1 animate-pulse space-y-3">
          <div className="h-3 w-28 bg-line/60" />
          <div className="h-7 w-64 bg-line/60" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-24 border border-line bg-surface" />
            ))}
          </div>
          <div className="h-64 border border-line bg-surface" />
        </div>
      </div>
    </div>
  );
}
