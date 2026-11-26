import { Link, NavLink, Outlet } from 'react-router'

const sections = [
  { to: '/dashboard', label: 'Overview', end: true },
  { to: '/dashboard/uploads', label: 'My uploads' },
  { to: '/dashboard/submissions', label: 'Submissions' },
  { to: '/dashboard/suggestions', label: 'Event suggestions' },
  { to: '/dashboard/profile', label: 'Profile' },
] as const

function sectionClasses({ isActive }: { isActive: boolean }): string {
  return [
    'block border-b-2 px-1 py-2.5 text-sm font-medium transition-colors',
    isActive
      ? 'border-archive-accent text-archive-ink'
      : 'border-transparent text-archive-muted hover:text-archive-ink',
  ].join(' ')
}

/** Member-area chrome shared by the dashboard sections. */
export default function DashboardLayout() {
  return (
    <div className="workspace space-y-6 border border-archive-line bg-archive-paper p-4 text-archive-ink sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-archive-line">
        <nav aria-label="Dashboard" className="overflow-x-auto">
          <ul className="flex min-w-max items-center gap-5">
            {sections.map((section) => (
              <li key={section.to}>
                <NavLink
                  to={section.to}
                  end={'end' in section ? section.end : undefined}
                  className={sectionClasses}
                >
                  {section.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <Link
          to="/contribute"
          className="mb-1 text-sm font-medium text-archive-muted underline-offset-4 transition-colors hover:text-archive-accent hover:underline"
        >
          Share photographs
        </Link>
      </div>

      <Outlet />
    </div>
  )
}
