import type { StatusDroneEnum } from "@/types/api";

export interface StatusBadgeConfig {
  label: string;
  className: string;
}

export function formatBatteryPercent(bateriaPct: number | null): string {
  if (bateriaPct === null) {
    return "-";
  }

  return `${Math.round(bateriaPct * 100)}%`;
}

export function getBatteryColorClass(percentage: number): string {
  if (percentage < 20) {
    return "bg-[var(--status-danger)]";
  }

  if (percentage < 50) {
    return "bg-[var(--status-warn)]";
  }

  return "bg-[var(--status-ok)]";
}

export function getBatteryTextClass(percentage: number): string {
  if (percentage < 20) {
    return "text-[var(--status-danger)]";
  }

  if (percentage < 50) {
    return "text-[var(--status-warn)]";
  }

  return "text-[var(--status-ok)]";
}

export function getStatusBadgeConfig(status: StatusDroneEnum): StatusBadgeConfig {
  switch (status) {
    case "aguardando":
      return {
        label: "Aguardando",
        className:
          "border-transparent bg-[var(--status-ok-bg)] text-[var(--status-ok)]",
      };
    case "em_voo":
      return {
        label: "Em voo",
        className:
          "border-transparent bg-[var(--status-lock-bg)] text-[var(--status-lock)]",
      };
    case "retornando":
      return {
        label: "Retornando",
        className:
          "border-transparent bg-[var(--status-info-bg)] text-[var(--status-info)]",
      };
    case "carregando":
      return {
        label: "Carregando",
        className:
          "border-transparent bg-[var(--status-warn-bg)] text-[var(--status-warn)]",
      };
    case "manutencao":
      return {
        label: "Manutencao",
        className:
          "border-transparent bg-[var(--status-danger-bg)] text-[var(--status-danger)]",
      };
    case "emergencia":
    default:
      return {
        label: "Emergencia",
        className:
          "border-transparent bg-[var(--status-danger-bg)] text-[var(--status-danger)]",
      };
  }
}
