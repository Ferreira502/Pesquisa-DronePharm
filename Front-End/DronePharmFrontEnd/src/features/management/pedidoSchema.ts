import { z } from "zod";

const PRIORIDADE_URGENTE = 1;
const PRIORIDADE_NORMAL = 2;
const PRIORIDADE_REABASTECIMENTO = 3;
const PEDIDO_PESO_MAXIMO_KG = 2;
const WEIGHT_DECIMAL_PLACES = 2;
const WEIGHT_DECIMAL_FACTOR = 10 ** WEIGHT_DECIMAL_PLACES;
const DESCRICAO_MAX_LENGTH = 300;
const LATITUDE_MIN = -90;
const LATITUDE_MAX = 90;
const LONGITUDE_MIN = -180;
const LONGITUDE_MAX = 180;
const COORDINATE_DECIMAL_PLACES = 15;
const FLOATING_POINT_TOLERANCE = 1e-8;
const COORDINATE_PATTERN = new RegExp(
  `^-?\\d+(?:[\\.,]\\d{1,${COORDINATE_DECIMAL_PLACES}})?$`,
);

function isIsoDateTime(value: string): boolean {
  return !Number.isNaN(Date.parse(value));
}

function hasAtMostWeightDecimalPlaces(value: number): boolean {
  const scaledValue = value * WEIGHT_DECIMAL_FACTOR;

  return Math.abs(scaledValue - Math.round(scaledValue)) < FLOATING_POINT_TOLERANCE;
}

function parseCoordinate(value: string): number {
  return Number(value.replace(",", "."));
}

function createCoordinateSchema(
  minValue: number,
  maxValue: number,
  fieldLabel: string,
) {
  const rangeMessage = `A ${fieldLabel} deve estar entre ${minValue} e ${maxValue}.`;
  const precisionMessage = `A ${fieldLabel} deve ter no máximo ${COORDINATE_DECIMAL_PLACES} casas decimais.`;

  return z
    .string()
    .trim()
    .refine((value) => COORDINATE_PATTERN.test(value), {
      message: precisionMessage,
    })
    .transform(parseCoordinate)
    .refine((value) => Number.isFinite(value), {
      message: `A ${fieldLabel} deve ser um número válido.`,
    })
    .refine((value) => value >= minValue && value <= maxValue, {
      message: rangeMessage,
    });
}

export const pedidoItemSchema = z.object({
  farmacia_id: z
    .coerce.number({
      error: "A farmácia de origem deve ser um número válido.",
    })
    .int("A farmácia de origem deve ser um número inteiro.")
    .positive("Selecione uma farmácia de origem válida."),
  latitude: createCoordinateSchema(LATITUDE_MIN, LATITUDE_MAX, "latitude"),
  longitude: createCoordinateSchema(LONGITUDE_MIN, LONGITUDE_MAX, "longitude"),
  peso_kg: z
    .coerce.number({
      error: "O peso deve ser um número válido.",
    })
    .positive("O peso deve ser maior que zero.")
    .max(PEDIDO_PESO_MAXIMO_KG, "O peso do pedido não pode ultrapassar 2 kg.")
    .refine(hasAtMostWeightDecimalPlaces, {
      message: "O peso deve ter no máximo 2 casas decimais.",
    }),
  prioridade: z.coerce.number().pipe(
    z.union(
      [
        z.literal(PRIORIDADE_URGENTE),
        z.literal(PRIORIDADE_NORMAL),
        z.literal(PRIORIDADE_REABASTECIMENTO),
      ],
      {
        error: "A prioridade deve ser 1, 2 ou 3.",
      },
    ),
  ),
  descricao: z
    .string()
    .trim()
    .max(DESCRICAO_MAX_LENGTH, "A descrição deve ter no máximo 300 caracteres.")
    .optional(),
  janela_fim: z
    .string()
    .trim()
    .refine(isIsoDateTime, {
      message: "A janela final deve estar em formato ISO 8601 válido.",
    })
    .optional()
    .or(z.literal("")),
});

export const pedidoSchema = z.object({
  pedidos: z
    .array(pedidoItemSchema)
    .min(1, "Adicione pelo menos um pedido para envio."),
});

export type PedidoFormItemInput = z.input<typeof pedidoItemSchema>;
export type PedidoFormItemData = z.output<typeof pedidoItemSchema>;
export type PedidoFormInput = z.input<typeof pedidoSchema>;
export type PedidoFormData = z.output<typeof pedidoSchema>;
