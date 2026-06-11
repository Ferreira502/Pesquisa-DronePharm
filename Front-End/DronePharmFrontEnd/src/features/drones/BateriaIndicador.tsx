import type { ReactElement } from "react";

import { cn } from "@/lib/utils";

import {
  getBatteryColorClass,
  getBatteryTextClass,
} from "./droneUi";

export function BateriaIndicador({
  bateriaPct,
}: {
  bateriaPct: number | null;
}): ReactElement {
  if (bateriaPct === null) {
    return <span className="text-[var(--text-muted)]">-</span>;
  }

  const percentage = Math.round(bateriaPct * 100);
  const batteryColorClass = getBatteryColorClass(percentage);
  const batteryTextClass = getBatteryTextClass(percentage);

  return (
    <div
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percentage}
      className="flex min-w-[120px] items-center gap-3"
    >
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--surface-border)]">
        <div
          className={cn("h-full rounded-full transition-[width] duration-150", batteryColorClass)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span
        className={cn(
          "min-w-10 text-right text-sm font-medium",
          batteryTextClass,
          "[font-family:var(--font-data)]",
        )}
      >
        {percentage}%
      </span>
    </div>
  );
}
