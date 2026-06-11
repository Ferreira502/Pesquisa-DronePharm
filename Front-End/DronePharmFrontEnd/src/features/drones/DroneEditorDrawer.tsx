import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { toast } from "sonner";

import {
  atualizarDrone,
  atualizarStatusDrone,
  getDrone,
  reativarDrone,
} from "@/api/drones";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/FormInput";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import type { DroneResponse, StatusDroneEnum } from "@/types/api";

import { BateriaIndicador } from "./BateriaIndicador";
import { getStatusBadgeConfig } from "./droneUi";
import { useDronesStore } from "./store/useDronesStore";

const OVERLAY_CLASS_NAME =
  "fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]";
const DRAWER_CLASS_NAME =
  "fixed right-0 top-0 z-50 flex h-dvh w-full max-w-[460px] flex-col border-l border-[var(--surface-border)] bg-[var(--surface-panel)] shadow-[-24px_0_48px_rgba(0,0,0,0.35)]";
const HEADER_CLASS_NAME =
  "flex items-start justify-between gap-4 border-b border-[var(--surface-border)] px-6 py-5";
const HEADER_META_CLASS_NAME = "flex flex-col gap-1";
const TITLE_CLASS_NAME = "text-lg font-semibold text-[var(--text-primary)]";
const SUBTITLE_CLASS_NAME = "text-sm text-[var(--text-secondary)]";
const SECTION_CLASS_NAME =
  "flex flex-col gap-4 border-b border-[var(--surface-border)] px-6 py-5";
const SECTION_TITLE_CLASS_NAME =
  "text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]";
const GRID_CLASS_NAME = "grid gap-3 sm:grid-cols-2";
const METRIC_CARD_CLASS_NAME =
  "rounded-[var(--radius-md)] border border-[var(--surface-border)] bg-[var(--surface-card)] px-4 py-3";
const METRIC_LABEL_CLASS_NAME =
  "text-[0.6875rem] uppercase tracking-[0.06em] text-[var(--text-secondary)]";
const METRIC_VALUE_CLASS_NAME =
  "mt-1 text-sm font-medium text-[var(--text-primary)]";
const FORM_CONTROL_CLASS_NAME =
  "h-[38px] w-full appearance-none rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface-input)] px-3 pr-10 text-sm text-[var(--text-primary)] outline-none transition-[border-color,box-shadow] duration-150 focus:border-[var(--accent)] focus:shadow-[var(--shadow-focus)]";
const ACTION_ROW_CLASS_NAME = "flex flex-wrap gap-2";
const PRIMARY_BUTTON_CLASS_NAME =
  "h-[34px] rounded-[var(--radius-sm)] bg-[var(--accent)] px-4 text-[var(--text-inverse)] hover:bg-[var(--accent-dim)]";
const SECONDARY_BUTTON_CLASS_NAME =
  "h-[34px] rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-transparent px-4 text-[var(--text-secondary)] hover:bg-[var(--surface-overlay)] hover:text-[var(--text-primary)]";
const FIELD_HINT_CLASS_NAME = "text-xs text-[var(--text-secondary)]";
const ERROR_BLOCK_CLASS_NAME =
  "rounded-[var(--radius-md)] border border-[var(--status-danger)] bg-[var(--status-danger-bg)] px-4 py-3 text-sm text-[var(--status-danger)]";
const PROGRESS_TRACK_CLASS_NAME =
  "h-2 overflow-hidden rounded-full bg-[var(--surface-border)]";
const PROGRESS_FILL_CLASS_NAME =
  "h-full rounded-full bg-[var(--accent)] transition-[width] duration-150";
const QUERY_STALE_TIME = 15_000;

const STATUS_OPTIONS: Array<{ label: string; value: StatusDroneEnum }> = [
  { label: "Aguardando", value: "aguardando" },
  { label: "Em voo", value: "em_voo" },
  { label: "Retornando", value: "retornando" },
  { label: "Carregando", value: "carregando" },
  { label: "Manutenção", value: "manutencao" },
  { label: "Emergência", value: "emergencia" },
];

interface DroneEditorDrawerProps {
  droneId: string;
  onClose: () => void;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Não foi possível carregar o drone.";
}

function clampBatteryPercent(value: number): number {
  if (Number.isNaN(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, value));
}

function toPayloadBatteryPct(value: number): number {
  return clampBatteryPercent(value) / 100;
}

function formatMetricBattery(value: number): string {
  return `${value.toFixed(1)}%`;
}

function getDisplayBatteryPercent(
  batteryPct: number,
  chargeProgress: number,
  isCharging: boolean,
): number {
  if (!isCharging) {
    return batteryPct;
  }

  const simulatedBattery = batteryPct + (100 - batteryPct) * (chargeProgress / 100);

  return Number(simulatedBattery.toFixed(1));
}

async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

interface DroneEditorDrawerContentProps {
  drone: DroneResponse;
  droneId: string;
  onClose: () => void;
}

function DroneEditorDrawerContent({
  drone,
  droneId,
  onClose,
}: DroneEditorDrawerContentProps): ReactElement {
  const queryClient = useQueryClient();
  const updateDroneStore = useDronesStore((state) => state.atualizar);
  const mountedRef = useRef(true);
  const [selectedStatus, setSelectedStatus] = useState<StatusDroneEnum>(
    drone.status,
  );
  const [batteryPct, setBatteryPct] = useState(
    Math.round(drone.bateria_pct * 100),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isCharging, setIsCharging] = useState(false);
  const [chargeProgress, setChargeProgress] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const statusBadgeConfig = useMemo(
    () => getStatusBadgeConfig(selectedStatus),
    [selectedStatus],
  );
  const displayBatteryPct = getDisplayBatteryPercent(
    batteryPct,
    chargeProgress,
    isCharging,
  );
  const canEdit = !isSaving && !isCharging;

  async function handleSave(): Promise<void> {
    setActionError(null);
    setIsSaving(true);

    try {
      const updatedDrone = await atualizarDrone(droneId, {
        status: selectedStatus,
        bateria_pct: toPayloadBatteryPct(batteryPct),
      });

      updateDroneStore(updatedDrone);
      queryClient.setQueryData(["drone", droneId], updatedDrone);
      await queryClient.invalidateQueries({ queryKey: ["drones"] });

      if (mountedRef.current) {
        setSelectedStatus(updatedDrone.status);
        setBatteryPct(Math.round(updatedDrone.bateria_pct * 100));
      }

      toast.success("Drone atualizado com sucesso.");
    } catch (error) {
      setActionError(getErrorMessage(error));
      toast.error("Não foi possível salvar o drone.");
    } finally {
      if (mountedRef.current) {
        setIsSaving(false);
      }
    }
  }

  async function handleStartCharging(): Promise<void> {
    if (isCharging) {
      return;
    }

    setActionError(null);
    setIsCharging(true);
    setChargeProgress(0);

    try {
      await atualizarStatusDrone(droneId, "carregando");
      updateDroneStore({
        ...drone,
        status: "carregando",
      });

      if (mountedRef.current) {
        setSelectedStatus("carregando");
      }

      for (const progress of [20, 40, 60, 80, 100]) {
        await wait(420);

        if (!mountedRef.current) {
          continue;
        }

        setChargeProgress(progress);
      }

      await reativarDrone(droneId, 1);

      const refreshedDrone: DroneResponse = {
        ...drone,
        status: "aguardando",
        bateria_pct: 1,
      };

      updateDroneStore(refreshedDrone);
      queryClient.setQueryData(["drone", droneId], refreshedDrone);
      await queryClient.invalidateQueries({ queryKey: ["drones"] });

      if (mountedRef.current) {
        setSelectedStatus("aguardando");
        setBatteryPct(100);
        setChargeProgress(100);
      }

      toast.success("Recarga concluída. Drone reativado com bateria cheia.");
    } catch (error) {
      setActionError(getErrorMessage(error));
      toast.error("Não foi possível concluir a recarga.");
    } finally {
      if (mountedRef.current) {
        setIsCharging(false);
      }
    }
  }

  return (
    <>
      <div className={HEADER_CLASS_NAME}>
        <div className={HEADER_META_CLASS_NAME}>
          <div className="flex items-center gap-2">
            <h2
              id={`drone-drawer-title-${droneId}`}
              className={TITLE_CLASS_NAME}
            >
              {drone.nome}
            </h2>
            <span
              className={cn(
                "rounded-[var(--radius-sm)] px-2 py-0.5 text-xs font-medium",
                statusBadgeConfig.className,
              )}
            >
              {statusBadgeConfig.label}
            </span>
          </div>
          <p className={SUBTITLE_CLASS_NAME}>
            ID {droneId} · controle individual de bateria e status
          </p>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0 rounded-full"
          onClick={onClose}
          aria-label="Fechar painel"
        >
          <X className="size-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <section className={SECTION_CLASS_NAME}>
          <div className={SECTION_TITLE_CLASS_NAME}>Visão geral</div>
          <div className={GRID_CLASS_NAME}>
            <div className={METRIC_CARD_CLASS_NAME}>
              <div className={METRIC_LABEL_CLASS_NAME}>Bateria atual</div>
              <div className={METRIC_VALUE_CLASS_NAME}>
                {formatMetricBattery(displayBatteryPct)}
              </div>
              <div className="mt-3">
                <BateriaIndicador bateriaPct={displayBatteryPct / 100} />
              </div>
            </div>

            <div className={METRIC_CARD_CLASS_NAME}>
              <div className={METRIC_LABEL_CLASS_NAME}>Status</div>
              <div className={METRIC_VALUE_CLASS_NAME}>
                {statusBadgeConfig.label}
              </div>
              <p className="mt-3 text-xs text-[var(--text-secondary)]">
                O status enviado ao backend segue o enum do contrato.
              </p>
            </div>

            <div className={METRIC_CARD_CLASS_NAME}>
              <div className={METRIC_LABEL_CLASS_NAME}>Autonomia</div>
              <div className={METRIC_VALUE_CLASS_NAME}>
                {`${drone.autonomia_max_km.toFixed(1)} km`}
              </div>
            </div>

            <div className={METRIC_CARD_CLASS_NAME}>
              <div className={METRIC_LABEL_CLASS_NAME}>Velocidade</div>
              <div className={METRIC_VALUE_CLASS_NAME}>
                {`${drone.velocidade_ms.toFixed(1)} m/s`}
              </div>
            </div>
          </div>
        </section>

        <section className={SECTION_CLASS_NAME}>
          <div className={SECTION_TITLE_CLASS_NAME}>Edição manual</div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label
                htmlFor={`drone-status-${droneId}`}
                className="text-sm font-medium text-[var(--text-secondary)]"
              >
                Status operacional
              </label>
              <select
                id={`drone-status-${droneId}`}
                className={FORM_CONTROL_CLASS_NAME}
                value={selectedStatus}
                disabled={!canEdit}
                onChange={(event) => {
                  setSelectedStatus(event.target.value as StatusDroneEnum);
                }}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <FormInput
              label="Bateria (%)"
              type="number"
              min={0}
              max={100}
              step="0.1"
              inputMode="decimal"
              suffix="%"
              useDataFont
              disabled={!canEdit}
              value={batteryPct}
              onChange={(event) => {
                const parsedValue = Number(event.target.value);
                setBatteryPct(clampBatteryPercent(parsedValue));
              }}
              hint="O payload será enviado como 0.0 a 1.0 para manter fidelidade ao contrato."
            />

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--text-secondary)]">
                  Ajuste fino
                </span>
                <span className="text-xs font-medium text-[var(--text-muted)] [font-family:var(--font-data)]">
                  {batteryPct.toFixed(1)}%
                </span>
              </div>

              <Slider
                value={[batteryPct]}
                min={0}
                max={100}
                step={1}
                disabled={!canEdit}
                onValueChange={(values) => {
                  setBatteryPct(clampBatteryPercent(values[0] ?? 0));
                }}
              />
            </div>
          </div>
        </section>

        <section className={SECTION_CLASS_NAME}>
          <div className={SECTION_TITLE_CLASS_NAME}>Ação rápida</div>
          <div className={ACTION_ROW_CLASS_NAME}>
            <Button
              type="button"
              className={PRIMARY_BUTTON_CLASS_NAME}
              disabled={isCharging || selectedStatus === "carregando"}
              onClick={() => {
                void handleStartCharging();
              }}
            >
              {isCharging ? "Recarregando..." : "Recarregar Drone"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className={SECONDARY_BUTTON_CLASS_NAME}
              onClick={onClose}
            >
              Fechar
            </Button>
          </div>

          {isCharging ? (
            <div className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--surface-border)] bg-[var(--surface-card)] px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--text-secondary)]">
                  Simulando recarga...
                </span>
                <span className="font-medium text-[var(--text-primary)]">
                  {chargeProgress}%
                </span>
              </div>
              <div className={PROGRESS_TRACK_CLASS_NAME}>
                <div
                  className={PROGRESS_FILL_CLASS_NAME}
                  style={{ width: `${chargeProgress}%` }}
                />
              </div>
              <p className={FIELD_HINT_CLASS_NAME}>
                Ao concluir, a interface aciona `POST /api/v1/frota/{droneId}/reativar`
                com `bateria_pct=1.0`.
              </p>
            </div>
          ) : null}
        </section>

        {actionError ? (
          <section className={SECTION_CLASS_NAME}>
            <div className={ERROR_BLOCK_CLASS_NAME}>{actionError}</div>
          </section>
        ) : null}

        <section className={SECTION_CLASS_NAME}>
          <div className={SECTION_TITLE_CLASS_NAME}>Posição atual</div>
          <div className={GRID_CLASS_NAME}>
            <div className={METRIC_CARD_CLASS_NAME}>
              <div className={METRIC_LABEL_CLASS_NAME}>Latitude</div>
              <div className={METRIC_VALUE_CLASS_NAME}>
                {drone.latitude_atual ?? "-"}
              </div>
            </div>
            <div className={METRIC_CARD_CLASS_NAME}>
              <div className={METRIC_LABEL_CLASS_NAME}>Longitude</div>
              <div className={METRIC_VALUE_CLASS_NAME}>
                {drone.longitude_atual ?? "-"}
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="border-t border-[var(--surface-border)] px-6 py-4">
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            className={SECONDARY_BUTTON_CLASS_NAME}
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            className={PRIMARY_BUTTON_CLASS_NAME}
            disabled={!canEdit}
            onClick={() => {
              void handleSave();
            }}
          >
            {isSaving ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </div>
    </>
  );
}

export function DroneEditorDrawer({
  droneId,
  onClose,
}: DroneEditorDrawerProps): ReactElement {
  const cachedDrone = useDronesStore((state) =>
    state.drones.find((drone) => drone.id === droneId),
  );
  const droneQuery = useQuery({
    queryKey: ["drone", droneId],
    queryFn: () => getDrone(droneId),
    enabled: droneId.length > 0,
    staleTime: QUERY_STALE_TIME,
    placeholderData: cachedDrone,
  });

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (droneQuery.data === undefined) {
    return (
      <>
        <button
          type="button"
          className={OVERLAY_CLASS_NAME}
          aria-label="Fechar painel lateral"
          onClick={onClose}
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-labelledby={`drone-drawer-title-${droneId}`}
          className={DRAWER_CLASS_NAME}
        >
          <div className={HEADER_CLASS_NAME}>
            <div className={HEADER_META_CLASS_NAME}>
              <div className="flex items-center gap-2">
                <h2
                  id={`drone-drawer-title-${droneId}`}
                  className={TITLE_CLASS_NAME}
                >
                  Carregando drone...
                </h2>
              </div>
              <p className={SUBTITLE_CLASS_NAME}>
                ID {droneId} · carregando dados do contrato
              </p>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0 rounded-full"
              onClick={onClose}
              aria-label="Fechar painel"
            >
              <X className="size-4" />
            </Button>
          </div>

          <div className="flex flex-1 items-center justify-center px-6 text-sm text-[var(--text-secondary)]">
            {droneQuery.isError
              ? getErrorMessage(droneQuery.error)
              : "Carregando dados do drone..."}
          </div>
        </aside>
      </>
    );
  }

  const drone = droneQuery.data;

  return (
    <>
      <button
        type="button"
        className={OVERLAY_CLASS_NAME}
        aria-label="Fechar painel lateral"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={`drone-drawer-title-${droneId}`}
        className={DRAWER_CLASS_NAME}
      >
        <DroneEditorDrawerContent
          key={drone.id}
          drone={drone}
          droneId={droneId}
          onClose={onClose}
        />
      </aside>
    </>
  );
}

export default DroneEditorDrawer;
