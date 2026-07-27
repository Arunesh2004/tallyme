export function LoadingSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4 w-full">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col space-y-3">
          <div className="h-[125px] w-full rounded-xl bg-muted animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 w-[250px] bg-muted animate-pulse rounded" />
            <div className="h-4 w-[200px] bg-muted animate-pulse rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
