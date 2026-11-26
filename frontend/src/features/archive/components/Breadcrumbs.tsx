import { Link } from 'react-router'

export interface Crumb {
  label: string
  to?: string
}

/** Compact breadcrumb trail for nested archive pages. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-archive-muted">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] uppercase tracking-[0.16em]">
        {items.map((item, index) => (
          <li key={`${item.label}-${String(index)}`} className="flex items-center gap-2">
            {item.to ? (
              <Link
                to={item.to}
                className="transition-colors hover:text-archive-accent"
              >
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-archive-ink">
                {item.label}
              </span>
            )}
            {index < items.length - 1 ? (
              <span aria-hidden="true" className="text-archive-accent/60">
                /
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </nav>
  )
}
