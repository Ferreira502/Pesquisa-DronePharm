import { z } from "zod";

const NOME_MIN_LENGTH = 3;
const NOME_MAX_LENGTH = 120;
const ENDERECO_MIN_LENGTH = 5;
const ENDERECO_MAX_LENGTH = 300;
const CIDADE_MIN_LENGTH = 2;
const CIDADE_MAX_LENGTH = 100;
const UF_LENGTH = 2;
const CNPJ_LENGTH = 14;
const LATITUDE_MIN = -90;
const LATITUDE_MAX = 90;
const LONGITUDE_MIN = -180;
const LONGITUDE_MAX = 180;
const COORDINATE_DECIMAL_PLACES = 15;
const COORDINATE_PATTERN = new RegExp(
  `^-?\\d+(?:[\\.,]\\d{1,${COORDINATE_DECIMAL_PLACES}})?$`,
);

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

export const farmaciaSchema = z.object({
  cnpj: z
    .string()
    .trim()
    .transform((value) => value.replace(/\D/g, ""))
    .refine((value) => new RegExp(`^\\d{${CNPJ_LENGTH}}$`).test(value), {
      message: "O CNPJ deve conter exatamente 14 dígitos numéricos.",
    }),
  nome: z
    .string()
    .trim()
    .min(NOME_MIN_LENGTH, "O nome da farmácia deve ter pelo menos 3 caracteres.")
    .max(NOME_MAX_LENGTH, "O nome da farmácia deve ter no máximo 120 caracteres."),
  endereco: z
    .string()
    .trim()
    .min(ENDERECO_MIN_LENGTH, "O endereço deve ter pelo menos 5 caracteres.")
    .max(ENDERECO_MAX_LENGTH, "O endereço deve ter no máximo 300 caracteres."),
  cidade: z
    .string()
    .trim()
    .min(CIDADE_MIN_LENGTH, "A cidade deve ter pelo menos 2 caracteres.")
    .max(CIDADE_MAX_LENGTH, "A cidade deve ter no máximo 100 caracteres."),
  uf: z
    .string()
    .trim()
    .length(UF_LENGTH, "A UF deve ter exatamente 2 caracteres.")
    .transform((value) => value.toUpperCase()),
  latitude: createCoordinateSchema(LATITUDE_MIN, LATITUDE_MAX, "latitude"),
  longitude: createCoordinateSchema(LONGITUDE_MIN, LONGITUDE_MAX, "longitude"),
  deposito: z.boolean({
    error: "Informe se a farmácia é um depósito.",
  }),
  ativa: z.boolean({
    error: "Informe se a farmácia está ativa.",
  }),
});

export type FarmaciaFormInput = z.input<typeof farmaciaSchema>;
export type FarmaciaFormData = z.infer<typeof farmaciaSchema>;
