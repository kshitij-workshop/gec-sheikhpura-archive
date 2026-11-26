import { Link, NavLink, Outlet } from 'react-router'

const sections = [
  { to: '/admin/moderation', label: 'Moderation' },
  { to: '/admin/governance', label: 'Governance' },
  { to: '/admin/archive', label: 'Archive' },
  { to: '/admin/oversight', label: 'People & oversight' },
] as const

function sectionClasses({ isActive }: { isActive: boolean }): string {
  return [
    'block border-b-2 px-1 py-2.5 text-sm font-medium transition-colors',
    isActive
      ? 'border-archive-accent text-archive-ink'
      : 'border-transparent text-archive-muted hover:text-archive-ink',
  ].join(' ')
}

/**
 * Administration chrome shared by the governance and archive-management
 * sections. Only sections that exist are linked; a role guard wraps the whole
 * layout and the API authorizes every request again.
 */
export default function AdminLayout() {
  return (
    <div className="workspace space-y-6 border border-archive-line bg-archive-paper p-4 text-archive-ink sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-archive-line">
        <nav aria-label="Administration" className="overflow-x-auto">
          <ul className="flex min-w-max items-center gap-5">
            {sections.map((section) => (
              <li key={section.to}>
                <NavLink to={section.to} className={sectionClasses}>
                  {section.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <Link
          to="/dashboard"
          className="mb-1 text-sm font-medium text-archive-muted underline-offset-4 transition-colors hover:text-archive-accent hover:underline"
        >
          Member dashboard
        </Link>
      </div>

      <Outlet />
    </div>
  )
}
