import { useEffect, type ReactElement } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import {
  atualizarFarmacia,
  criarFarmacia,
  getFarmacia,
} from "@/api/farmacias";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/FormInput";
import { FormSkeleton } from "@/components/ui/FormSkeleton";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type {
  FarmaciaCreate,
  HTTPValidationError,
} from "@/types/api";

import {
  farmaciaSchema,
  type FarmaciaFormData,
  type FarmaciaFormInput,
} from "./farmaciaSchema";
import { useFarmaciasStore } from "./store/useFarmaciasStore";

const FORM_ID = "farmacia-form";
const PAGE_CLASS_NAME = "min-h-[calc(100dvh-56px)] bg-[var(--surface-base)]";
const TOPBAR_CLASS_NAME =
  "border-b border-[var(--surface-border)] bg-[var(--surface-panel)]";
const TOPBAR_CONTENT_CLASS_NAME =
  "mx-auto flex h-14 w-full max-w-[760px] items-center justify-between gap-4 px-6";
const BREADCRUMB_CLASS_NAME = "flex items-center gap-2 text-sm";
const BREADCRUMB_LINK_CLASS_NAME =
  "text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]";
const BREADCRUMB_CURRENT_CLASS_NAME =
  "text-[var(--text-primary)]";
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
const SWITCH_ROW_CLASS_NAME =
  "flex items-center justify-between gap-4 rounded-[var(--radius-md)] border border-[var(--surface-border)] bg-[var(--surface-input)] px-4 py-3";
const SWITCH_LABEL_TITLE_CLASS_NAME =
  "text-sm font-medium text-[var(--text-primary)]";
const SWITCH_LABEL_DESCRIPTION_CLASS_NAME =
  "text-xs text-[var(--text-secondary)]";
const DIVIDER_CLASS_NAME = "my-6 border-t border-[var(--surface-border)]";
const ROOT_ERROR_CLASS_NAME =
  "mb-4 rounded-[var(--radius-md)] border border-[var(--status-danger)] bg-[var(--status-danger-bg)] px-4 py-3 text-sm text-[var(--status-danger)]";
const FOOTER_ACTIONS_CLASS_NAME =
  "flex items-center justify-end gap-3";
const QUERY_STALE_TIME = 10_000;
const CNPJ_HINT = "Informe apenas os 14 dígitos numéricos do CNPJ.";
const UF_HINT = "Use a sigla da unidade federativa, como MG ou SP.";
const DECIMAL_COORDINATE_HINT =
  "Use coordenadas decimais WGS84 com até 15 casas decimais.";
const COORDINATE_INPUT_MODE = "decimal";
const CREATE_MODE_TITLE = "Nova Farmácia";
const EDIT_MODE_TITLE = "Editar Farmácia";
const CREATE_MODE_DESCRIPTION =
  "Cadastre a unidade de origem para uso operacional nas entregas.";
const EDIT_MODE_DESCRIPTION =
  "Atualize os dados cadastrais e de operação da farmácia.";
const CREATE_SUCCESS_MESSAGE = "Farmácia criada com sucesso.";
const UPDATE_SUCCESS_MESSAGE = "Farmácia atualizada com sucesso.";
const GENERIC_ERROR_MESSAGE = "Não foi possível salvar a farmácia.";
const INVALID_ID_ERROR_MESSAGE = "O identificador da farmácia é inválido.";
const MANAGEMENT_ROUTE_PATH = "/farmacias";

type FarmaciaFieldName = keyof FarmaciaFormData;

const FORM_FIELD_NAMES: FarmaciaFieldName[] = [
  "cnpj",
  "nome",
  "endereco",
  "cidade",
  "uf",
  "latitude",
  "longitude",
  "deposito",
  "ativa",
];

function isValidationError(error: unknown): error is HTTPValidationError {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  return "detail" in error;
}

function parseFarmaciaId(paramId: string | undefined): number | null {
  if (paramId === undefined) {
    return null;
  }

  const parsedId = Number(paramId);

  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    return null;
  }

  return parsedId;
}

function getPageTitle(isEditMode: boolean): string {
  return isEditMode ? EDIT_MODE_TITLE : CREATE_MODE_TITLE;
}

function getPageDescription(isEditMode: boolean): string {
  return isEditMode ? EDIT_MODE_DESCRIPTION : CREATE_MODE_DESCRIPTION;
}

function getSubmitLabel(isEditMode: boolean): string {
  return isEditMode ? "Salvar Alterações" : "Salvar Farmácia";
}

function getSuccessMessage(isEditMode: boolean): string {
  return isEditMode ? UPDATE_SUCCESS_MESSAGE : CREATE_SUCCESS_MESSAGE;
}

function getErrorMessage(error: unknown): string {
  if (isValidationError(error)) {
    return error.detail?.[0]?.msg ?? GENERIC_ERROR_MESSAGE;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return GENERIC_ERROR_MESSAGE;
}

function getDefaultValues(): FarmaciaFormInput {
  return {
    cnpj: "",
    nome: "",
    endereco: "",
    cidade: "",
    uf: "",
    latitude: "",
    longitude: "",
    deposito: false,
    ativa: true,
  };
}

function getEditFormValues(
  farmacia: Awaited<ReturnType<typeof getFarmacia>>,
): FarmaciaFormInput {
  return {
    cnpj: farmacia.cnpj,
    nome: farmacia.nome,
    endereco: farmacia.endereco,
    cidade: farmacia.cidade,
    uf: farmacia.uf,
    latitude: String(farmacia.latitude),
    longitude: String(farmacia.longitude),
    deposito: farmacia.deposito,
    ativa: farmacia.ativa,
  };
}

type FarmaciaEditPayload = FarmaciaCreate & {
  ativa: boolean;
};

function getFarmaciaPayload(data: FarmaciaFormData, isEditMode: false): FarmaciaCreate;
function getFarmaciaPayload(data: FarmaciaFormData, isEditMode: true): FarmaciaEditPayload;
function getFarmaciaPayload(
  data: FarmaciaFormData,
  isEditMode: boolean,
): FarmaciaCreate | FarmaciaEditPayload {
  const basePayload = {
    cnpj: data.cnpj,
    nome: data.nome,
    endereco: data.endereco,
    cidade: data.cidade,
    uf: data.uf,
    latitude: data.latitude,
    longitude: data.longitude,
    deposito: data.deposito,
  };

  if (!isEditMode) {
    return basePayload;
  }

  return {
    ...basePayload,
    ativa: data.ativa,
  };
}

function getFieldNameFromLocation(
  location: Array<string | number> | undefined,
): FarmaciaFieldName | null {
  if (location === undefined) {
    return null;
  }

  for (let index = location.length - 1; index >= 0; index -= 1) {
    const part = location[index];

    if (typeof part !== "string") {
      continue;
    }

    if (FORM_FIELD_NAMES.includes(part as FarmaciaFieldName)) {
      return part as FarmaciaFieldName;
    }
  }

  return null;
}

function renderTopbar(
  isEditMode: boolean,
  submitLabel: string,
  isSubmitting: boolean,
): ReactElement {
  return (
    <div className={TOPBAR_CLASS_NAME}>
      <div className={TOPBAR_CONTENT_CLASS_NAME}>
        <nav aria-label="Breadcrumb" className={BREADCRUMB_CLASS_NAME}>
          <Link to={MANAGEMENT_ROUTE_PATH} className={BREADCRUMB_LINK_CLASS_NAME}>
            Farmácias
          </Link>
          <span className="text-[var(--text-muted)]">/</span>
          <span className={BREADCRUMB_CURRENT_CLASS_NAME}>
            {getPageTitle(isEditMode)}
          </span>
        </nav>

        <div className={ACTIONS_CLASS_NAME}>
          <Button asChild variant="outline" type="button">
            <Link to={MANAGEMENT_ROUTE_PATH}>Cancelar</Link>
          </Button>
          <Button form={FORM_ID} type="submit" disabled={isSubmitting}>
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

function renderQueryError(message: string): ReactElement {
  return (
    <section className={PAGE_CLASS_NAME}>
      <div className={CONTENT_CLASS_NAME}>
        <div className="rounded-[var(--radius-lg)] border border-[var(--status-danger)] bg-[var(--surface-card)] p-6">
          <h1 className="mb-2 text-lg font-semibold text-[var(--text-primary)]">
            Falha ao carregar farmácia
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">{message}</p>
        </div>
      </div>
    </section>
  );
}

export function FormFarmacia(): ReactElement {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id?: string }>();
  const farmaciaId = parseFarmaciaId(id);
  const isEditMode = id !== undefined;
  const submitLabel = getSubmitLabel(isEditMode);
  const adicionarFarmacia = useFarmaciasStore((state) => state.adicionar);
  const atualizarFarmaciaStore = useFarmaciasStore((state) => state.atualizar);
  const {
    control,
    handleSubmit,
    register,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FarmaciaFormInput, undefined, FarmaciaFormData>({
    resolver: zodResolver(farmaciaSchema),
    defaultValues: getDefaultValues(),
  });
  const farmaciaQuery = useQuery({
    queryKey: ["farmacia", farmaciaId],
    queryFn: () => getFarmacia(farmaciaId as number),
    enabled: isEditMode && farmaciaId !== null,
    staleTime: QUERY_STALE_TIME,
  });

  useEffect(() => {
    if (!isEditMode || farmaciaQuery.data === undefined) {
      return;
    }

    reset(getEditFormValues(farmaciaQuery.data));
  }, [farmaciaQuery.data, isEditMode, reset]);

  async function handleValidSubmit(data: FarmaciaFormData): Promise<void> {
    try {
      if (isEditMode) {
        if (farmaciaId === null) {
          setError("root", {
            type: "manual",
            message: INVALID_ID_ERROR_MESSAGE,
          });
          return;
        }

        const farmaciaAtualizada = await atualizarFarmacia(
          farmaciaId,
          getFarmaciaPayload(data, true)
        );

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["farmacias"] }),
          queryClient.invalidateQueries({ queryKey: ["farmacias", "deposito"] }),
          queryClient.invalidateQueries({ queryKey: ["mapa", "snapshot"] }),
        ]);
        atualizarFarmaciaStore(farmaciaAtualizada);
        toast.success(getSuccessMessage(true));
        navigate(MANAGEMENT_ROUTE_PATH);
        return;
      }

      const farmaciaCriada = await criarFarmacia(getFarmaciaPayload(data, false));

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["farmacias"] }),
        queryClient.invalidateQueries({ queryKey: ["farmacias", "deposito"] }),
        queryClient.invalidateQueries({ queryKey: ["mapa", "snapshot"] }),
      ]);
      adicionarFarmacia(farmaciaCriada);
      toast.success(getSuccessMessage(false));
      navigate(MANAGEMENT_ROUTE_PATH);
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

  if (isEditMode && farmaciaId === null) {
    return renderQueryError(INVALID_ID_ERROR_MESSAGE);
  }

  if (isEditMode && farmaciaQuery.isLoading) {
    return <FormSkeleton />;
  }

  if (isEditMode && (farmaciaQuery.isError || farmaciaQuery.data === undefined)) {
    return renderQueryError(getErrorMessage(farmaciaQuery.error));
  }

  return (
    <section className={PAGE_CLASS_NAME}>
      {renderTopbar(isEditMode, submitLabel, isSubmitting)}

      <div className={CONTENT_CLASS_NAME}>
        <header className="flex flex-col gap-1">
          <h1 className={TITLE_CLASS_NAME}>{getPageTitle(isEditMode)}</h1>
          <p className={DESCRIPTION_CLASS_NAME}>
            {getPageDescription(isEditMode)}
          </p>
        </header>

        <form
          id={FORM_ID}
          onSubmit={handleSubmit(handleValidSubmit)}
          className="flex flex-col gap-6"
        >
          <section className={CARD_CLASS_NAME}>
            <h2 className={CARD_TITLE_CLASS_NAME}>Identificação</h2>
            <div className="flex flex-col gap-4">
              <FormInput
                label="CNPJ"
                required
                error={errors.cnpj}
                placeholder="00000000000000"
                inputMode="numeric"
                autoComplete="off"
                hint={CNPJ_HINT}
                useDataFont
                {...register("cnpj")}
              />

              <FormInput
                label="Nome"
                required
                error={errors.nome}
                placeholder="Farmácia Popular Centro"
                autoComplete="off"
                {...register("nome")}
              />

              <FormInput
                label="Endereço"
                required
                error={errors.endereco}
                placeholder="Av. Afonso Pena, 1234"
                autoComplete="off"
                {...register("endereco")}
              />

              <div className={GRID_TWO_COLUMNS_CLASS_NAME}>
                <FormInput
                  label="Cidade"
                  required
                  error={errors.cidade}
                  placeholder="Belo Horizonte"
                  autoComplete="off"
                  {...register("cidade")}
                />
                <FormInput
                  label="UF"
                  required
                  error={errors.uf}
                  placeholder="MG"
                  maxLength={2}
                  autoComplete="off"
                  hint={UF_HINT}
                  useDataFont
                  {...register("uf")}
                />
              </div>
            </div>
          </section>

          <section className={CARD_CLASS_NAME}>
            <h2 className={CARD_TITLE_CLASS_NAME}>Localização de Origem</h2>
            <div className={GRID_TWO_COLUMNS_CLASS_NAME}>
              <FormInput
                label="Latitude"
                required
                type="text"
                inputMode={COORDINATE_INPUT_MODE}
                suffix="°"
                error={errors.latitude}
                hint={DECIMAL_COORDINATE_HINT}
                useDataFont
                {...register("latitude")}
              />
              <FormInput
                label="Longitude"
                required
                type="text"
                inputMode={COORDINATE_INPUT_MODE}
                suffix="°"
                error={errors.longitude}
                hint={DECIMAL_COORDINATE_HINT}
                useDataFont
                {...register("longitude")}
              />
            </div>
          </section>

          <section className={CARD_CLASS_NAME}>
            <h2 className={CARD_TITLE_CLASS_NAME}>Configurações</h2>

            <div className="flex flex-col gap-4">
              <Controller
                name="deposito"
                control={control}
                render={({ field, fieldState }) => (
                  <div className="flex flex-col gap-2">
                    <div
                      className={cn(
                        SWITCH_ROW_CLASS_NAME,
                        fieldState.error
                          ? "border-[var(--status-danger)]"
                          : undefined
                      )}
                    >
                      <div className="flex flex-col gap-1">
                        <span className={SWITCH_LABEL_TITLE_CLASS_NAME}>
                          Farmácia depósito
                        </span>
                        <span className={SWITCH_LABEL_DESCRIPTION_CLASS_NAME}>
                          Define a unidade como polo principal de operação.
                        </span>
                      </div>

                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        aria-invalid={fieldState.error ? "true" : "false"}
                        className="data-checked:bg-[var(--accent)] data-unchecked:bg-[var(--surface-border)]"
                      />
                    </div>

                    {fieldState.error ? (
                      <p role="alert" className="text-xs text-[var(--status-danger)]">
                        {fieldState.error.message}
                      </p>
                    ) : null}
                  </div>
                )}
              />

              <Controller
                name="ativa"
                control={control}
                render={({ field, fieldState }) => (
                  <div className="flex flex-col gap-2">
                    <div
                      className={cn(
                        SWITCH_ROW_CLASS_NAME,
                        fieldState.error
                          ? "border-[var(--status-danger)]"
                          : undefined
                      )}
                    >
                      <div className="flex flex-col gap-1">
                        <span className={SWITCH_LABEL_TITLE_CLASS_NAME}>
                          Farmácia ativa
                        </span>
                        <span className={SWITCH_LABEL_DESCRIPTION_CLASS_NAME}>
                          Mantém a unidade disponível para operação e origem de pedidos.
                        </span>
                      </div>

                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        aria-invalid={fieldState.error ? "true" : "false"}
                        className="data-checked:bg-[var(--accent)] data-unchecked:bg-[var(--surface-border)]"
                      />
                    </div>

                    {fieldState.error ? (
                      <p role="alert" className="text-xs text-[var(--status-danger)]">
                        {fieldState.error.message}
                      </p>
                    ) : null}
                  </div>
                )}
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
                <Link to={MANAGEMENT_ROUTE_PATH}>Cancelar</Link>
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {submitLabel}
              </Button>
            </div>
          </section>
        </form>
      </div>
    </section>
  );
}

export default FormFarmacia;
