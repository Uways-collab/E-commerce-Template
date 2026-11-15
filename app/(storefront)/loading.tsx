export default function StorefrontLoading() {
  return (
    <div className="shell py-14" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      <div className="animate-pulse space-y-8">
        <div className="space-y-3">
          <div className="h-2.5 w-24 bg-line/60" />
          <div className="h-8 w-2/3 max-w-md bg-line/60" />
          <div className="h-2.5 w-1/2 max-w-xs bg-line/50" />
        </div>
        <div className="grid grid-cols-2 gap-x-3.5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="space-y-2.5">
              <div className="aspect-[4/5] w-full bg-line/50" />
              <div className="h-2.5 w-3/4 bg-line/50" />
              <div className="h-2 w-1/3 bg-line/40" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
