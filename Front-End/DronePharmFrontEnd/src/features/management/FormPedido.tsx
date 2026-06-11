import { useEffect, useMemo, type ReactElement } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useFieldArray, useForm, type FieldError } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";

import { listFarmacias } from "@/api/farmacias";
import { criarPedidosEmLote } from "@/api/pedidos";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/FormInput";
import { FormSelect } from "@/components/ui/FormSelect";
import { FormSkeleton } from "@/components/ui/FormSkeleton";
import { RadioGroup } from "@/components/ui/RadioGroup";
import type { HTTPValidationError, PedidoCreate } from "@/types/api";

import {
  pedidoSchema,
  type PedidoFormData,
  type PedidoFormInput,
  type PedidoFormItemData,
  type PedidoFormItemInput,
} from "./pedidoSchema";
import { useFarmaciasStore } from "../farmacias/store/useFarmaciasStore";
import { usePedidosStore } from "./store/usePedidosStore";

const PAGE_CLASS_NAME = "min-h-[calc(100dvh-56px)] bg-[var(--surface-base)]";
const TOPBAR_CLASS_NAME =
  "border-b border-[var(--surface-border)] bg-[var(--surface-panel)]";
const TOPBAR_CONTENT_CLASS_NAME =
  "mx-auto flex h-14 w-full max-w-[920px] items-center justify-between gap-4 px-6";
const BREADCRUMB_CLASS_NAME = "flex items-center gap-2 text-sm";
const BREADCRUMB_LINK_CLASS_NAME =
  "text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]";
const BREADCRUMB_CURRENT_CLASS_NAME = "text-[var(--text-primary)]";
const ACTIONS_CLASS_NAME = "flex items-center gap-2";
const CONTENT_CLASS_NAME =
  "mx-auto flex w-full max-w-[920px] flex-col gap-6 px-6 py-8";
const TITLE_CLASS_NAME = "text-xl font-semibold text-[var(--text-primary)]";
const CARD_CLASS_NAME =
  "rounded-[var(--radius-lg)] border border-[var(--surface-border)] bg-[var(--surface-card)] p-7";
const CARD_TITLE_CLASS_NAME =
  "mb-4 text-sm font-medium uppercase tracking-[0.07em] text-[var(--text-secondary)]";
const GRID_TWO_COLUMNS_CLASS_NAME = "grid gap-4 md:grid-cols-2";
const DIVIDER_CLASS_NAME = "my-6 border-t border-[var(--surface-border)]";
const ROOT_ERROR_CLASS_NAME =
  "mb-4 rounded-[var(--radius-md)] border border-[var(--status-danger)] bg-[var(--status-danger-bg)] px-4 py-3 text-sm text-[var(--status-danger)]";
const FOOTER_ACTIONS_CLASS_NAME = "flex items-center justify-between gap-3";
const BATCH_ACTIONS_CLASS_NAME = "flex items-center justify-between gap-3";
const QUERY_STALE_TIME = 30_000;
const PEDIDOS_ROUTE_PATH = "/pedidos";
const COORDINATE_INPUT_MODE = "decimal";
const WEIGHT_DECIMAL_PLACES = 2;
const WEIGHT_INPUT_STEP = "0.01";
const DECIMAL_COORDINATE_HINT =
  "Use coordenadas decimais WGS84 com até 15 casas decimais.";
const DECIMAL_WEIGHT_HINT = "Use peso em kg com até duas casas decimais.";
const DELIVERY_WINDOW_HINT =
  "Se não for informada, a janela final será calculada automaticamente pela prioridade.";
const LOAD_ERROR_MESSAGE = "Não foi possível carregar as farmácias.";
const SAVE_ERROR_MESSAGE = "Não foi possível salvar o lote de pedidos.";

type PedidoFieldName = keyof PedidoFormItemData;

const PEDIDO_FIELD_NAMES: PedidoFieldName[] = [
  "farmacia_id",
  "latitude",
  "longitude",
  "peso_kg",
  "prioridade",
  "descricao",
  "janela_fim",
];

function createEmptyPedidoInput(): PedidoFormItemInput {
  return {
    farmacia_id: "",
    latitude: "",
    longitude: "",
    peso_kg: "",
    prioridade: "2",
    descricao: "",
    janela_fim: "",
  };
}

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
  location: Array<string | number> | undefined,
): PedidoFieldName | null {
  if (location === undefined) {
    return null;
  }

  const locationPath = location
    .filter((item): item is string => typeof item === "string")
    .join(".");

  if (locationPath.endsWith("coordenada.latitude")) {
    return "latitude";
  }

  if (locationPath.endsWith("coordenada.longitude")) {
    return "longitude";
  }

  for (let index = location.length - 1; index >= 0; index -= 1) {
    const part = location[index];

    if (
      typeof part === "string" &&
      PEDIDO_FIELD_NAMES.includes(part as PedidoFieldName)
    ) {
      return part as PedidoFieldName;
    }
  }

  return null;
}

function normalizeDecimal(value: number, fractionDigits: number): number {
  return Number.parseFloat(value.toFixed(fractionDigits));
}

function normalizeWeight(value: number): number {
  return normalizeDecimal(value, WEIGHT_DECIMAL_PLACES);
}

function buildPedidoPayload(data: PedidoFormItemData): PedidoCreate {
  const descricao = data.descricao?.trim();
  const janelaFim = data.janela_fim?.trim();

  return {
    coordenada: {
      latitude: data.latitude,
      longitude: data.longitude,
    },
    peso_kg: normalizeWeight(data.peso_kg),
    prioridade: data.prioridade,
    descricao: descricao === undefined || descricao.length === 0 ? undefined : descricao,
    farmacia_id: data.farmacia_id,
    janela_fim:
      janelaFim === undefined || janelaFim.length === 0
        ? undefined
        : new Date(janelaFim).toISOString(),
  };
}

function renderQueryError(message: string): ReactElement {
  return (
    <section className={PAGE_CLASS_NAME}>
      <div className={CONTENT_CLASS_NAME}>
        <div className="rounded-[var(--radius-lg)] border border-[var(--status-danger)] bg-[var(--surface-card)] p-6">
          <h1 className="mb-2 text-lg font-semibold text-[var(--text-primary)]">
            Falha ao carregar farmácias
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">{message}</p>
        </div>
      </div>
    </section>
  );
}

export function FormPedido(): ReactElement {
  const navigate = useNavigate();
  const farmacias = useFarmaciasStore((state) => state.farmacias);
  const setFarmacias = useFarmaciasStore((state) => state.setFarmacias);
  const adicionarPedido = usePedidosStore((state) => state.adicionar);
  const {
    control,
    handleSubmit,
    register,
    clearErrors,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PedidoFormInput, undefined, PedidoFormData>({
    resolver: zodResolver(pedidoSchema),
    defaultValues: {
      pedidos: [createEmptyPedidoInput()],
    },
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "pedidos",
  });
  const farmaciasQuery = useQuery({
    queryKey: ["farmacias"],
    queryFn: listFarmacias,
    staleTime: QUERY_STALE_TIME,
    enabled: farmacias.length === 0,
  });

  useEffect(() => {
    if (farmaciasQuery.data === undefined) {
      return;
    }

    setFarmacias(
      farmaciasQuery.data.farmacias.filter((farmacia) => farmacia.ativa),
    );
  }, [farmaciasQuery.data, setFarmacias]);

  const farmaciasAtivasOptions = useMemo(
    () =>
      farmacias
        .filter((farmacia) => farmacia.ativa)
        .map((farmacia) => ({
          value: String(farmacia.id),
          label: `${farmacia.nome} - ${farmacia.cidade}`,
        })),
    [farmacias],
  );

  async function handleValidSubmit(data: PedidoFormData): Promise<void> {
    clearErrors();

    const payloads = data.pedidos.map(buildPedidoPayload);
    const createdPedidos = [];

    for (let index = 0; index < payloads.length; index += 1) {
      try {
        const [createdPedido] = await criarPedidosEmLote([payloads[index]]);
        createdPedidos.push(createdPedido);
      } catch (error) {
        if (isValidationError(error) && error.detail !== undefined) {
          let hasMappedFieldError = false;

          for (const detail of error.detail) {
            const fieldName = getFieldNameFromLocation(detail.loc);

            if (fieldName === null) {
              continue;
            }

            hasMappedFieldError = true;
            setError(`pedidos.${index}.${fieldName}`, {
              type: detail.type,
              message: detail.msg,
            });
          }

          if (hasMappedFieldError) {
            setError("root", {
              type: "server",
              message:
                createdPedidos.length > 0
                  ? `${createdPedidos.length} pedido(s) foram criados antes da falha na linha ${index + 1}.`
                  : `Revise os campos do pedido ${index + 1}.`,
            });
            return;
          }
        }

        setError("root", {
          type: "server",
          message:
            createdPedidos.length > 0
              ? `${createdPedidos.length} pedido(s) foram criados antes da falha na linha ${index + 1}. ${getErrorMessage(error)}`
              : getErrorMessage(error),
        });
        return;
      }
    }

    createdPedidos.forEach((pedido) => {
      adicionarPedido(pedido);
    });
    navigate(PEDIDOS_ROUTE_PATH);
  }

  if (farmacias.length === 0 && farmaciasQuery.isLoading) {
    return <FormSkeleton />;
  }

  if (farmacias.length === 0 && farmaciasQuery.isError) {
    return renderQueryError(getErrorMessage(farmaciasQuery.error) || LOAD_ERROR_MESSAGE);
  }

  return (
    <section className={PAGE_CLASS_NAME}>
      <div className={TOPBAR_CLASS_NAME}>
        <div className={TOPBAR_CONTENT_CLASS_NAME}>
          <nav aria-label="Breadcrumb" className={BREADCRUMB_CLASS_NAME}>
            <Link to={PEDIDOS_ROUTE_PATH} className={BREADCRUMB_LINK_CLASS_NAME}>
              Pedidos
            </Link>
            <span className="text-[var(--text-muted)]">/</span>
            <span className={BREADCRUMB_CURRENT_CLASS_NAME}>Novo Lote</span>
          </nav>

          <div className={ACTIONS_CLASS_NAME}>
            <Button asChild variant="outline" type="button">
              <Link to={PEDIDOS_ROUTE_PATH}>Cancelar</Link>
            </Button>
            <Button form="pedido-form" type="submit" disabled={isSubmitting}>
              Salvar Pedidos
            </Button>
          </div>
        </div>
      </div>

      <div className={CONTENT_CLASS_NAME}>
        <header className="flex flex-col gap-1">
          <h1 className={TITLE_CLASS_NAME}>Novo Lote de Pedidos</h1>
        </header>

        <form
          id="pedido-form"
          onSubmit={handleSubmit(handleValidSubmit)}
          className="flex flex-col gap-6"
        >
          <section className={CARD_CLASS_NAME}>
            <div className={BATCH_ACTIONS_CLASS_NAME}>
              <div>
                <h2 className={CARD_TITLE_CLASS_NAME}>Pontos de Entrega</h2>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => append(createEmptyPedidoInput())}
                disabled={isSubmitting}
              >
                Adicionar Ponto
              </Button>
            </div>

            <div className="mt-6 flex flex-col gap-6">
              {fields.map((field, index) => (
                <article
                  key={field.id}
                  className="rounded-[var(--radius-lg)] border border-[var(--surface-border)] bg-[var(--surface-panel)] p-5"
                >
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-[var(--text-primary)]">
                        Ponto {String(index + 1).padStart(2, "0")}
                      </h3>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1 || isSubmitting}
                    >
                      Remover
                    </Button>
                  </div>

                  <div className="flex flex-col gap-6">
                    <section>
                      <h4 className={CARD_TITLE_CLASS_NAME}>Destino</h4>
                      <div className="flex flex-col gap-4">
                        <FormSelect
                          label="Farmácia de origem"
                          name={`pedidos.${index}.farmacia_id`}
                          control={control}
                          options={farmaciasAtivasOptions}
                          placeholder="Selecione uma farmácia ativa"
                          required
                          disabled={farmaciasAtivasOptions.length === 0}
                        />

                        <div className={GRID_TWO_COLUMNS_CLASS_NAME}>
                          <FormInput
                            label="Latitude"
                            required
                            type="text"
                            inputMode={COORDINATE_INPUT_MODE}
                            suffix="°"
                            hint={DECIMAL_COORDINATE_HINT}
                            error={getFieldError(errors.pedidos?.[index]?.latitude)}
                            useDataFont
                            {...register(`pedidos.${index}.latitude`)}
                          />
                          <FormInput
                            label="Longitude"
                            required
                            type="text"
                            inputMode={COORDINATE_INPUT_MODE}
                            suffix="°"
                            hint={DECIMAL_COORDINATE_HINT}
                            error={getFieldError(errors.pedidos?.[index]?.longitude)}
                            useDataFont
                            {...register(`pedidos.${index}.longitude`)}
                          />
                        </div>
                      </div>
                    </section>

                    <section>
                      <h4 className={CARD_TITLE_CLASS_NAME}>Carga</h4>
                      <div className="flex flex-col gap-4">
                        <div className={GRID_TWO_COLUMNS_CLASS_NAME}>
                          <FormInput
                            label="Peso"
                            required
                            type="number"
                            step={WEIGHT_INPUT_STEP}
                            suffix="kg"
                            hint={DECIMAL_WEIGHT_HINT}
                            error={getFieldError(errors.pedidos?.[index]?.peso_kg)}
                            useDataFont
                            {...register(`pedidos.${index}.peso_kg`)}
                          />
                          <FormInput
                            label="Descrição"
                            error={getFieldError(errors.pedidos?.[index]?.descricao)}
                            placeholder="Insulina - UBS Centro"
                            autoComplete="off"
                            {...register(`pedidos.${index}.descricao`)}
                          />
                        </div>

                        <FormInput
                          label="Janela de entrega"
                          type="datetime-local"
                          hint={DELIVERY_WINDOW_HINT}
                          error={getFieldError(errors.pedidos?.[index]?.janela_fim)}
                          useDataFont
                          {...register(`pedidos.${index}.janela_fim`)}
                        />
                      </div>
                    </section>

                    <section>
                      <RadioGroup
                        legend="Prioridade"
                        name={`pedidos.${index}.prioridade`}
                        control={control}
                        required
                        options={[
                          {
                            value: "1",
                            label: "P1 Urgente",
                            description: "Janela automatica de 1 hora.",
                          },
                          {
                            value: "2",
                            label: "P2 Normal",
                            description: "Janela automatica de 4 horas.",
                          },
                          {
                            value: "3",
                            label: "P3 Reabastecimento",
                            description: "Janela automatica de 24 horas.",
                          },
                        ]}
                      />
                    </section>
                  </div>
                </article>
              ))}
            </div>

            <div className={DIVIDER_CLASS_NAME} />

            {errors.root?.message ? (
              <p role="alert" className={ROOT_ERROR_CLASS_NAME}>
                {errors.root.message}
              </p>
            ) : null}

            <div className={FOOTER_ACTIONS_CLASS_NAME}>
              <Button
                type="button"
                variant="outline"
                onClick={() => append(createEmptyPedidoInput())}
                disabled={isSubmitting}
              >
                Adicionar Ponto
              </Button>

              <div className="flex items-center gap-3">
                <Button asChild variant="outline" type="button">
                  <Link to={PEDIDOS_ROUTE_PATH}>Cancelar</Link>
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  Salvar Pedidos
                </Button>
              </div>
            </div>
          </section>
        </form>
      </div>
    </section>
  );
}

export default FormPedido;
