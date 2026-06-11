import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

const CARD_ITEMS = [0, 1, 2] as const
const FIELD_ITEMS = [0, 1, 2] as const

type FormSkeletonProps = {
  className?: string
}

function FormSkeleton({ className }: FormSkeletonProps) {
  return (
    <div
      data-slot="form-skeleton"
      className={cn("min-h-dvh bg-[var(--surface-base)]", className)}
    >
      <div className="border-b border-[var(--surface-border)] bg-[var(--surface-panel)]">
        <div className="mx-auto flex h-14 w-full max-w-[760px] items-center justify-between px-6">
          <Skeleton className="h-4 w-40 bg-[var(--surface-overlay)]" />
          <Skeleton className="h-9 w-32 rounded-[var(--radius-sm)] bg-[var(--surface-overlay)]" />
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[760px] flex-col gap-6 px-6 py-8">
        <Skeleton className="h-7 w-56 bg-[var(--surface-overlay)]" />
        <Skeleton className="h-4 w-80 max-w-full bg-[var(--surface-overlay)]" />

        {CARD_ITEMS.map((cardItem) => (
          <section
            key={cardItem}
            className="rounded-[var(--radius-lg)] border border-[var(--surface-border)] bg-[var(--surface-card)] p-7"
          >
            <Skeleton className="mb-5 h-4 w-32 bg-[var(--surface-overlay)]" />
            <div className="grid gap-4 md:grid-cols-2">
              {FIELD_ITEMS.map((fieldItem) => (
                <div key={`${cardItem}-${fieldItem}`} className="flex flex-col gap-2">
                  <Skeleton className="h-3 w-24 bg-[var(--surface-overlay)]" />
                  <Skeleton className="h-[38px] w-full rounded-[var(--radius-sm)] bg-[var(--surface-input)]" />
                  <Skeleton className="h-3 w-36 bg-[var(--surface-overlay)]" />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

export { FormSkeleton }
