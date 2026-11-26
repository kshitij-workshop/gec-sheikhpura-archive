export const inputBase =
  'w-full rounded-sm border bg-archive-surface px-3 py-2.5 text-sm text-archive-ink transition-colors placeholder:text-archive-muted/70 disabled:cursor-not-allowed disabled:bg-archive-paper'

export function inputClasses(invalid: boolean): string {
  return [
    inputBase,
    invalid
      ? 'border-archive-danger focus:border-archive-danger'
      : 'border-archive-line focus:border-archive-accent',
  ].join(' ')
}
