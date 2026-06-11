import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
  type RegisterOptions,
} from "react-hook-form"

import { cn } from "@/lib/utils"

const GROUP_CLASS = "flex flex-col gap-3"
const LEGEND_CLASS = "text-sm font-medium text-[var(--text-secondary)]"
const REQUIRED_CLASS = "ml-1 text-[var(--status-danger)]"
const OPTIONS_CLASS = "grid gap-2"
const ITEM_CLASS =
  "flex w-full cursor-pointer items-start gap-3 rounded-[var(--radius-md)] border border-[var(--surface-border)] bg-[var(--surface-card)] p-4 transition-[border-color,background-color,box-shadow] duration-150"
const ITEM_SELECTED_CLASS =
  "border-[var(--accent)] bg-[var(--accent-ghost)] shadow-[var(--shadow-focus)]"
const ITEM_ERROR_CLASS = "border-[var(--status-danger)]"
const INDICATOR_CLASS =
  "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border border-[var(--surface-border)] bg-[var(--surface-input)]"
const INDICATOR_SELECTED_CLASS = "border-[var(--accent)]"
const INDICATOR_DOT_CLASS =
  "size-2 rounded-full bg-[var(--accent)]"
const OPTION_LABEL_CLASS = "text-sm font-medium text-[var(--text-primary)]"
const OPTION_DESCRIPTION_CLASS = "text-xs text-[var(--text-secondary)]"
const ERROR_CLASS = "text-xs text-[var(--status-danger)]"

type RadioOption = {
  value: string
  label: string
  description?: string
}

type RadioGroupProps<TFieldValues extends FieldValues> = {
  legend: string
  name: FieldPath<TFieldValues>
  control: Control<TFieldValues, undefined, FieldValues>
  options: RadioOption[]
  rules?: RegisterOptions<TFieldValues, FieldPath<TFieldValues>>
  required?: boolean
  className?: string
  disabled?: boolean
}

function RadioGroup<TFieldValues extends FieldValues>({
  legend,
  name,
  control,
  options,
  rules,
  required = false,
  className,
  disabled = false,
}: RadioGroupProps<TFieldValues>) {
  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field, fieldState }) => {
        const errorId = fieldState.error ? `${field.name}-error` : undefined

        return (
          <fieldset
            data-slot="radio-group"
            aria-invalid={fieldState.error ? "true" : "false"}
            aria-describedby={errorId}
            className={cn(GROUP_CLASS, className)}
          >
            <legend className={LEGEND_CLASS}>
              {legend}
              {required ? <span className={REQUIRED_CLASS}>*</span> : null}
            </legend>

            <div className={OPTIONS_CLASS}>
              {options.map((option) => {
                const isSelected = String(field.value) === option.value
                const optionId = `${field.name}-${option.value}`

                return (
                  <label
                    key={option.value}
                    htmlFor={optionId}
                    className={cn(
                      ITEM_CLASS,
                      isSelected ? ITEM_SELECTED_CLASS : undefined,
                      fieldState.error ? ITEM_ERROR_CLASS : undefined,
                      disabled ? "cursor-not-allowed opacity-45" : undefined
                    )}
                  >
                    <input
                      id={optionId}
                      type="radio"
                      name={field.name}
                      value={option.value}
                      checked={isSelected}
                      disabled={disabled}
                      onBlur={field.onBlur}
                      onChange={() => field.onChange(option.value)}
                      className="sr-only"
                    />

                    <span
                      className={cn(
                        INDICATOR_CLASS,
                        isSelected ? INDICATOR_SELECTED_CLASS : undefined
                      )}
                      aria-hidden="true"
                    >
                      {isSelected ? <span className={INDICATOR_DOT_CLASS} /> : null}
                    </span>

                    <span className="flex flex-col gap-1">
                      <span className={OPTION_LABEL_CLASS}>{option.label}</span>
                      {option.description ? (
                        <span className={OPTION_DESCRIPTION_CLASS}>
                          {option.description}
                        </span>
                      ) : null}
                    </span>
                  </label>
                )
              })}
            </div>

            {fieldState.error ? (
              <p id={errorId} role="alert" className={ERROR_CLASS}>
                {fieldState.error.message}
              </p>
            ) : null}
          </fieldset>
        )
      }}
    />
  )
}

export { RadioGroup }
