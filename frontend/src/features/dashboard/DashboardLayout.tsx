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
    'block rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
    isActive
      ? 'bg-archive-ink text-archive-paper'
      : 'text-archive-muted hover:bg-stone-100 hover:text-archive-ink',
  ].join(' ')
}

/** Member-area chrome shared by the dashboard sections. */
export default function DashboardLayout() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Dashboard">
          <ul className="flex flex-wrap items-center gap-1">
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
          className="rounded-full border border-archive-line px-3 py-1.5 text-sm font-medium text-archive-ink transition-colors hover:border-stone-300"
        >
          Share photographs
        </Link>
      </div>

      <Outlet />
    </div>
  )
}
