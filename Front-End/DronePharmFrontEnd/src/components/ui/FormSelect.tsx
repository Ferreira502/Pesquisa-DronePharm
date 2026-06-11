import * as React from "react"
import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
  type RegisterOptions,
} from "react-hook-form"

import { cn } from "@/lib/utils"

const FIELD_GAP_CLASS = "flex flex-col gap-1.5"
const LABEL_CLASS =
  "text-sm font-medium text-[var(--text-secondary)]"
const REQUIRED_CLASS = "ml-1 text-[var(--status-danger)]"
const SELECT_BASE_CLASS =
  "h-[38px] w-full appearance-none rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface-input)] px-3 pr-10 text-sm text-[var(--text-primary)] outline-none transition-[border-color,box-shadow] duration-150 focus:border-[var(--accent)] focus:shadow-[var(--shadow-focus)] disabled:cursor-not-allowed disabled:border-[var(--surface-border)] disabled:bg-[var(--surface-border)] disabled:opacity-45"
const SELECT_PLACEHOLDER_CLASS = "text-[var(--text-muted)]"
const SELECT_ERROR_CLASS =
  "border-[var(--status-danger)] shadow-[0_0_0_2px_var(--status-danger-bg)]"
const MESSAGE_CLASS = "text-xs"
const HINT_CLASS = `${MESSAGE_CLASS} text-[var(--text-secondary)]`
const ERROR_CLASS = `${MESSAGE_CLASS} text-[var(--status-danger)]`
const CHEVRON_CLASS =
  "pointer-events-none absolute inset-y-0 right-3 flex items-center text-[var(--text-secondary)]"

type SelectOption = {
  value: string
  label: string
}

type FormSelectProps<TFieldValues extends FieldValues> = Omit<
  React.ComponentProps<"select">,
  "children" | "defaultValue" | "id" | "name"
> & {
  id?: string
  label: string
  name: FieldPath<TFieldValues>
  control: Control<TFieldValues, undefined, FieldValues>
  options: SelectOption[]
  rules?: RegisterOptions<TFieldValues, FieldPath<TFieldValues>>
  hint?: string
  placeholder?: string
  required?: boolean
}

function FormSelect<TFieldValues extends FieldValues>({
  id,
  label,
  name,
  control,
  options,
  rules,
  hint,
  placeholder,
  required = false,
  className,
  disabled,
  ...props
}: FormSelectProps<TFieldValues>) {
  const generatedId = React.useId()
  const selectId = id ?? generatedId

  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field, fieldState }) => {
        const errorId = fieldState.error ? `${selectId}-error` : undefined
        const hintId = hint ? `${selectId}-hint` : undefined
        const describedBy = errorId ?? hintId
        const hasPlaceholder = Boolean(placeholder)
        const selectValue = field.value == null ? "" : String(field.value)
        const hasValue = selectValue.length > 0

        return (
          <div data-slot="form-select" className={cn(FIELD_GAP_CLASS, className)}>
            <label htmlFor={selectId} className={LABEL_CLASS}>
              {label}
              {required ? <span className={REQUIRED_CLASS}>*</span> : null}
            </label>

            <div className="relative">
              <select
                id={selectId}
                aria-invalid={fieldState.error ? "true" : "false"}
                aria-describedby={describedBy}
                className={cn(
                  SELECT_BASE_CLASS,
                  !hasValue && hasPlaceholder ? SELECT_PLACEHOLDER_CLASS : undefined,
                  fieldState.error ? SELECT_ERROR_CLASS : undefined
                )}
                disabled={disabled}
                name={field.name}
                onBlur={field.onBlur}
                onChange={field.onChange}
                ref={field.ref}
                value={selectValue}
                {...props}
              >
                {hasPlaceholder ? (
                  <option value="" disabled>
                    {placeholder}
                  </option>
                ) : null}

                {options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <span className={CHEVRON_CLASS} aria-hidden="true">
                <svg
                  width="12"
                  height="8"
                  viewBox="0 0 12 8"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M1 1.5L6 6.5L11 1.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </div>

            {fieldState.error ? (
              <p id={errorId} role="alert" className={ERROR_CLASS}>
                {fieldState.error.message}
              </p>
            ) : hint ? (
              <p id={hintId} className={HINT_CLASS}>
                {hint}
              </p>
            ) : null}
          </div>
        )
      }}
    />
  )
}

export { FormSelect }
