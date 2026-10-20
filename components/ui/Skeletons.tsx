import { cn } from "@/lib/utils";

export function Bone({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-slate-200/70", className)} />;
}

export function ProductGridSkeleton({ count = 8, cols = "lg:grid-cols-4" }: { count?: number; cols?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6", cols)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          <Bone className="aspect-[4/5] rounded-2xl" />
          <Bone className="mt-3 h-3 w-1/3" />
          <Bone className="mt-2 h-4 w-3/4" />
          <Bone className="mt-3 h-5 w-1/4" />
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="container-x py-10">
      <Bone className="h-9 w-64" />
      <Bone className="mt-3 h-4 w-96 max-w-full" />
      <div className="mt-10">
        <ProductGridSkeleton />
      </div>
    </div>
  );
}

export function AdminSkeleton() {
  return (
    <div>
      <Bone className="h-8 w-56" />
      <Bone className="mt-2 h-4 w-80 max-w-full" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-5">
            <Bone className="h-4 w-24" />
            <Bone className="mt-4 h-7 w-32" />
          </div>
        ))}
      </div>
      <div className="card mt-6 p-5">
        <Bone className="h-10 w-full max-w-md" />
        <div className="mt-5 space-y-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Bone className="h-10 w-10 shrink-0" />
              <Bone className="h-4 flex-1" />
              <Bone className="h-4 w-24" />
              <Bone className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
