export const inputBase =
  'w-full rounded-md border bg-archive-surface px-3 py-2 text-sm text-archive-ink shadow-sm transition-colors placeholder:text-stone-400 disabled:cursor-not-allowed disabled:bg-stone-50'

export function inputClasses(invalid: boolean): string {
  return [
    inputBase,
    invalid
      ? 'border-red-400 focus:border-red-500'
      : 'border-archive-line focus:border-stone-400',
  ].join(' ')
}
