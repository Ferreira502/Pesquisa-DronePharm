import { type ReactElement } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type FieldError } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";

import { criarDrone } from "@/api/drones";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/FormInput";
import type { DroneCreate, HTTPValidationError } from "@/types/api";

import {
  droneSchema,
  type DroneFormData,
  type DroneFormInput,
} from "./droneSchema";
import { useDronesStore } from "./store/useDronesStore";

const PAGE_CLASS_NAME = "min-h-[calc(100dvh-56px)] bg-[var(--surface-base)]";
const TOPBAR_CLASS_NAME =
  "border-b border-[var(--surface-border)] bg-[var(--surface-panel)]";
const TOPBAR_CONTENT_CLASS_NAME =
  "mx-auto flex h-14 w-full max-w-[760px] items-center justify-between gap-4 px-6";
const BREADCRUMB_CLASS_NAME = "flex items-center gap-2 text-sm";
const BREADCRUMB_LINK_CLASS_NAME =
  "text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]";
const BREADCRUMB_CURRENT_CLASS_NAME = "text-[var(--text-primary)]";
const ACTIONS_CLASS_NAME = "flex items-center gap-2";
const CONTENT_CLASS_NAME =
  "mx-auto flex w-full max-w-[760px] flex-col gap-6 px-6 py-8";
const TITLE_CLASS_NAME = "text-xl font-semibold text-[var(--text-primary)]";
const DESCRIPTION_CLASS_NAME = "text-sm text-[var(--text-secondary)]";
const CARD_CLASS_NAME =
  "rounded-[var(--radius-lg)] border border-[var(--surface-border)] bg-[var(--surface-card)] p-7";
const CARD_TITLE_CLASS_NAME =
  "mb-4 text-sm font-medium uppercase tracking-[0.07em] text-[var(--text-secondary)]";
const GRID_TWO_COLUMNS_CLASS_NAME = "grid gap-4 md:grid-cols-2";
const GRID_THREE_COLUMNS_CLASS_NAME = "grid gap-4 md:grid-cols-3";
const DIVIDER_CLASS_NAME = "my-6 border-t border-[var(--surface-border)]";
const ROOT_ERROR_CLASS_NAME =
  "mb-4 rounded-[var(--radius-md)] border border-[var(--status-danger)] bg-[var(--status-danger-bg)] px-4 py-3 text-sm text-[var(--status-danger)]";
const FOOTER_ACTIONS_CLASS_NAME = "flex items-center justify-end gap-3";
const DRONES_ROUTE_PATH = "/drones";
const FIRMWARE_HINT =
  "Use o mesmo identificador configurado no firmware e na telemetria.";
const SAVE_ERROR_MESSAGE = "Não foi possível registrar o drone.";

type DroneFieldName = keyof DroneFormData;

const DRONE_FIELD_NAMES: DroneFieldName[] = [
  "id",
  "modelo",
  "autonomia_km",
  "carga_max_kg",
  "velocidade_ms",
];

function isValidationError(error: unknown): error is HTTPValidationError {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  return "detail" in error;
}

function getErrorMessage(error: unknown): string {
  if (isValidationError(error)) {
    return error.detail?.[0]?.msg ?? SAVE_ERROR_MESSAGE;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return SAVE_ERROR_MESSAGE;
}

function getFieldError(error: unknown): FieldError | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }

  if (!("message" in error)) {
    return undefined;
  }

  return error as FieldError;
}

function getFieldNameFromLocation(
  location: Array<string | number> | undefined
): DroneFieldName | null {
  if (location === undefined) {
    return null;
  }

  for (let index = location.length - 1; index >= 0; index -= 1) {
    const part = location[index];

    if (
      typeof part === "string" &&
      DRONE_FIELD_NAMES.includes(part as DroneFieldName)
    ) {
      return part as DroneFieldName;
    }
  }

  return null;
}

function buildDronePayload(data: DroneFormData): DroneCreate {
  return {
    id: data.id,
    nome: data.modelo,
    autonomia_max_km: data.autonomia_km,
    capacidade_max_kg: data.carga_max_kg,
    velocidade_ms: data.velocidade_ms,
  };
}

export function FormDrone(): ReactElement {
  const navigate = useNavigate();
  const adicionarDrone = useDronesStore((state) => state.adicionar);
  const {
    handleSubmit,
    register,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<DroneFormInput, undefined, DroneFormData>({
    resolver: zodResolver(droneSchema),
    defaultValues: {
      id: "",
      modelo: "",
      autonomia_km: "",
      carga_max_kg: "",
      velocidade_ms: "",
    },
  });

  async function handleValidSubmit(data: DroneFormData): Promise<void> {
    try {
      const droneCriado = await criarDrone(buildDronePayload(data));

      adicionarDrone(droneCriado);
      navigate(DRONES_ROUTE_PATH);
    } catch (error) {
      if (!isValidationError(error) || error.detail === undefined) {
        setError("root", {
          type: "server",
          message: getErrorMessage(error),
        });
        return;
      }

      let hasMappedFieldError = false;

      for (const detail of error.detail) {
        const fieldName = getFieldNameFromLocation(detail.loc);

        if (fieldName === null) {
          continue;
        }

        hasMappedFieldError = true;
        setError(fieldName, {
          type: detail.type,
          message: detail.msg,
        });
      }

      if (hasMappedFieldError) {
        return;
      }

      setError("root", {
        type: "server",
        message: getErrorMessage(error),
      });
    }
  }

  return (
    <section className={PAGE_CLASS_NAME}>
      <div className={TOPBAR_CLASS_NAME}>
        <div className={TOPBAR_CONTENT_CLASS_NAME}>
          <nav aria-label="Breadcrumb" className={BREADCRUMB_CLASS_NAME}>
            <Link to={DRONES_ROUTE_PATH} className={BREADCRUMB_LINK_CLASS_NAME}>
              Drones
            </Link>
            <span className="text-[var(--text-muted)]">/</span>
            <span className={BREADCRUMB_CURRENT_CLASS_NAME}>Novo Drone</span>
          </nav>

          <div className={ACTIONS_CLASS_NAME}>
            <Button asChild variant="outline" type="button">
              <Link to={DRONES_ROUTE_PATH}>Cancelar</Link>
            </Button>
            <Button form="drone-form" type="submit" disabled={isSubmitting}>
              Registrar Drone
            </Button>
          </div>
        </div>
      </div>

      <div className={CONTENT_CLASS_NAME}>
        <header className="flex flex-col gap-1">
          <h1 className={TITLE_CLASS_NAME}>Novo Drone</h1>
          <p className={DESCRIPTION_CLASS_NAME}>
            Cadastre uma nova unidade da frota para operação e telemetria.
          </p>
        </header>

        <form
          id="drone-form"
          onSubmit={handleSubmit(handleValidSubmit)}
          className="flex flex-col gap-6"
        >
          <section className={CARD_CLASS_NAME}>
            <h2 className={CARD_TITLE_CLASS_NAME}>Identificação</h2>

            <div className={GRID_TWO_COLUMNS_CLASS_NAME}>
              <FormInput
                label="ID"
                required
                hint={FIRMWARE_HINT}
                error={getFieldError(errors.id)}
                useDataFont
                autoComplete="off"
                placeholder="DP-01"
                {...register("id")}
              />
              <FormInput
                label="Modelo"
                required
                error={getFieldError(errors.modelo)}
                autoComplete="off"
                placeholder="DronePharm-01"
                {...register("modelo")}
              />
            </div>
          </section>

          <section className={CARD_CLASS_NAME}>
            <h2 className={CARD_TITLE_CLASS_NAME}>Especificações Técnicas</h2>

            <div className={GRID_THREE_COLUMNS_CLASS_NAME}>
              <FormInput
                label="Autonomia"
                required
                type="number"
                suffix="km"
                error={getFieldError(errors.autonomia_km)}
                useDataFont
                {...register("autonomia_km")}
              />
              <FormInput
                label="Carga máxima"
                required
                type="number"
                suffix="kg"
                error={getFieldError(errors.carga_max_kg)}
                useDataFont
                {...register("carga_max_kg")}
              />
              <FormInput
                label="Velocidade cruzeiro"
                required
                type="number"
                suffix="m/s"
                error={getFieldError(errors.velocidade_ms)}
                useDataFont
                {...register("velocidade_ms")}
              />
            </div>

            <div className={DIVIDER_CLASS_NAME} />

            {errors.root?.message ? (
              <p role="alert" className={ROOT_ERROR_CLASS_NAME}>
                {errors.root.message}
              </p>
            ) : null}

            <div className={FOOTER_ACTIONS_CLASS_NAME}>
              <Button asChild variant="outline" type="button">
                <Link to={DRONES_ROUTE_PATH}>Cancelar</Link>
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                Registrar Drone
              </Button>
            </div>
          </section>
        </form>
      </div>
    </section>
  );
}

export default FormDrone;
