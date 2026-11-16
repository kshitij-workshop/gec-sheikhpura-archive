import { Suspense, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router'

import { buttonStyles } from '../components/ui/buttonStyles'
import { UserMenu } from '../features/auth/UserMenu'
import { ArchiveStats } from '../features/home/ArchiveStats'
import { useRecordVisit } from '../features/home/publicStats'
import { appConfig } from '../lib/config'
import { RouteFallback } from './RouteFallback'

const primaryNavigation = [
  { to: '/', label: 'Home', end: true },
  { to: '/archive', label: 'Archive' },
  { to: '/contributors', label: 'Contributors' },
  { to: '/about', label: 'About' },
  { to: '/contribute', label: 'Contribute' },
] as const

function navLinkClasses({ isActive }: { isActive: boolean }): string {
  return [
    'rounded px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-stone-900 text-white'
      : 'text-archive-muted hover:bg-stone-100 hover:text-archive-ink',
  ].join(' ')
}

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  useRecordVisit()

  const closeMobileNavigation = () => {
    setMobileOpen(false)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-archive-ink focus:px-4 focus:py-2 focus:text-archive-paper"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-30 border-b border-archive-line bg-white/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link
            to="/"
            onClick={closeMobileNavigation}
            className="group flex flex-col"
          >
            <span className="font-serif text-xl font-semibold tracking-tight text-archive-ink group-hover:text-archive-accent">
              {appConfig.name}
            </span>
            <span className="text-xs uppercase tracking-[0.2em] text-archive-muted">
              Government Engineering College, Sheikhpura
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <nav aria-label="Primary" className="hidden lg:block">
              <ul className="flex items-center gap-1">
                {primaryNavigation.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={'end' in item ? item.end : undefined}
                      onClick={closeMobileNavigation}
                      className={navLinkClasses}
                    >
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="flex items-center gap-2">
              <UserMenu />
              <button
                type="button"
                className={`${buttonStyles({ variant: 'ghost', size: 'sm' })} lg:hidden`}
                aria-expanded={mobileOpen}
                aria-controls="mobile-navigation"
                onClick={() => {
                  setMobileOpen((current) => !current)
                }}
              >
                <span className="sr-only">
                  {mobileOpen ? 'Close navigation' : 'Open navigation'}
                </span>
                <span aria-hidden="true" className="text-lg leading-none">
                  {mobileOpen ? '×' : '☰'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {mobileOpen ? (
          <nav
            id="mobile-navigation"
            aria-label="Mobile navigation"
            className="border-t border-archive-line bg-archive-surface lg:hidden"
          >
            <ul className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-3">
              {primaryNavigation.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={'end' in item ? item.end : undefined}
                    onClick={closeMobileNavigation}
                    className={navLinkClasses}
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </header>

      <main
        id="main-content"
        className="mx-auto w-full max-w-6xl flex-1 px-4 py-10"
      >
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </main>

      <footer className="border-t border-archive-line bg-archive-surface">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2 sm:col-span-2">
            <p className="font-serif text-lg font-semibold tracking-tight">
              {appConfig.name}
            </p>
            <p className="max-w-sm text-sm leading-relaxed text-archive-muted">
              A community-preserved photographic record of Government
              Engineering College, Sheikhpura — built for future generations.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-archive-ink">Explore</h2>
            <ul className="space-y-1 text-sm">
              <li>
                <Link
                  to="/archive"
                  className="text-archive-muted hover:text-archive-ink"
                >
                  Archive
                </Link>
              </li>
              <li>
                <Link
                  to="/contributors"
                  className="text-archive-muted hover:text-archive-ink"
                >
                  Contributors
                </Link>
              </li>
              <li>
                <Link
                  to="/about"
                  className="text-archive-muted hover:text-archive-ink"
                >
                  About
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-archive-ink">
              Contribute
            </h2>
            <ul className="space-y-1 text-sm">
              <li>
                <Link
                  to="/contribute"
                  className="text-archive-muted hover:text-archive-ink"
                >
                  Share photographs
                </Link>
              </li>
              <li>
                <Link
                  to="/sign-in"
                  className="text-archive-muted hover:text-archive-ink"
                >
                  Sign in
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-archive-line">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-5 text-sm text-archive-muted sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {new Date().getFullYear()} {appConfig.name}
            </p>
            <div className="space-y-1 sm:text-right">
              <ArchiveStats />
              <p>Preserved with care by the college community.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
