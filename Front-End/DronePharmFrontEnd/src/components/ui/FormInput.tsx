import * as React from "react"
import type { FieldError } from "react-hook-form"

import { cn } from "@/lib/utils"

const FIELD_GAP_CLASS = "flex flex-col gap-1.5"
const LABEL_CLASS =
  "text-sm font-medium text-[var(--text-secondary)]"
const REQUIRED_CLASS = "ml-1 text-[var(--status-danger)]"
const INPUT_BASE_CLASS =
  "h-[38px] w-full rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface-input)] px-3 text-sm text-[var(--text-primary)] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:shadow-[var(--shadow-focus)] disabled:cursor-not-allowed disabled:border-[var(--surface-border)] disabled:bg-[var(--surface-border)] disabled:opacity-45"
const INPUT_ERROR_CLASS =
  "border-[var(--status-danger)] shadow-[0_0_0_2px_var(--status-danger-bg)]"
const MESSAGE_CLASS = "text-xs"
const HINT_CLASS = `${MESSAGE_CLASS} text-[var(--text-secondary)]`
const ERROR_CLASS = `${MESSAGE_CLASS} text-[var(--status-danger)]`
const SUFFIX_CLASS =
  "pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-[var(--text-secondary)]"
const DATA_FONT_CLASS = "[font-family:var(--font-data)]"

type FormInputProps = Omit<React.ComponentProps<"input">, "id"> & {
  id?: string
  label: string
  error?: FieldError
  hint?: string
  suffix?: string
  required?: boolean
  inputClassName?: string
  useDataFont?: boolean
}

function FormInput({
  id,
  label,
  error,
  hint,
  suffix,
  required = false,
  className,
  inputClassName,
  useDataFont = false,
  ...props
}: FormInputProps) {
  const generatedId = React.useId()
  const inputId = id ?? generatedId
  const hintId = hint ? `${inputId}-hint` : undefined
  const errorId = error ? `${inputId}-error` : undefined
  const describedBy = errorId ?? hintId

  return (
    <div data-slot="form-input" className={cn(FIELD_GAP_CLASS, className)}>
      <label htmlFor={inputId} className={LABEL_CLASS}>
        {label}
        {required ? <span className={REQUIRED_CLASS}>*</span> : null}
      </label>

      <div className="relative">
        <input
          id={inputId}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={describedBy}
          className={cn(
            INPUT_BASE_CLASS,
            suffix ? "pr-12" : undefined,
            useDataFont ? DATA_FONT_CLASS : undefined,
            error ? INPUT_ERROR_CLASS : undefined,
            inputClassName
          )}
          {...props}
        />

        {suffix ? <span className={SUFFIX_CLASS}>{suffix}</span> : null}
      </div>

      {error ? (
        <p id={errorId} role="alert" className={ERROR_CLASS}>
          {error.message}
        </p>
      ) : hint ? (
        <p id={hintId} className={HINT_CLASS}>
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export { FormInput }
