import { useId } from 'react'

export interface FieldIds {
  fieldId: string
  hintId: string | undefined
  errorId: string | undefined
  describedBy: string | undefined
  invalid: boolean
}

/**
 * Stable, accessible id wiring for a labelled form control.
 */
export function useFieldIds(
  id: string | undefined,
  hint: string | undefined,
  error: string | undefined,
): FieldIds {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const hintId = hint ? `${fieldId}-hint` : undefined
  const errorId = error ? `${fieldId}-error` : undefined
  const describedBy =
    [hintId, errorId].filter(Boolean).join(' ') || undefined

  return {
    fieldId,
    hintId,
    errorId,
    describedBy,
    invalid: error !== undefined && error.length > 0,
  }
}
