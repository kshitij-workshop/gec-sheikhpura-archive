import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'

import { inputClasses } from './inputStyles'
import { useFieldIds } from './useFieldIds'

interface FieldShellProps {
  label: string
  htmlFor: string
  hint?: string
  hintId?: string
  error?: string
  errorId?: string
  optional?: boolean
  children: ReactNode
}

function FieldShell({
  label,
  htmlFor,
  hint,
  hintId,
  error,
  errorId,
  optional,
  children,
}: FieldShellProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label
          htmlFor={htmlFor}
          className="text-sm font-medium text-archive-ink"
        >
          {label}
        </label>
        {optional ? (
          <span className="text-xs text-archive-muted">Optional</span>
        ) : null}
      </div>
      {children}
      {hint && hintId ? (
        <p id={hintId} className="text-xs text-archive-muted">
          {hint}
        </p>
      ) : null}
      {error && errorId ? (
        <p id={errorId} className="text-xs font-medium text-archive-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
  error?: string
  optional?: boolean
}

export function TextField({
  label,
  hint,
  error,
  optional = false,
  id,
  className,
  ...rest
}: TextFieldProps) {
  const ids = useFieldIds(id, hint, error)

  return (
    <FieldShell
      label={label}
      htmlFor={ids.fieldId}
      hint={hint}
      hintId={ids.hintId}
      error={error}
      errorId={ids.errorId}
      optional={optional}
    >
      <input
        id={ids.fieldId}
        aria-invalid={ids.invalid || undefined}
        aria-describedby={ids.describedBy}
        className={[inputClasses(ids.invalid), className]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      />
    </FieldShell>
  )
}

export interface TextAreaFieldProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  hint?: string
  error?: string
  optional?: boolean
}

export function TextAreaField({
  label,
  hint,
  error,
  optional = false,
  id,
  className,
  rows = 4,
  ...rest
}: TextAreaFieldProps) {
  const ids = useFieldIds(id, hint, error)

  return (
    <FieldShell
      label={label}
      htmlFor={ids.fieldId}
      hint={hint}
      hintId={ids.hintId}
      error={error}
      errorId={ids.errorId}
      optional={optional}
    >
      <textarea
        id={ids.fieldId}
        rows={rows}
        aria-invalid={ids.invalid || undefined}
        aria-describedby={ids.describedBy}
        className={[inputClasses(ids.invalid), className]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      />
    </FieldShell>
  )
}

export interface SelectFieldProps
  extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  hint?: string
  error?: string
  optional?: boolean
  children: ReactNode
}

export function SelectField({
  label,
  hint,
  error,
  optional = false,
  id,
  className,
  children,
  ...rest
}: SelectFieldProps) {
  const ids = useFieldIds(id, hint, error)

  return (
    <FieldShell
      label={label}
      htmlFor={ids.fieldId}
      hint={hint}
      hintId={ids.hintId}
      error={error}
      errorId={ids.errorId}
      optional={optional}
    >
      <select
        id={ids.fieldId}
        aria-invalid={ids.invalid || undefined}
        aria-describedby={ids.describedBy}
        className={[inputClasses(ids.invalid), className]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      >
        {children}
      </select>
    </FieldShell>
  )
}
