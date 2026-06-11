import { useState, type ChangeEvent, type ReactElement } from "react";

import { AlertTriangle, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { PedidoStatus } from "@/types/api";

import {
  canCancelPedido,
  getMonitoringBadgeClassName,
  hasFlightLock,
  isPedidoSelectable,
} from "../monitoringUtils";

const SECTION_CLASS_NAME =
  "flex flex-col gap-3 border-b border-[var(--surface-border)] px-5 py-[14px]";
const TITLE_CLASS_NAME =
  "text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]";
const LOCK_BLOCK_CLASS_NAME =
  "flex items-center gap-2 rounded-[var(--radius-md)] border border-[rgba(139,92,246,0.35)] bg-[var(--status-lock-bg)] px-[13px] py-[10px] text-[0.8125rem] text-[var(--status-lock)]";
const ACTION_ROW_CLASS_NAME = "flex flex-wrap gap-2";
const PRIMARY_BUTTON_CLASS_NAME =
  "h-[34px] rounded-[var(--radius-sm)] bg-[var(--accent)] px-4 text-[var(--text-inverse)] hover:bg-[var(--accent-dim)]";
const GHOST_BUTTON_CLASS_NAME =
  "h-[34px] rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-transparent px-4 text-[var(--text-secondary)] hover:bg-[var(--surface-overlay)] hover:text-[var(--text-primary)]";
const DANGER_BUTTON_CLASS_NAME =
  "h-[34px] rounded-[var(--radius-sm)] border border-[rgba(239,68,68,0.3)] bg-[var(--status-danger-bg)] px-4 text-[var(--status-danger)] hover:bg-[rgba(239,68,68,0.18)]";
const SELECT_CLASS_NAME =
  "h-[38px] w-full appearance-none rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface-input)] px-3 pr-10 text-sm text-[var(--text-primary)] outline-none transition-[border-color,box-shadow] duration-150 focus:border-[var(--accent)] focus:shadow-[var(--shadow-focus)]";
const DISABLED_BUTTON_CLASS_NAME = "bdis opacity-30";

interface DroneOption {
  value: string;
  label: string;
}

interface StatusControlProps {
  status: PedidoStatus;
  pedidoId: number;
  rotaId?: number | null;
  replayEnabled?: boolean;
  replayVisible?: boolean;
  selectedDroneId?: string;
  droneOptions?: DroneOption[];
  isCalculatingRoute?: boolean;
  isStartingFlight?: boolean;
  isSimulatingNow?: boolean;
  isSimulationRunning?: boolean;
  isAbortingFlight?: boolean;
  canStartFlight?: boolean;
  canCalculateRoute?: boolean;
  routeCalculationBlockedReason?: string | null;
  onCancelar: () => void;
  onEntregar: () => void;
  onAbortarSimulacao?: () => void;
  onSimularAgora?: () => void;
  onToggleReplay?: () => void;
  onSelectedDroneChange?: (droneId: string) => void;
  onCalcularRota?: () => void;
  onIniciarVoo?: () => void;
}

function renderStatusBadge(status: PedidoStatus): ReactElement {
  const badgeClassName = getMonitoringBadgeClassName(status);

  return (
    <span className={`badge ${badgeClassName}`} translate="no">
      {status}
    </span>
  );
}

function renderDisabledClass(disabled: boolean, baseClassName: string): string {
  return disabled ? `${baseClassName} ${DISABLED_BUTTON_CLASS_NAME}` : baseClassName;
}

export function StatusControl({
  status,
  pedidoId,
  rotaId = null,
  replayEnabled = false,
  replayVisible = false,
  selectedDroneId = "",
  droneOptions = [],
  isCalculatingRoute = false,
  isStartingFlight = false,
  isSimulatingNow = false,
  isSimulationRunning = false,
  isAbortingFlight = false,
  canStartFlight = false,
  canCalculateRoute = true,
  routeCalculationBlockedReason = null,
  onCancelar,
  onEntregar,
  onAbortarSimulacao = () => {},
  onSimularAgora = () => {},
  onToggleReplay = () => {},
  onSelectedDroneChange = () => {},
  onCalcularRota = () => {},
  onIniciarVoo = () => {},
}: StatusControlProps): ReactElement {
  const [dialogOpen, setDialogOpen] = useState(false);
  const flightLocked = hasFlightLock(status);
  const canCancel = canCancelPedido(status);
  const isRouteCalculationAvailable = isPedidoSelectable(status) && canCalculateRoute;
  const canShowDroneSelector = isPedidoSelectable(status) || status === "calculado";
  const canManualDeliver = status === "em_voo";
  const canAbortSimulation =
    rotaId !== null && rotaId !== undefined && (status === "despachado" || status === "em_voo");
  const replayDisabled = !replayEnabled;

  function handleDroneChange(event: ChangeEvent<HTMLSelectElement>): void {
    onSelectedDroneChange(event.target.value);
  }

  return (
    <>
      <section className={SECTION_CLASS_NAME} aria-label="Controle operacional">
        <div className={TITLE_CLASS_NAME}>Controle</div>
        {renderStatusBadge(status)}

        {canShowDroneSelector ? (
          <div className="flex flex-col gap-2">
            <label
              htmlFor="drone-selector"
              className="text-sm font-medium text-[var(--text-secondary)]"
            >
              Drone de missão
            </label>
            <select
              id="drone-selector"
              name="drone-selector"
              aria-label="Selecionar drone da missão"
              className={SELECT_CLASS_NAME}
              value={selectedDroneId}
              onChange={handleDroneChange}
            >
              <option value="" disabled>
                Selecione um drone disponível
              </option>
              {droneOptions.map((drone) => (
                <option key={drone.value} value={drone.value}>
                  {drone.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {flightLocked ? (
          <div className={LOCK_BLOCK_CLASS_NAME}>
            <Lock aria-hidden="true" className="size-4" />
            <div className="flex flex-col">
              <span className="font-medium">Operação bloqueada durante voo</span>
              <span className="text-xs opacity-80">
                Aguardando conclusão da missão
              </span>
            </div>
          </div>
        ) : null}

        <div className={ACTION_ROW_CLASS_NAME}>
          {isRouteCalculationAvailable ? (
            <Button
              type="button"
              className={renderDisabledClass(false, PRIMARY_BUTTON_CLASS_NAME)}
              disabled={isCalculatingRoute}
              onClick={onCalcularRota}
            >
              {isCalculatingRoute ? "Calculando..." : "Calcular Rota"}
            </Button>
          ) : isPedidoSelectable(status) ? (
            <Button
              type="button"
              className={renderDisabledClass(true, PRIMARY_BUTTON_CLASS_NAME)}
              disabled
              title={routeCalculationBlockedReason ?? undefined}
            >
              {routeCalculationBlockedReason ?? "Calcular Rota"}
            </Button>
          ) : null}

          {status === "calculado" ? (
            <>
              <Button
                type="button"
                className={renderDisabledClass(!canStartFlight, PRIMARY_BUTTON_CLASS_NAME)}
                disabled={!canStartFlight || isStartingFlight}
                onClick={onIniciarVoo}
              >
                {isStartingFlight ? "Iniciando..." : "Iniciar Voo"}
              </Button>
              <Button
                type="button"
                className={renderDisabledClass(
                  !canStartFlight || isSimulationRunning,
                  PRIMARY_BUTTON_CLASS_NAME,
                )}
                disabled={!canStartFlight || isSimulatingNow || isSimulationRunning}
                onClick={onSimularAgora}
              >
                {isSimulatingNow || isSimulationRunning
                  ? "Simulando..."
                  : "Simular Agora"}
              </Button>
            </>
          ) : null}

          <Button
            type="button"
            className={renderDisabledClass(!canManualDeliver, PRIMARY_BUTTON_CLASS_NAME)}
            disabled={!canManualDeliver}
            onClick={onEntregar}
          >
            Confirmar Entrega Manual
          </Button>

          <Button
            type="button"
            className={renderDisabledClass(!canAbortSimulation, DANGER_BUTTON_CLASS_NAME)}
            disabled={!canAbortSimulation || isAbortingFlight}
            onClick={onAbortarSimulacao}
          >
            {isAbortingFlight ? "Abortando..." : "Abortar Simulação"}
          </Button>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                type="button"
                className={renderDisabledClass(!canCancel, DANGER_BUTTON_CLASS_NAME)}
                disabled={!canCancel}
              >
                Cancelar
              </Button>
            </DialogTrigger>
            <DialogContent className="border border-[var(--surface-border)] bg-[var(--surface-panel)] text-[var(--text-primary)]">
              <DialogHeader>
                <DialogTitle>Cancelar Pedido</DialogTitle>
                <DialogDescription className="text-[var(--text-secondary)]">
                  Confirme o cancelamento do pedido #{pedidoId}.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Fechar</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button
                    type="button"
                    className={DANGER_BUTTON_CLASS_NAME}
                    onClick={onCancelar}
                  >
                    Confirmar cancelamento
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button
            type="button"
            className={renderDisabledClass(
              replayDisabled && !replayVisible,
              replayVisible ? PRIMARY_BUTTON_CLASS_NAME : GHOST_BUTTON_CLASS_NAME,
            )}
            disabled={replayDisabled}
            onClick={onToggleReplay}
          >
            Modo Replay
          </Button>
        </div>

        {!isRouteCalculationAvailable && isPedidoSelectable(status) ? (
          <div className="flex items-start gap-2 rounded-[var(--radius-md)] border border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.12)] px-3 py-2 text-xs text-[var(--text-secondary)]">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[rgba(245,158,11,0.95)]" />
            <span>
              {routeCalculationBlockedReason ??
                "Não há depósito ativo para calcular rotas no momento."}
            </span>
          </div>
        ) : null}
      </section>

      <section className={SECTION_CLASS_NAME} aria-label="Estados do pedido">
        <div className={TITLE_CLASS_NAME}>Estados do Pedido</div>
        <div className="flex flex-wrap gap-2">
          <span className="badge bn">pendente</span>
          <span className="badge bi">calculado</span>
          <span className="badge bi">despachado</span>
          <span className="badge bk">em_voo</span>
          <span className="badge bo">entregue</span>
          <span className="badge bd">cancelado</span>
          <span className="badge bd">falha</span>
        </div>
      </section>
    </>
  );
}
