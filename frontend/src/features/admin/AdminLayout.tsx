import { Link, NavLink, Outlet } from 'react-router'

const sections = [
  { to: '/admin/moderation', label: 'Moderation' },
  { to: '/admin/governance', label: 'Governance' },
  { to: '/admin/archive', label: 'Archive' },
  { to: '/admin/oversight', label: 'People & oversight' },
] as const

function sectionClasses({ isActive }: { isActive: boolean }): string {
  return [
    'block rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
    isActive
      ? 'bg-archive-ink text-archive-paper'
      : 'text-archive-muted hover:bg-stone-100 hover:text-archive-ink',
  ].join(' ')
}

/**
 * Administration chrome shared by the governance and archive-management
 * sections. Only sections that exist are linked; a role guard wraps the whole
 * layout and the API authorizes every request again.
 */
export default function AdminLayout() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-archive-accent">
            Administration
          </p>
          <nav aria-label="Administration">
            <ul className="flex flex-wrap items-center gap-1">
              {sections.map((section) => (
                <li key={section.to}>
                  <NavLink to={section.to} className={sectionClasses}>
                    {section.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <Link
          to="/dashboard"
          className="rounded-full border border-archive-line px-3 py-1.5 text-sm font-medium text-archive-ink transition-colors hover:border-stone-300"
        >
          Member dashboard
        </Link>
      </div>

      <Outlet />
    </div>
  )
}
